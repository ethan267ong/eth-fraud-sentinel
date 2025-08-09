import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, AlertCircle, Database, Play } from "lucide-react";

const UploadData = () => {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [transactionsFile, setTransactionsFile] = useState<File | null>(null);
  const [featuresFile, setFeaturesFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preprocessing, setPreprocessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem('selectedModel') || 'xgboost');

  useEffect(() => {
    const syncModel = () => setSelectedModel(localStorage.getItem('selectedModel') || 'xgboost');
    window.addEventListener('storage', syncModel);
    // also sync on mount
    syncModel();
    return () => window.removeEventListener('storage', syncModel);
  }, []);

  // Mock preview data
  const mockPreviewData = [
    { wallet_address: "0x742d35cc...", total_transactions: 156, avg_amount: 2.34, frequency: 12.5, first_seen: "2023-01-15" },
    { wallet_address: "0x891f5b1a...", total_transactions: 89, avg_amount: 0.87, frequency: 8.2, first_seen: "2023-02-03" },
    { wallet_address: "0x3c4e8f9d...", total_transactions: 245, avg_amount: 5.67, frequency: 18.9, first_seen: "2023-01-08" },
    { wallet_address: "0x567a2b9e...", total_transactions: 34, avg_amount: 1.23, frequency: 3.1, first_seen: "2023-03-12" },
    { wallet_address: "0x9a8b7c6d...", total_transactions: 567, avg_amount: 12.45, frequency: 45.2, first_seen: "2022-12-22" },
  ];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        // If transactions not set, fill it; else set features
        if (!transactionsFile) {
          setTransactionsFile(file);
          simulateUpload(file);
        } else {
          setFeaturesFile(file);
          simulateUpload(file);
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
      }
    }
  }, [toast, transactionsFile]);

  const handleFileInputTx = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTransactionsFile(file);
      simulateUpload(file);
    }
  };
  const handleFileInputFeat = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFeaturesFile(file);
      simulateUpload(file);
    }
  };

  const simulateUpload = (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setPreviewData(mockPreviewData);
          toast({
            title: "File uploaded successfully",
            description: `${file.name} has been processed`,
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handlePreprocess = () => {
    setPreprocessing(true);
    
    setTimeout(() => {
      setPreprocessing(false);
      toast({
        title: "Preprocessing completed",
        description: "Data has been cleaned and features engineered",
      });
    }, 3000);
  };

  const handleTrain = async () => {
    if (!transactionsFile || !featuresFile) {
      toast({ title: "Missing files", description: "Please upload both Transactions and Features CSVs", variant: "destructive" });
      return;
    }
    try {
      setPreprocessing(true);
      setMetrics(null);
      const form = new FormData();
      form.append("transactions_csv", transactionsFile);
      form.append("features_csv", featuresFile);
      form.append("no_tune", "true");
      // Include selected model from localStorage (set by Settings page)
      form.append('model', selectedModel);
      const res = await fetch("/api/train", { method: "POST", body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data.metrics);
      const modelLabel = selectedModel === 'svm' ? 'SVM' : selectedModel === 'random_forest' ? 'Random Forest' : selectedModel === 'neural_network' ? 'Neural Network' : 'XGBoost';
      toast({ title: "Training completed", description: `${modelLabel} metrics updated.` });
    } catch (err: any) {
      toast({ title: "Training failed", description: String(err), variant: "destructive" });
    } finally {
      setPreprocessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Dataset</h1>
        <p className="text-muted-foreground mt-1">Upload Ethereum transaction data for fraud detection analysis</p>
      </div>

      {/* Upload Area */}
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle>Data Upload</CardTitle>
          <CardDescription>Drag and drop your CSV file or click to browse</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
              ${dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInputTx}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              
              <div>
                <p className="text-lg font-medium">Transactions CSV</p>
                <p className="text-muted-foreground">Drag & drop or click to upload</p>
              </div>
              
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>Supported format: CSV</span>
                <span>•</span>
                <span>Max size: 100MB</span>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {transactionsFile && !uploading && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{transactionsFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(transactionsFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Badge variant="outline" className="text-success border-success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Uploaded
                </Badge>
              </div>
            </div>
          )}

          {/* Features file uploader */}
          <div className="mt-6 relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30">
            <input type="file" accept=".csv" onChange={handleFileInputFeat} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">Features CSV</p>
                <p className="text-muted-foreground">Drag & drop or click to upload</p>
              </div>
            </div>
          </div>

          {featuresFile && !uploading && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{featuresFile.name}</p>
                  <p className="text-sm text-muted-foreground">{(featuresFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <Badge variant="outline" className="text-success border-success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Uploaded
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Preview */}
      {previewData.length > 0 && (
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Preview
            </CardTitle>
            <CardDescription>First 5 rows of your uploaded dataset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Wallet Address</th>
                    <th className="text-left p-2 font-medium">Total Transactions</th>
                    <th className="text-left p-2 font-medium">Avg Amount (ETH)</th>
                    <th className="text-left p-2 font-medium">Frequency</th>
                    <th className="text-left p-2 font-medium">First Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-mono">{row.wallet_address}</td>
                      <td className="p-2">{row.total_transactions}</td>
                      <td className="p-2">{row.avg_amount}</td>
                      <td className="p-2">{row.frequency}</td>
                      <td className="p-2">{row.first_seen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing 5 of 10,000 rows
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handlePreprocess} disabled={preprocessing} variant="outline">
                  {preprocessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Preprocess
                    </>
                  )}
                </Button>
                <Button onClick={handleTrain} disabled={preprocessing || !transactionsFile || !featuresFile} className="bg-gradient-primary">
                  {selectedModel === 'svm' ? 'Train SVM' : selectedModel === 'random_forest' ? 'Train Random Forest' : selectedModel === 'neural_network' ? 'Train Neural Network' : 'Train XGBoost'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {(preprocessing || metrics) && (
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              {metrics ? 'Training Results' : 'Preprocessing Pipeline'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!metrics ? (
              <div className="space-y-3">
                {[
                  { step: "Data validation", status: "completed" },
                  { step: "Feature engineering", status: "processing" },
                  { step: "SMOTE balancing", status: "pending" },
                  { step: "Feature scaling", status: "pending" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {item.status === "completed" ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : item.status === "processing" ? (
                      <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-muted rounded-full" />
                    )}
                    <span className={item.status === "completed" ? "text-success" : "text-muted-foreground"}>
                      {item.step}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(metrics).filter(([k]) => !['report','best_params'].includes(k)).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-lg bg-muted/20 border">
                    <div className="text-xs text-muted-foreground">{k}</div>
                    <div className="text-lg font-bold">{typeof v === 'number' ? (v as number).toFixed(4) : String(v)}</div>
                  </div>
                ))}
                {metrics.report && (
                  <div className="md:col-span-3 p-3 rounded-lg bg-muted/20 border">
                    <div className="text-xs text-muted-foreground mb-2">classification report</div>
                    <pre className="text-xs whitespace-pre-wrap">{metrics.report}</pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadData;