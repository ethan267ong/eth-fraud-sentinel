# random_forest_fraud.py
import argparse
import warnings
warnings.filterwarnings("ignore")

from typing import Dict, Any

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
from sklearn.ensemble import RandomForestClassifier
from imblearn.over_sampling import SMOTE
from scipy.stats import randint, uniform
from datetime import datetime

# Reuse data preparation from xgboost_fraud
try:
    from .xgboost_fraud import load_and_prepare, engineer_features, iqr_clip
except Exception:
    from xgboost_fraud import load_and_prepare, engineer_features, iqr_clip


def train_random_forest(df: pd.DataFrame, random_search: bool = True, n_iter: int = 25, cv: int = 5, random_state: int = 42):
    df = df.copy()

    y = df['fraud_label'].astype(int)
    X = df.drop(columns=['fraud_label', 'address'], errors='ignore')
    original_fraud_rate = float(y.mean())
    original_total = int(y.shape[0])
    original_fraud = int(y.sum())

    numeric_cols = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
    X = X[numeric_cols]
    addresses = df['address'] if 'address' in df.columns else pd.Series("unknown", index=df.index)

    continuous_like = [
        c for c in numeric_cols
        if not any(substr in c.lower() for substr in ['flag', 'label', 'binary', 'bool'])
    ]
    Xy = pd.concat([X, y], axis=1)
    Xy = iqr_clip(Xy, continuous_like, k=1.5)
    X, y = Xy.drop(columns=['fraud_label']), Xy['fraud_label']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    pre = ColumnTransformer(
        transformers=[('num', StandardScaler(with_mean=True, with_std=True), list(X.columns))],
        remainder='drop'
    )
    smote = SMOTE(random_state=random_state)

    base_rf = RandomForestClassifier(
        n_estimators=400,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        max_features='sqrt',
        bootstrap=True,
        n_jobs=-1,
        random_state=random_state,
    )

    def fit_and_eval(clf: RandomForestClassifier):
        X_tr = pre.fit_transform(X_train)
        X_te = pre.transform(X_test)

        X_tr, y_tr = smote.fit_resample(X_tr, y_train)
        pre_smote_fraud = int(y_train.sum())
        pre_smote_legit = int((y_train == 0).sum())
        post_smote_fraud = int(y_tr.sum())
        post_smote_legit = int((y_tr == 0).sum())

        clf.fit(X_tr, y_tr)

        proba = clf.predict_proba(X_te)[:, 1]
        preds = (proba >= 0.5).astype(int)

        metrics: Dict[str, Any] = {
            "accuracy": accuracy_score(y_test, preds),
            "precision": precision_score(y_test, preds, zero_division=0),
            "recall": recall_score(y_test, preds, zero_division=0),
            "f1": f1_score(y_test, preds, zero_division=0),
            "roc_auc": roc_auc_score(y_test, proba),
            "pr_auc": average_precision_score(y_test, proba),
            "report": classification_report(y_test, preds, digits=3),
            "train_samples_pre_smote": int(X_train.shape[0]),
            "train_samples_post_smote": int(X_tr.shape[0]),
            "test_samples": int(X_test.shape[0]),
            "num_features": int(X_tr.shape[1]),
            "original_fraud_rate": original_fraud_rate,
            "balanced_fraud_rate": float(y_tr.mean()),
            "original_total": original_total,
            "original_fraud": original_fraud,
            "pre_smote_fraud": pre_smote_fraud,
            "pre_smote_legit": pre_smote_legit,
            "post_smote_fraud": post_smote_fraud,
            "post_smote_legit": post_smote_legit,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        # Feature importances
        try:
            num_feature_names = pre.transformers_[0][2]
            importances = getattr(clf, 'feature_importances_', None)
            if importances is not None:
                fi = (
                    pd.DataFrame({"feature": num_feature_names, "importance": importances})
                    .sort_values("importance", ascending=False)
                )
                metrics["feature_importances"] = fi.head(50).to_dict(orient="records")
        except Exception:
            metrics["feature_importances"] = []

        # Recent events
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
        return fit_and_eval(base_rf)

    param_dist = {
        'n_estimators': randint(200, 1000),
        'max_depth': randint(3, 30),
        'min_samples_split': randint(2, 10),
        'min_samples_leaf': randint(1, 10),
        'max_features': ['sqrt', 'log2', None],
        'bootstrap': [True, False],
    }

    X_tr_all = pre.fit_transform(X_train)
    y_tr_all = y_train.copy()
    X_tr_all, y_tr_all = smote.fit_resample(X_tr_all, y_tr_all)

    rnd = RandomizedSearchCV(
        estimator=base_rf,
        param_distributions=param_dist,
        n_iter=n_iter,
        cv=cv,
        scoring='average_precision',
        n_jobs=-1,
        verbose=1,
        random_state=random_state,
    )
    rnd.fit(X_tr_all, y_tr_all)

    best: RandomForestClassifier = rnd.best_estimator_  # type: ignore
    metrics, model, preproc = fit_and_eval(best)
    metrics["best_params"] = rnd.best_params_
    return metrics, model, preproc


def main():
    ap = argparse.ArgumentParser(description="Train Random Forest model for Ethereum fraud/phishing detection.")
    ap.add_argument("--transactions_csv", required=True, help="Path to transactions CSV")
    ap.add_argument("--features_csv", required=True, help="Path to address features CSV")
    ap.add_argument("--no_tune", action="store_true", help="Skip hyperparameter tuning")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    df = load_and_prepare(args.transactions_csv, args.features_csv)
    df = engineer_features(df)

    if 'fraud_label' not in df.columns:
        raise ValueError("Target column 'fraud_label' not found after preparation.")

    metrics, model, preproc = train_random_forest(df, random_search=not args.no_tune, random_state=args.seed)

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


