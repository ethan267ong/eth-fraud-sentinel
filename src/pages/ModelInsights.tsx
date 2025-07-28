import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Brain, TrendingUp, Info, Database } from "lucide-react";

const ModelInsights = () => {
  // Feature importance data
  const featureImportance = [
    { feature: "transaction_frequency", importance: 0.18, description: "Daily transaction frequency" },
    { feature: "avg_transaction_amount", importance: 0.15, description: "Average transaction value in ETH" },
    { feature: "unique_receivers", importance: 0.14, description: "Number of unique receiving addresses" },
    { feature: "sent_to_received_ratio", importance: 0.12, description: "Ratio of sent to received transactions" },
    { feature: "gas_usage_pattern", importance: 0.11, description: "Gas usage consistency and patterns" },
    { feature: "time_between_transactions", importance: 0.10, description: "Average time between transactions" },
    { feature: "weekend_activity", importance: 0.08, description: "Transaction activity during weekends" },
    { feature: "large_transaction_ratio", importance: 0.07, description: "Percentage of transactions > 10 ETH" },
    { feature: "contract_interactions", importance: 0.05, description: "Frequency of smart contract interactions" },
  ];

  // Correlation matrix data (simplified)
  const correlationData = [
    { feature1: "transaction_frequency", feature2: "fraud_label", correlation: 0.65 },
    { feature1: "avg_transaction_amount", feature2: "fraud_label", correlation: 0.48 },
    { feature1: "unique_receivers", feature2: "fraud_label", correlation: 0.52 },
    { feature1: "sent_to_received_ratio", feature2: "fraud_label", correlation: 0.43 },
    { feature1: "gas_usage_pattern", feature2: "fraud_label", correlation: 0.38 },
  ];

  // Engineered features explanations
  const engineeredFeatures = [
    {
      name: "net_flow",
      description: "Total ETH received minus total ETH sent",
      formula: "sum(received) - sum(sent)",
      importance: "High",
      type: "Financial"
    },
    {
      name: "sent_to_received_ratio",
      description: "Ratio of outgoing to incoming transaction count",
      formula: "count(sent) / count(received)",
      importance: "High",
      type: "Behavioral"
    },
    {
      name: "transaction_velocity",
      description: "Average transactions per day over account lifetime",
      formula: "total_transactions / account_age_days",
      importance: "Medium",
      type: "Temporal"
    },
    {
      name: "concentration_index",
      description: "Measure of how concentrated transactions are among receivers",
      formula: "sum(amount²) / sum(amount)²",
      importance: "Medium",
      type: "Network"
    },
    {
      name: "weekend_activity_ratio",
      description: "Percentage of transactions occurring on weekends",
      formula: "weekend_transactions / total_transactions",
      importance: "Low",
      type: "Temporal"
    },
    {
      name: "gas_efficiency",
      description: "Average gas used per transaction relative to median",
      formula: "avg(gas_used) / median_gas_network",
      importance: "Medium",
      type: "Technical"
    }
  ];

  const getBarColor = (importance: number) => {
    if (importance > 0.15) return "hsl(var(--destructive))";
    if (importance > 0.10) return "hsl(var(--warning))";
    return "hsl(var(--primary))";
  };

  const getCorrelationColor = (correlation: number) => {
    const absCorr = Math.abs(correlation);
    if (absCorr > 0.6) return "hsl(var(--destructive))";
    if (absCorr > 0.4) return "hsl(var(--warning))";
    return "hsl(var(--success))";
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
            Feature Importance (XGBoost)
          </CardTitle>
          <CardDescription>
            Most influential features in fraud detection decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={featureImportance} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" domain={[0, 0.2]} />
              <YAxis 
                type="category" 
                dataKey="feature" 
                tick={{ fontSize: 12 }}
                width={150}
              />
              <Tooltip 
                formatter={(value, name, props) => [
                  `${(Number(value) * 100).toFixed(1)}%`,
                  "Importance"
                ]}
                labelFormatter={(label) => {
                  const item = featureImportance.find(f => f.feature === label);
                  return item?.description || label;
                }}
              />
              <Bar dataKey="importance">
                {featureImportance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.importance)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feature Correlation */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Feature-Fraud Correlation
          </CardTitle>
          <CardDescription>
            Correlation between key features and fraud labels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {correlationData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="font-medium">{item.feature1.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-muted-foreground">vs Fraud Label</div>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="px-3 py-1 rounded text-sm font-medium"
                    style={{ 
                      backgroundColor: `${getCorrelationColor(item.correlation)}20`,
                      color: getCorrelationColor(item.correlation)
                    }}
                  >
                    {item.correlation.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.abs(item.correlation) > 0.5 ? 'Strong' : 'Moderate'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engineered Features */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Engineered Features
          </CardTitle>
          <CardDescription>
            Custom features created for enhanced fraud detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {engineeredFeatures.map((feature, index) => (
              <div key={index} className="p-4 rounded-lg border bg-muted/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium font-mono text-sm">{feature.name}</h3>
                      {getImportanceBadge(feature.importance)}
                      <Badge variant="outline" className="text-xs">
                        {feature.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {feature.description}
                    </p>
                  </div>
                </div>
                
                <div className="bg-muted/40 p-2 rounded font-mono text-xs">
                  <span className="text-muted-foreground">Formula: </span>
                  <span className="text-foreground">{feature.formula}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Model Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-medium">96.7%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precision</span>
              <span className="font-medium">94.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recall</span>
              <span className="font-medium">92.8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">F1 Score</span>
              <span className="font-medium">93.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROC-AUC</span>
              <span className="font-medium">0.97</span>
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
              <span className="font-medium">50,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Features</span>
              <span className="font-medium">24</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Training Time</span>
              <span className="font-medium">2.3 min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cross-validation</span>
              <span className="font-medium">5-fold</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">2 hours ago</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Data Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Fraud %</span>
              <span className="font-medium">8.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">After SMOTE</span>
              <span className="font-medium">50%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Synthetic Samples</span>
              <span className="font-medium">41,500</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Test Set Size</span>
              <span className="font-medium">20%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validation</span>
              <span className="font-medium">Stratified</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelInsights;