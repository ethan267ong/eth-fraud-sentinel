import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Search, Download, Upload, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

const FraudDetector = () => {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [batchFile, setBatchFile] = useState<File | null>(null);

  const mockResults = [
    {
      address: "0x742d35cc6224c18d4b4c43df424a52d5d82ea31a",
      prediction: 1,
      confidence: 0.92,
      riskFactors: ["High frequency transactions", "Suspicious timing patterns", "Large value transfers"],
      features: {
        total_transactions: 245,
        avg_amount: 15.67,
        frequency: 18.9,
        unique_receivers: 89,
        gas_used_avg: 21000,
        sent_to_received_ratio: 3.2
      }
    }
  ];

  const handleAnalyze = async () => {
    if (!walletAddress.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid Ethereum wallet address",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    
    // Simulate API call
    setTimeout(() => {
      setAnalyzing(false);
      const result = {
        ...mockResults[0],
        address: walletAddress,
        prediction: Math.random() > 0.5 ? 1 : 0,
        confidence: Number((0.7 + Math.random() * 0.3).toFixed(2)),
      };
      setResults([result, ...results]);
      
      toast({
        title: "Analysis complete",
        description: `Wallet ${result.prediction === 1 ? 'flagged as fraudulent' : 'appears legitimate'}`,
        variant: result.prediction === 1 ? "destructive" : "default",
      });
    }, 2000);
  };

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBatchFile(file);
      toast({
        title: "Batch file uploaded",
        description: `${file.name} ready for analysis`,
      });
    }
  };

  const downloadResults = () => {
    const csv = [
      "Address,Prediction,Confidence,Risk_Level",
      ...results.map(r => `${r.address},${r.prediction},${r.confidence},${r.prediction === 1 ? 'High' : 'Low'}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fraud_detection_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fraud Detector</h1>
          <p className="text-muted-foreground mt-1">Analyze Ethereum wallets for fraudulent activity</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">
          <Shield className="w-3 h-3 mr-1" />
          XGBoost Model Active
        </Badge>
      </div>

      {/* Single Address Analysis */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Single Address Analysis
          </CardTitle>
          <CardDescription>Enter an Ethereum wallet address to check for fraudulent activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="0x742d35cc6224c18d4b4c43df424a52d5d82ea31a"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-gradient-primary min-w-32"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>The model analyzes transaction patterns, frequency, amounts, and network behavior to detect fraud.</p>
          </div>
        </CardContent>
      </Card>

      {/* Batch Analysis */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Batch Analysis
          </CardTitle>
          <CardDescription>Upload a CSV file with multiple wallet addresses for bulk analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleBatchUpload}
              className="hidden"
              id="batch-upload"
            />
            <label htmlFor="batch-upload">
              <Button variant="outline" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Choose CSV File
              </Button>
            </label>
            
            {batchFile && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{batchFile.name}</span>
                <Button size="sm" className="bg-gradient-primary">
                  Process Batch
                </Button>
              </div>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            CSV format: First column should contain wallet addresses (one per row)
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Analysis Results
                </CardTitle>
                <CardDescription>Fraud detection predictions and confidence scores</CardDescription>
              </div>
              <Button onClick={downloadResults} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-mono text-sm mb-1">{result.address}</div>
                      <div className="flex items-center gap-2">
                        {result.prediction === 1 ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Fraudulent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-success border-success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Legitimate
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Confidence: {(result.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {(result.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Confidence</div>
                    </div>
                  </div>

                  {result.prediction === 1 && (
                    <div className="mt-3 p-3 bg-destructive/10 rounded border border-destructive/20">
                      <div className="text-sm font-medium text-destructive mb-2">Risk Factors:</div>
                      <ul className="text-sm text-destructive/80 list-disc list-inside space-y-1">
                        {result.riskFactors.map((factor: string, i: number) => (
                          <li key={i}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Transactions</div>
                      <div className="font-medium">{result.features.total_transactions}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Amount</div>
                      <div className="font-medium">{result.features.avg_amount} ETH</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Frequency</div>
                      <div className="font-medium">{result.features.frequency}/day</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Unique Receivers</div>
                      <div className="font-medium">{result.features.unique_receivers}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Gas</div>
                      <div className="font-medium">{result.features.gas_used_avg}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Send/Receive Ratio</div>
                      <div className="font-medium">{result.features.sent_to_received_ratio}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FraudDetector;