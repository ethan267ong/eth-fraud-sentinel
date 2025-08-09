import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Shield, Database, AlertTriangle, CheckCircle } from "lucide-react";

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
  pre_smote_fraud?: number;
  pre_smote_legit?: number;
  post_smote_fraud?: number;
  post_smote_legit?: number;
  timestamp?: string;
  feature_importances?: FeatureImportance[];
};

type HistoryEntry = Metrics & { timestamp?: string };

const Dashboard = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activity, setActivity] = useState<{ address: string; status: 'fraud'|'legitimate'; confidence: number; time: string }[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        setMetrics(data.metrics || null);
      } catch (e) {
        // ignore; stays mocked
      }
    };
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/metrics/history');
        const data = await res.json();
        setHistory(Array.isArray(data.history) ? data.history : []);
      } catch (e) {
        // ignore
      }
    };
    const fetchActivity = async () => {
      try {
        const res = await fetch('/api/activity');
        const data = await res.json();
        setActivity(Array.isArray(data.events) ? data.events : []);
      } catch (e) {
        // ignore
      }
    };
    fetchMetrics();
    fetchHistory();
    fetchActivity();
  }, []);

  // Chart data derived from metrics when available (no hard-coded defaults)
  const originalRate = typeof metrics?.original_fraud_rate === 'number' ? metrics.original_fraud_rate : null;
  const balancedRate = typeof metrics?.balanced_fraud_rate === 'number' ? metrics.balanced_fraud_rate : null;
  const classDistributionData = metrics &&
    typeof metrics.pre_smote_fraud === 'number' &&
    typeof metrics.pre_smote_legit === 'number' &&
    typeof metrics.post_smote_fraud === 'number' &&
    typeof metrics.post_smote_legit === 'number'
      ? [
          { name: 'Before SMOTE', fraud: metrics.pre_smote_fraud, legitimate: metrics.pre_smote_legit },
          { name: 'After SMOTE', fraud: metrics.post_smote_fraud, legitimate: metrics.post_smote_legit },
        ]
      : [];

  const performanceOverTime = history.length > 0
    ? history.map((h, idx) => ({
        label: h.timestamp ? new Date(h.timestamp).toLocaleString() : `Run ${idx + 1}`,
        roc_auc: typeof h.roc_auc === 'number' ? h.roc_auc : null,
        pr_auc: typeof h.pr_auc === 'number' ? h.pr_auc : null,
      }))
    : [];

  const fraudDistribution = originalRate !== null && originalRate !== undefined
    ? [
        { name: 'Legitimate', value: Number(((1 - originalRate) * 100).toFixed(1)), color: 'hsl(var(--success))' },
        { name: 'Fraudulent', value: Number((originalRate * 100).toFixed(1)), color: 'hsl(var(--destructive))' }
      ]
    : [];

  const accuracyPct = metrics?.accuracy != null ? (metrics.accuracy * 100).toFixed(1) + '%' : '—';
  const precisionVal = metrics?.precision != null ? metrics.precision.toFixed(2) : '—';
  const f1Val = metrics?.f1 != null ? metrics.f1.toFixed(2) : '—';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fraud Detection Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time analytics and model performance monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-success border-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            System Healthy
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Detection Rate</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{accuracyPct}</div>
            <p className="text-xs text-success flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +2.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precision Score</CardTitle>
            <AlertTriangle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{precisionVal}</div>
            <p className="text-xs text-success flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +0.02 improvement
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">F1 Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{f1Val}</div>
            <p className="text-xs text-success flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              Stable performance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallets Analyzed</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2M</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +15% this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Distribution Chart */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Class Distribution</CardTitle>
            <CardDescription>Before and after SMOTE balancing</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {classDistributionData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No data available. Train a model to populate class distribution.
                </div>
              ) : (
              <BarChart data={classDistributionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="fraud" fill="hsl(var(--destructive))" name="Fraudulent" />
                <Bar dataKey="legitimate" fill="hsl(var(--success))" name="Legitimate" />
              </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Over Time */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Model Performance Trends</CardTitle>
            <CardDescription>ROC-AUC and PR-AUC over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {performanceOverTime.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No performance history yet.
                </div>
              ) : (
              <LineChart data={performanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" />
                <YAxis domain={[0.8, 1]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="roc_auc" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="ROC-AUC"
                />
                <Line 
                  type="monotone" 
                  dataKey="pr_auc" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="PR-AUC"
                />
              </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fraud Distribution Pie Chart */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Transaction Distribution</CardTitle>
            <CardDescription>Current fraud vs legitimate ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              {fraudDistribution.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No distribution data.
                </div>
              ) : (
              <PieChart>
                <Pie
                  data={fraudDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {fraudDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest fraud detection events</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <div className="h-full overflow-auto space-y-4 pr-2">
              {activity.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">No recent activity.</div>
              ) : (
                activity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.status === 'fraud' ? 'bg-destructive' : 'bg-success'}`} />
                      <span className="font-mono text-sm">{item.address}...</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={item.status === 'fraud' ? 'text-destructive' : 'text-success'}>
                        {item.status === 'fraud' ? 'Fraudulent' : 'Legitimate'}
                      </span>
                      <span className="text-muted-foreground">{(item.confidence * 100).toFixed(0)}%</span>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;