# svm_fraud.py
import argparse
import warnings
warnings.filterwarnings("ignore")

from typing import Tuple, List, Dict, Any

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    classification_report,
)
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.svm import SVC
from imblearn.over_sampling import SMOTE
from scipy.stats import loguniform
from datetime import datetime

# Reuse data preparation from xgboost_fraud
try:
    from .xgboost_fraud import load_and_prepare, engineer_features, iqr_clip
except Exception:
    from xgboost_fraud import load_and_prepare, engineer_features, iqr_clip


def train_svm(df: pd.DataFrame, random_search: bool = True, n_iter: int = 20, cv: int = 5, random_state: int = 42):
    df = df.copy()

    # Target and features
    y = df['fraud_label'].astype(int)
    X = df.drop(columns=['fraud_label', 'address'], errors='ignore')
    original_fraud_rate = float(y.mean())
    original_total = int(y.shape[0])
    original_fraud = int(y.sum())

    # Keep numeric only
    numeric_cols = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
    X = X[numeric_cols]
    addresses = df['address'] if 'address' in df.columns else pd.Series("unknown", index=df.index)

    # Outlier filtering on likely-continuous vars
    continuous_like = [
        c for c in numeric_cols
        if not any(substr in c.lower() for substr in ['flag', 'label', 'binary', 'bool'])
    ]
    Xy = pd.concat([X, y], axis=1)
    Xy = iqr_clip(Xy, continuous_like, k=1.5)
    X, y = Xy.drop(columns=['fraud_label']), Xy['fraud_label']

    # Split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    # Preprocessing: Standardize features (critical for SVM)
    pre = ColumnTransformer(
        transformers=[('num', StandardScaler(with_mean=True, with_std=True), list(X.columns))],
        remainder='drop'
    )

    # SMOTE only on training
    smote = SMOTE(random_state=random_state)

    # Base SVM model (RBF kernel with probability for PR/ROC)
    base_svm = SVC(
        kernel='rbf',
        probability=True,
        class_weight=None,
        random_state=random_state
    )

    def fit_and_eval(clf: SVC):
        # Transform
        X_tr = pre.fit_transform(X_train)
        X_te = pre.transform(X_test)

        # Balance
        X_tr, y_tr = smote.fit_resample(X_tr, y_train)
        pre_smote_fraud = int(y_train.sum())
        pre_smote_legit = int((y_train == 0).sum())
        post_smote_fraud = int(y_tr.sum())
        post_smote_legit = int((y_tr == 0).sum())

        # Fit
        clf.fit(X_tr, y_tr)

        # Predict
        proba = clf.predict_proba(X_te)[:, 1]
        preds = (proba >= 0.5).astype(int)

        # Metrics
        metrics: Dict[str, Any] = {
            "accuracy": accuracy_score(y_test, preds),
            "precision": precision_score(y_test, preds, zero_division=0),
            "recall": recall_score(y_test, preds, zero_division=0),
            "f1": f1_score(y_test, preds, zero_division=0),
            "roc_auc": roc_auc_score(y_test, proba),
            "pr_auc": average_precision_score(y_test, proba),
            "report": classification_report(y_test, preds, digits=3),
            # Training info
            "train_samples_pre_smote": int(X_train.shape[0]),
            "train_samples_post_smote": int(X_tr.shape[0]),
            "test_samples": int(X_test.shape[0]),
            "num_features": int(X_tr.shape[1]),
            # Data balance
            "original_fraud_rate": original_fraud_rate,
            "balanced_fraud_rate": float(y_tr.mean()),
            "original_total": original_total,
            "original_fraud": original_fraud,
            "pre_smote_fraud": pre_smote_fraud,
            "pre_smote_legit": pre_smote_legit,
            "post_smote_fraud": post_smote_fraud,
            "post_smote_legit": post_smote_legit,
            # Timestamp
            "timestamp": datetime.utcnow().isoformat() + "Z",
            # SVM doesn't provide tree importances; leave empty
            "feature_importances": [],
        }

        # Recent activity from test predictions
        try:
            addr_test = addresses.loc[X_test.index].astype(str).fillna('unknown')
            conf = pd.Series(proba, index=X_test.index)
            df_events = pd.DataFrame({ 'address': addr_test, 'proba': conf })
            top_frauds = df_events.sort_values('proba', ascending=False).head(10)
            top_legits = df_events.sort_values('proba', ascending=True).head(10)
            events = []
            for _, row in top_frauds.iterrows():
                events.append({
                    'address': row['address'][:12],
                    'status': 'fraud',
                    'confidence': float(row['proba']),
                    'time': 'just now'
                })
            for _, row in top_legits.iterrows():
                events.append({
                    'address': row['address'][:12],
                    'status': 'legitimate',
                    'confidence': float(1.0 - row['proba']),
                    'time': 'just now'
                })
            metrics['recent_events'] = events
        except Exception:
            metrics['recent_events'] = []

        return metrics, clf, pre

    if not random_search:
        return fit_and_eval(base_svm)

    # Hyperparameter search (rbf)
    param_dist = {
        'C': loguniform(1e-2, 1e2),
        'gamma': loguniform(1e-4, 1e0),
        'kernel': ['rbf'],
    }

    # Precompute transform + SMOTE for CV to keep it quick
    X_tr_all = pre.fit_transform(X_train)
    y_tr_all = y_train.copy()
    X_tr_all, y_tr_all = smote.fit_resample(X_tr_all, y_tr_all)

    rnd = RandomizedSearchCV(
        estimator=base_svm,
        param_distributions=param_dist,
        n_iter=n_iter,
        cv=cv,
        scoring='average_precision',
        n_jobs=-1,
        verbose=1,
        random_state=random_state,
    )
    rnd.fit(X_tr_all, y_tr_all)

    best: SVC = rnd.best_estimator_  # type: ignore
    metrics, model, preproc = fit_and_eval(best)
    metrics["best_params"] = rnd.best_params_
    return metrics, model, preproc


def main():
    ap = argparse.ArgumentParser(description="Train SVM model for Ethereum fraud/phishing detection.")
    ap.add_argument("--transactions_csv", required=True, help="Path to transactions CSV (e.g., transaction_dataset.csv)")
    ap.add_argument("--features_csv", required=True, help="Path to address features CSV (e.g., eth_illicit_features.csv)")
    ap.add_argument("--no_tune", action="store_true", help="Skip hyperparameter tuning and train a solid baseline")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    df = load_and_prepare(args.transactions_csv, args.features_csv)
    df = engineer_features(df)

    if 'fraud_label' not in df.columns:
        raise ValueError("Target column 'fraud_label' not found after preparation.")

    metrics, model, preproc = train_svm(df, random_search=not args.no_tune, random_state=args.seed)

    print("\n=== Evaluation (Test Set) ===")
    print(f"Accuracy      : {metrics['accuracy']:.4f}")
    print(f"Precision     : {metrics['precision']:.4f}")
    print(f"Recall        : {metrics['recall']:.4f}")
    print(f"F1-score      : {metrics['f1']:.4f}")
    print(f"ROC-AUC       : {metrics['roc_auc']:.4f}")
    print(f"PR-AUC        : {metrics['pr_auc']:.4f}")
    print("\nClassification report:\n", metrics['report'])

    if 'best_params' in metrics:
        print("\nBest params from RandomizedSearchCV:")
        for k, v in metrics['best_params'].items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()


