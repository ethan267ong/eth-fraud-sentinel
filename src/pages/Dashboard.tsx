import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Shield, Database, AlertTriangle, CheckCircle } from "lucide-react";

const Dashboard = () => {
  // Mock data for charts
  const classDistributionData = [
    { name: 'Before SMOTE', fraud: 850, legitimate: 9150 },
    { name: 'After SMOTE', fraud: 5000, legitimate: 5000 },
  ];

  const performanceOverTime = [
    { month: 'Jan', rocAuc: 0.92, prAuc: 0.88 },
    { month: 'Feb', rocAuc: 0.94, prAuc: 0.90 },
    { month: 'Mar', rocAuc: 0.93, prAuc: 0.89 },
    { month: 'Apr', rocAuc: 0.95, prAuc: 0.92 },
    { month: 'May', rocAuc: 0.96, prAuc: 0.94 },
    { month: 'Jun', rocAuc: 0.97, prAuc: 0.95 },
  ];

  const fraudDistribution = [
    { name: 'Legitimate', value: 92.3, color: 'hsl(var(--success))' },
    { name: 'Fraudulent', value: 7.7, color: 'hsl(var(--destructive))' }
  ];

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
            <div className="text-2xl font-bold text-primary">96.7%</div>
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
            <div className="text-2xl font-bold text-accent">0.94</div>
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
            <div className="text-2xl font-bold text-success">0.91</div>
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
              <BarChart data={classDistributionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="fraud" fill="hsl(var(--destructive))" name="Fraudulent" />
                <Bar dataKey="legitimate" fill="hsl(var(--success))" name="Legitimate" />
              </BarChart>
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
              <LineChart data={performanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis domain={[0.8, 1]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="rocAuc" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="ROC-AUC"
                />
                <Line 
                  type="monotone" 
                  dataKey="prAuc" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="PR-AUC"
                />
              </LineChart>
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
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest fraud detection events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { address: "0x742d35cc62", status: "fraud", confidence: 0.92, time: "2 min ago" },
                { address: "0x891f5b1a8c", status: "legitimate", confidence: 0.98, time: "5 min ago" },
                { address: "0x3c4e8f9d12", status: "fraud", confidence: 0.87, time: "8 min ago" },
                { address: "0x567a2b9e45", status: "legitimate", confidence: 0.95, time: "12 min ago" },
              ].map((item, index) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;