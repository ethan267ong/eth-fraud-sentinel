import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Brain } from "lucide-react";

type FeatureImportance = { feature: string; importance: number };
type Metrics = {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  roc_auc?: number;
  pr_auc?: number;
  original_fraud_rate?: number;
  balanced_fraud_rate?: number;
  train_samples_pre_smote?: number;
  train_samples_post_smote?: number;
  num_features?: number;
  feature_importances?: FeatureImportance[];
  timestamp?: string;
  test_samples?: number;
  used_model?: 'xgboost' | 'svm' | 'random_forest' | 'neural_network';
};

const ModelInsights = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const featureImportanceRaw: FeatureImportance[] = Array.isArray(metrics?.feature_importances)
    ? (metrics?.feature_importances as FeatureImportance[])
    : [];
  const featureImportance = featureImportanceRaw.map((fi) => ({
    feature: String(fi.feature ?? ''),
    importance: Number(fi.importance) || 0,
  }));

  const getBarColor = (importance: number) => {
    if (importance > 0.15) return "hsl(var(--destructive))";
    if (importance > 0.10) return "hsl(var(--warning))";
    return "hsl(var(--primary))";
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case "High":
        return <Badge variant="destructive">High</Badge>;
      case "Medium":
        return <Badge className="bg-warning text-warning-foreground">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        setMetrics(data.metrics || null);
      } catch {
        // ignore fetch errors; UI will show placeholders
      }
    };
    fetchMetrics();
  }, []);

  const usedModel = metrics?.used_model === 'svm'
    ? 'SVM'
    : metrics?.used_model === 'random_forest'
    ? 'Random Forest'
    : metrics?.used_model === 'neural_network'
    ? 'Neural Network'
    : 'XGBoost';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Model Insights</h1>
        <p className="text-muted-foreground mt-1">Deep dive into feature importance and model behavior</p>
      </div>

      {/* Feature Importance Chart */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Feature Importance ({usedModel})
          </CardTitle>
          <CardDescription>
            Most influential features in fraud detection decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featureImportance.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              No feature importances yet. Train the model on the Upload Data tab to populate insights.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={featureImportance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  type="number"
                  domain={[
                    0,
                    (() => {
                      const maxVal = Math.max(0.2, ...featureImportance.map((f) => (Number.isFinite(f.importance) ? f.importance : 0)), 0.2);
                      return Number.isFinite(maxVal) && maxVal > 0 ? maxVal : 0.2;
                    })(),
                  ]}
                />
                <YAxis 
                  type="category" 
                  dataKey="feature" 
                  tick={{ fontSize: 12 }}
                  width={150}
                />
                <Tooltip 
                  formatter={(value) => [
                    `${(Number(value) * 100).toFixed(1)}%`,
                    "Importance"
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="importance">
                  {featureImportance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.importance)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Optional sections (no hard-coded insights) intentionally omitted */}

      {/* Model Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Model Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-medium">{metrics ? `${(metrics.accuracy * 100).toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precision</span>
              <span className="font-medium">{metrics ? `${(metrics.precision * 100).toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recall</span>
              <span className="font-medium">{metrics ? `${(metrics.recall * 100).toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">F1 Score</span>
              <span className="font-medium">{metrics ? `${(metrics.f1 * 100).toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROC-AUC</span>
              <span className="font-medium">{metrics ? metrics.roc_auc?.toFixed(3) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PR-AUC</span>
              <span className="font-medium">{metrics ? metrics.pr_auc?.toFixed(3) : '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Training Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Training Samples</span>
              <span className="font-medium">{metrics ? `${metrics.train_samples_pre_smote ?? '—'} ➜ ${metrics.train_samples_post_smote ?? '—'}` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Features</span>
              <span className="font-medium">{metrics ? `${metrics.num_features ?? '—'}` : '—'}</span>
            </div>
            {metrics?.timestamp && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{new Date(metrics.timestamp).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Data Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Fraud %</span>
              <span className="font-medium">{metrics ? `${(metrics.original_fraud_rate * 100).toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">After SMOTE</span>
              <span className="font-medium">{metrics ? `${(metrics.balanced_fraud_rate * 100).toFixed(2)}%` : '—'}</span>
            </div>
            {metrics?.train_samples_pre_smote != null && metrics?.test_samples != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test Set Size</span>
                <span className="font-medium">{(((metrics.test_samples) / (metrics.test_samples + (metrics.train_samples_pre_smote as number))) * 100).toFixed(2)}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelInsights;