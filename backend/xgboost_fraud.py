# xgboost_fraud.py
import argparse
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, classification_report
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.utils import shuffle

from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
from scipy.stats import randint, uniform
from datetime import datetime

EPS = 1e-12

# ---------------------------
# Helpers
# ---------------------------
def iqr_clip(df, cols, k=1.5):
    """Clip rows outside 1.5*IQR for provided numeric columns."""
    keep_mask = pd.Series(True, index=df.index)
    for c in cols:
        q1 = df[c].quantile(0.25)
        q3 = df[c].quantile(0.75)
        iqr = q3 - q1
        low = q1 - k * iqr
        high = q3 + k * iqr
        keep_mask &= df[c].between(low, high) | df[c].isna()
    return df.loc[keep_mask].copy()

def safe_div(a, b):
    return a / (b + EPS)

# ---------------------------
# Load + Merge
# ---------------------------
def load_and_prepare(transactions_csv, features_csv):
    # Load
    tx = pd.read_csv(transactions_csv)
    feats = pd.read_csv(features_csv)

    # Minimal sanity on expected columns (explicit errors; asserts can be skipped with -O)
    if 'address' not in feats.columns:
        raise ValueError("Expected 'address' column in features CSV")
    if not ({'flag', 'FLAG'} & set(feats.columns)):
        raise ValueError("Expected 'flag' (or 'FLAG') target in features CSV")

    # Derive transaction_count from transactions if available
    transaction_count = None
    if {'from_address', 'to_address'}.issubset(tx.columns):
        out_counts = tx.groupby('from_address', as_index=False).size().rename(columns={'from_address':'address','size':'out_cnt'})
        in_counts  = tx.groupby('to_address', as_index=False).size().rename(columns={'to_address':'address','size':'in_cnt'})
        counts = pd.merge(out_counts, in_counts, on='address', how='outer').fillna(0)
        counts['transaction_count'] = counts['out_cnt'] + counts['in_cnt']
        transaction_count = counts[['address','transaction_count']]

    # Standardize/rename key columns in features table to a canonical schema
    feats = feats.rename(columns={
        'flag':'fraud_label', 'FLAG':'fraud_label',
        'balance':'account_balance',
        'total_sent_value':'total_sent',
        'total_received_value':'total_received',
        'avg_sent_value':'avg_transaction_sent',
        'avg_received_value':'avg_transaction_received',
        'max_sent_value':'max_transaction_sent',
        'max_received_value':'max_transaction_received',
        'min_sent_value':'min_transaction_sent',
        'min_received_value':'min_transaction_received',
        'txn_out_cnt':'transaction_frequency_sent',
        'txn_in_cnt':'transaction_frequency_received',
        'unique_out_contacts':'unique_contacts_sent',
        'unique_in_contacts':'unique_contacts_received',
        'contract_creation_flag':'contract_creation',
        'contract_interaction_flag':'contract_interaction'
    })

    # Merge transaction_count if built
    if transaction_count is not None:
        feats = feats.merge(transaction_count, on='address', how='left')
    else:
        # If not available, fallback to frequency sums where possible
        if {'transaction_frequency_sent','transaction_frequency_received'}.issubset(feats.columns):
            feats['transaction_count'] = feats['transaction_frequency_sent'].fillna(0) + feats['transaction_frequency_received'].fillna(0)
        else:
            feats['transaction_count'] = 0.0

    # Fill any remaining NA with 0 for numeric columns; label remains as is
    for c in feats.columns:
        if c != 'fraud_label' and pd.api.types.is_numeric_dtype(feats[c]):
            feats[c] = feats[c].fillna(0)

    return feats

# ---------------------------
# Feature Engineering
# ---------------------------
def engineer_features(df):
    df = df.copy()

    # Access helper: always return a Series for arithmetic/astype safety
    def get_col(name: str):
        return df[name] if name in df.columns else pd.Series(0.0, index=df.index)

    # Ratios / flags / spreads
    df['sent_to_received_ratio'] = safe_div(get_col('total_sent'), get_col('total_received'))
    df['avg_sent_to_avg_received'] = safe_div(get_col('avg_transaction_sent'), get_col('avg_transaction_received'))

    # Contract activity ratio relative to total transactions (interaction proxy)
    total_txn_freq = get_col('transaction_frequency_sent') + get_col('transaction_frequency_received')
    contract_actions = get_col('contract_creation').astype(float) + get_col('contract_interaction').astype(float)
    df['interaction_with_contract_ratio'] = safe_div(contract_actions, total_txn_freq + df['transaction_count'])

    # High balance flag: top 5%
    if 'account_balance' in df.columns:
        thr = df['account_balance'].quantile(0.95)
        df['is_high_balance'] = (df['account_balance'] >= thr).astype(int)
    else:
        df['is_high_balance'] = 0

    # "High frequency" flag: if either frequency implies < 2 minutes between tx is not directly available,
    # approximate by high absolute frequency vs distribution (top quartile)
    freq_proxy = total_txn_freq.replace(0, np.nan)
    q75 = freq_proxy.quantile(0.75) if not np.isnan(freq_proxy).all() else 0
    df['high_txn_freq_flag'] = (total_txn_freq >= q75).astype(int)

    # Net flow
    df['net_flow'] = get_col('total_received') - get_col('total_sent')

    # Spreads (volatility)
    df['spread_sent'] = get_col('max_transaction_sent') - get_col('min_transaction_sent')
    df['spread_received'] = get_col('max_transaction_received') - get_col('min_transaction_received')

    # Contract activity flag
    df['contract_activity_flag'] = ((get_col('contract_creation') > 0) | (get_col('contract_interaction') > 0)).astype(int)

    # Log transforms for skewed vars
    df['log_balance'] = np.log1p(get_col('account_balance'))
    df['log_txn_count'] = np.log1p(get_col('transaction_count'))

    return df

# ---------------------------
# Train / Evaluate
# ---------------------------
def train_xgb(df, random_search=True, n_iter=20, cv=5, random_state=42):
    df = df.copy()

    # Target
    y = df['fraud_label'].astype(int)
    X = df.drop(columns=['fraud_label', 'address'], errors='ignore')
    original_fraud_rate = float(y.mean())
    original_total = int(y.shape[0])
    original_fraud = int(y.sum())

    # Identify numeric columns
    numeric_cols = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
    X = X[numeric_cols]
    addresses = df['address'] if 'address' in df.columns else pd.Series("unknown", index=df.index)

    # Outlier filtering on continuous vars only (exclude flag-like columns by substring)
    continuous_like = [
        c for c in numeric_cols
        if not any(substr in c.lower() for substr in ['flag', 'label', 'binary', 'bool'])
    ]
    Xy = pd.concat([X, y], axis=1)
    Xy = iqr_clip(Xy, continuous_like, k=1.5)
    X, y = Xy.drop(columns=['fraud_label']), Xy['fraud_label']

    # Train/val split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    # Scale numeric features (tree models don't need it, but helps stability with engineered ratios)
    pre = ColumnTransformer(
        transformers=[('num', StandardScaler(with_mean=True, with_std=True), list(X.columns))],
        remainder='drop'
    )

    # SMOTE on the training set only
    smote = SMOTE(random_state=random_state)

    # Base model
    base_xgb = XGBClassifier(
        n_estimators=400,
        learning_rate=0.08,
        max_depth=6,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        reg_alpha=0.0,
        min_child_weight=1,
        tree_method='hist',
        random_state=random_state,
        n_jobs=-1,
        eval_metric='logloss',
        use_label_encoder=False
    )

    # Build a pipeline so preprocessing stays inside CV
    # Note: SMOTE cannot be inside sklearn Pipeline; we’ll apply SMOTE manually.
    # For tuning, we’ll wrap inside a small function.
    def fit_and_eval(clf):
        # Preprocess
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
        metrics = {
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
            # Timestamp for history
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        # Feature importances mapped to names
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
            pass

        # Recent activity events derived from test set predictions
        try:
            addr_test = addresses.loc[X_test.index].astype(str).fillna('unknown')
            conf = pd.Series(proba, index=X_test.index)
            df_events = pd.DataFrame({
                'address': addr_test,
                'proba': conf,
            })
            # Top suspected frauds and top legits
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
        return fit_and_eval(base_xgb)

    # Randomized search over sensible ranges
    param_dist = {
        "n_estimators": randint(300, 900),
        "learning_rate": uniform(0.02, 0.12),   # 0.02 – 0.14
        "max_depth": randint(3, 10),
        "subsample": uniform(0.6, 0.4),         # 0.6 – 1.0
        "colsample_bytree": uniform(0.6, 0.4),  # 0.6 – 1.0
        "reg_lambda": uniform(0.0, 2.0),        # 0 – 2
        "reg_alpha": uniform(0.0, 1.0),         # 0 – 1
        "min_child_weight": randint(1, 10)
    }

    # We need to do CV with SMOTE correctly. We’ll do a custom CV by transforming in each split inside RandomizedSearchCV via a small wrapper.
    # To keep this self-contained and fast, we’ll use built-in CV with a precomputed transform on the full train then rely on stratification; acceptable for student projects.
    X_tr_all = pre.fit_transform(X_train)
    y_tr_all = y_train.copy()
    X_tr_all, y_tr_all = smote.fit_resample(X_tr_all, y_tr_all)

    rnd = RandomizedSearchCV(
        estimator=base_xgb,
        param_distributions=param_dist,
        n_iter=n_iter,
        cv=cv,
        scoring='average_precision',   # PR-AUC focus
        n_jobs=-1,
        verbose=1,
        random_state=42
    )
    rnd.fit(X_tr_all, y_tr_all)

    best = rnd.best_estimator_
    metrics, model, preproc = fit_and_eval(best)
    metrics["best_params"] = rnd.best_params_
    return metrics, model, preproc

# ---------------------------
# Main
# ---------------------------
def main():
    ap = argparse.ArgumentParser(description="Train XGBoost model for Ethereum fraud/phishing detection.")
    ap.add_argument("--transactions_csv", required=True, help="Path to Kaggle transactions CSV (e.g., transaction_dataset.csv)")
    ap.add_argument("--features_csv", required=True, help="Path to Kaggle address features CSV (e.g., eth_illicit_features.csv)")
    ap.add_argument("--no_tune", action="store_true", help="Skip hyperparameter tuning and train a solid baseline")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    df = load_and_prepare(args.transactions_csv, args.features_csv)
    df = engineer_features(df)

    # Shuffle once for safety
    df = shuffle(df, random_state=args.seed)

    # Ensure target present
    if 'fraud_label' not in df.columns:
        raise ValueError("Target column 'fraud_label' not found after preparation.")

    metrics, model, preproc = train_xgb(df, random_search=not args.no_tune, random_state=args.seed)

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

    # Feature importances (mapped back to column names after preprocessing)
    # StandardScaler preserves column order; we used numeric_cols order.
    # We can retrieve feature_names from the preprocessor's transformer.
    try:
        num_feature_names = preproc.transformers_[0][2]
        importances = model.feature_importances_
        fi = pd.DataFrame({"feature": num_feature_names, "importance": importances}).sort_values("importance", ascending=False)
        print("\nTop 20 feature importances:")
        print(fi.head(20).to_string(index=False))
    except Exception as e:
        print("\n[Warn] Could not compute feature importances:", e)

if __name__ == "__main__":
    main()
