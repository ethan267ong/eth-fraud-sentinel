import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Brain, RefreshCw, Database, Zap, Shield } from "lucide-react";

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
  timestamp: string;
}

const Settings = () => {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selectedModel') || "xgboost");
  const [continuousLearning, setContinuousLearning] = useState(true);
  const [syntheticDataGen, setSyntheticDataGen] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [autoRebalancing, setAutoRebalancing] = useState(true);
  const [modelMetrics, setModelMetrics] = useState<Record<string, ModelMetrics>>({});

  const fetchModelMetrics = async () => {
    try {
      const response = await fetch('/api/models/metrics');
      const data = await response.json();
      if (data.ok) {
        setModelMetrics(data.models);
      }
    } catch (error) {
      console.error('Failed to fetch model metrics:', error);
    }
  };

  useEffect(() => {
    fetchModelMetrics();
  }, []);

  const getModelPerformance = (modelValue: string): string => {
    const metrics = modelMetrics[modelValue];
    if (metrics && metrics.accuracy > 0) {
      return `${(metrics.accuracy * 100).toFixed(1)}%`;
    }
    return "Not trained";
  };

  const modelOptions = [
    { 
      value: "xgboost", 
      label: "XGBoost", 
      description: "Gradient boosting with high accuracy",
      performance: getModelPerformance("xgboost"),
      status: "active"
    },
    { 
      value: "svm", 
      label: "Support Vector Machine", 
      description: "Classical ML with good interpretability",
      performance: getModelPerformance("svm"),
      status: "available"
    },
    { 
      value: "random_forest", 
      label: "Random Forest", 
      description: "Ensemble method with feature importance",
      performance: getModelPerformance("random_forest"),
      status: "available"
    },
    { 
      value: "neural_network", 
      label: "Neural Network", 
      description: "Deep learning for complex patterns",
      performance: getModelPerformance("neural_network"),
      status: "training"
    }
  ];

  const handleRetrain = () => {
    setRetraining(true);
    
    setTimeout(() => {
      setRetraining(false);
      toast({
        title: "Model retrained successfully",
        description: "Performance metrics have been updated",
      });
    }, 5000);
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    try {
      localStorage.setItem('selectedModel', value);
    } catch {}
    
    // Refresh metrics after model change
    fetchModelMetrics();
    
    toast({
      title: "Model updated",
      description: `Switched to ${modelOptions.find(m => m.value === value)?.label}`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure model parameters and system preferences</p>
      </div>

      {/* Model Selection */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Model Selection
          </CardTitle>
          <CardDescription>
            Choose the machine learning model for fraud detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Active Model</label>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((model) => {
                    const isActive = selectedModel === model.value;
                    const statusLabel = isActive ? 'active' : 'available';
                    return (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{model.label}</span>
                        <Badge 
                          variant={isActive ? "default" : "outline"}
                          className="ml-2"
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                    </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Model Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modelOptions.map((model) => {
                const isActive = selectedModel === model.value;
                const statusLabel = isActive ? 'active' : 'available';
                return (
                <div 
                  key={model.value}
                  className={`p-3 rounded-lg border transition-all ${
                    isActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{model.label}</h4>
                    <Badge variant={isActive ? "default" : "outline"} className="text-xs">
                      {statusLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{model.description}</p>
                  <div className="text-lg font-bold text-primary">{model.performance}</div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training & Learning */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Training & Learning
          </CardTitle>
          <CardDescription>
            Manage model training and continuous learning settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleRetrain}
              disabled={retraining}
              className="bg-gradient-primary"
            >
              {retraining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Retraining Model...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retrain Model
                </>
              )}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Last trained: 2 hours ago
            </div>
          </div>

          {retraining && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="font-medium">Retraining in progress...</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>• Loading latest dataset...</div>
                <div>• Feature engineering...</div>
                <div>• Hyperparameter optimization...</div>
                <div>• Cross-validation...</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            System Configuration
          </CardTitle>
          <CardDescription>
            Configure system behavior and automation settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Continuous Learning</div>
                <div className="text-sm text-muted-foreground">
                  Automatically update model with new labeled data
                </div>
              </div>
              <Switch 
                checked={continuousLearning}
                onCheckedChange={setContinuousLearning}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Synthetic Data Generation</div>
                <div className="text-sm text-muted-foreground">
                  Generate synthetic samples to balance dataset using SMOTE
                </div>
              </div>
              <Switch 
                checked={syntheticDataGen}
                onCheckedChange={setSyntheticDataGen}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-Rebalancing</div>
                <div className="text-sm text-muted-foreground">
                  Automatically rebalance classes when new data is added
                </div>
              </div>
              <Switch 
                checked={autoRebalancing}
                onCheckedChange={setAutoRebalancing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage datasets and data processing settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/20 border">
              <div className="text-2xl font-bold mb-1">1.2M</div>
              <div className="text-sm text-muted-foreground">Total Wallets</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/20 border">
              <div className="text-2xl font-bold mb-1">95K</div>
              <div className="text-sm text-muted-foreground">Labeled Samples</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/20 border">
              <div className="text-2xl font-bold mb-1">24</div>
              <div className="text-sm text-muted-foreground">Active Features</div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Export Training Data
            </Button>
            <Button variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
            <Button variant="outline">
              <Shield className="w-4 h-4 mr-2" />
              Backup Model
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Status</span>
                <Badge variant="outline" className="text-success border-success">Healthy</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model Status</span>
                <Badge variant="outline" className="text-success border-success">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database</span>
                <Badge variant="outline" className="text-success border-success">Connected</Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Predictions Today</span>
                <span className="font-medium">2,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Response Time</span>
                <span className="font-medium">245ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-medium">99.9%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;