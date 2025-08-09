from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import tempfile
import shutil
import os
import json

# Import training utilities from the existing script
from .xgboost_fraud import load_and_prepare, engineer_features, train_xgb
from .svm_fraud import train_svm
from .random_forest_fraud import train_random_forest
from .neural_network_fraud import train_neural_network

app = FastAPI(title="ETH Fraud Sentinel Backend")
LATEST_METRICS = None
METRICS_HISTORY = []
ACTIVITY_LOG = []  # Populate later when you add realtime predictions
MODEL_METRICS = {}  # Store latest metrics for each model type

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/train")
async def train_endpoint(
    transactions_csv: UploadFile = File(...),
    features_csv: UploadFile = File(...),
    model: Optional[str] = Form("xgboost"),
    no_tune: Optional[bool] = Form(False),
    seed: Optional[int] = Form(42),
):
    """Train the XGBoost model on uploaded CSVs and return metrics."""
    # Persist uploads to temp files so we can reuse the existing loader
    with tempfile.TemporaryDirectory() as td:
        tx_path = os.path.join(td, "transactions.csv")
        ft_path = os.path.join(td, "features.csv")

        with open(tx_path, "wb") as f:
            shutil.copyfileobj(transactions_csv.file, f)
        with open(ft_path, "wb") as f:
            shutil.copyfileobj(features_csv.file, f)

        # Prepare data and train
        df = load_and_prepare(tx_path, ft_path)
        df = engineer_features(df)
        chosen = (model or "").lower()
        if chosen == "svm":
            metrics, trained_model, preproc = train_svm(df, random_search=not no_tune, random_state=seed)
            metrics["used_model"] = "svm"
        elif chosen == "random_forest":
            metrics, trained_model, preproc = train_random_forest(df, random_search=not no_tune, random_state=seed)
            metrics["used_model"] = "random_forest"
        elif chosen == "neural_network":
            metrics, trained_model, preproc = train_neural_network(df, random_search=not no_tune, random_state=seed)
            metrics["used_model"] = "neural_network"
        else:
            metrics, trained_model, preproc = train_xgb(df, random_search=not no_tune, random_state=seed)
            metrics["used_model"] = "xgboost"

    # Convert non-JSONable values to plain types
    response_metrics = {}
    for k, v in metrics.items():
        if k == "report":
            response_metrics[k] = v
        elif isinstance(v, (int, float, str)):
            response_metrics[k] = v
        else:
            try:
                json.dumps(v)
                response_metrics[k] = v
            except Exception:
                response_metrics[k] = str(v)

    global LATEST_METRICS, MODEL_METRICS
    LATEST_METRICS = response_metrics
    
    # Store model-specific metrics
    model_key = response_metrics.get("used_model", "unknown")
    MODEL_METRICS[model_key] = response_metrics
    
    try:
        METRICS_HISTORY.append(response_metrics)
        # Keep last 24 entries
        if len(METRICS_HISTORY) > 24:
            METRICS_HISTORY[:] = METRICS_HISTORY[-24:]
        # Update activity log with recent events from this run
        global ACTIVITY_LOG
        if isinstance(response_metrics.get('recent_events'), list):
            # Prepend recent events with a timestamp
            ACTIVITY_LOG = [
                { **e, 'time': e.get('time') or 'just now' }
                for e in response_metrics['recent_events']
            ] + ACTIVITY_LOG
            # Keep last 50
            ACTIVITY_LOG = ACTIVITY_LOG[:50]
    except Exception:
        pass
    return {"ok": True, "metrics": response_metrics}


@app.get("/metrics")
def get_latest_metrics():
    return {"ok": True, "metrics": LATEST_METRICS}


@app.get("/metrics/history")
def get_metrics_history():
    return {"ok": True, "history": METRICS_HISTORY}


@app.get("/activity")
def get_activity():
    """Return recent activity events (empty until wired to a prediction stream)."""
    return {"ok": True, "events": ACTIVITY_LOG}


@app.get("/models/metrics")
def get_model_metrics():
    """Return the latest metrics for each trained model."""
    model_summaries = {}
    for model_key, metrics in MODEL_METRICS.items():
        model_summaries[model_key] = {
            "accuracy": metrics.get("accuracy", 0),
            "precision": metrics.get("precision", 0),
            "recall": metrics.get("recall", 0),
            "f1": metrics.get("f1", 0),
            "roc_auc": metrics.get("roc_auc", 0),
            "pr_auc": metrics.get("pr_auc", 0),
            "timestamp": metrics.get("timestamp", "Never trained")
        }
    return {"ok": True, "models": model_summaries}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api:app", host="127.0.0.1", port=8000, reload=True)


