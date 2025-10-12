import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { STLViewer } from "@/components/STLViewer";
import { SimpleSTLViewer } from "@/components/SimpleSTLViewer";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useFileAnalysis } from "@/hooks/useFileAnalysis";
import {
  UploadedFile,
  AnalysisResultResponse,
  PrintSettings,
} from "@/types/api";

interface FileUploadBoxProps {
  onFileUpload?: (file: File) => void;
  onUploadComplete?: (uploadedFile: UploadedFile) => void;
  onAnalysisComplete?: (result: AnalysisResultResponse) => void;
  analysisSettings?: PrintSettings;
  autoStartAnalysis?: boolean;
}

const FileUploadBox = ({
  onFileUpload,
  onUploadComplete,
  onAnalysisComplete,
  analysisSettings,
  autoStartAnalysis = true,
}: FileUploadBoxProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the file upload hook
  const {
    uploadFile,
    uploading,
    progress: uploadProgress,
    error: uploadError,
    uploadedFile,
  } = useFileUpload({
    onSuccess: (file) => {
      onUploadComplete?.(file);
    },
    useTwoPhase: false, // Use direct upload for now
  });

  // Use the file analysis hook
  const {
    analyzing,
    progress: analysisProgress,
    status: analysisStatus,
    result: analysisResult,
    error: analysisError,
    analyzeFile,
    retryAnalysis,
    isAnalysisComplete,
    hasError: hasAnalysisError,
    getAnalysisMetrics,
  } = useFileAnalysis({
    onAnalysisComplete,
    enableRealTimeUpdates: true,
    enableNotifications: true,
  });

  // Auto-start analysis when file upload completes
  useEffect(() => {
    if (
      uploadedFile &&
      autoStartAnalysis &&
      !analyzing &&
      analysisStatus === "idle"
    ) {
      analyzeFile(uploadedFile, analysisSettings);
    }
  }, [
    uploadedFile,
    autoStartAnalysis,
    analyzing,
    analysisStatus,
    analyzeFile,
    analysisSettings,
  ]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith(".stl")) {
        setUploadedFile(file);
        handleFileUpload(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);

    try {
      // Upload the file using the hook
      await uploadFile(file);

      // Call the original callback for backward compatibility
      onFileUpload?.(file);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const isProcessing = uploading || analyzing;
  const currentProgress = uploading ? uploadProgress : analysisProgress;
  const currentError = uploadError || analysisError;

  return (
    <div className="relative">
      <div
        className={`upload-zone ${dragOver ? "dragover" : ""} ${
          isProcessing ? "opacity-75" : ""
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!isProcessing ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center space-y-6">
          {isProcessing ? (
            <>
              <div className="relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-text-primary mb-2">
                  {uploading ? "Uploading Your File" : "Analyzing Your Model"}
                </p>
                <p className="text-sm text-text-muted mb-4">
                  {uploading
                    ? "Securely uploading your STL file..."
                    : analyzing && analysisStatus === "pending"
                    ? "Queuing your file for analysis..."
                    : "Calculating print time, material usage, and cost estimates..."}
                </p>
                <div className="w-64 mx-auto">
                  <Progress value={currentProgress} className="h-2" />
                  <p className="text-xs text-text-muted mt-2 text-center">
                    {Math.round(currentProgress)}% complete
                  </p>
                </div>
              </div>
            </>
          ) : currentError ? (
            <>
              <div className="relative">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-red-600 mb-2">
                  {uploadError ? "Upload Failed" : "Analysis Failed"}
                </p>
                <p className="text-sm text-text-muted mb-4">{currentError}</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (uploadError && selectedFile) {
                        handleFileUpload(selectedFile);
                      } else if (analysisError) {
                        retryAnalysis();
                      }
                    }}
                    className="text-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center shadow-lg">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
              </div>

              <div className="text-center space-y-3">
                <h3 className="text-xl font-semibold text-text-primary">
                  Upload Your STL File
                </h3>
                <p className="text-sm text-text-muted max-w-sm">
                  Drag and drop your 3D model here, or{" "}
                  <span className="text-primary font-medium cursor-pointer hover:underline">
                    click to browse
                  </span>
                </p>
              </div>

              <div className="flex items-center space-x-4 text-xs text-text-muted bg-neutral-50 px-4 py-2 rounded-full">
                <div className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>STL files only</span>
                </div>
                <div className="w-1 h-1 bg-text-muted rounded-full"></div>
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Max 50MB</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-text-muted">
                  Supported formats: .stl, .obj, .ply
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* STL Preview - Below upload, above analysis */}
      {selectedFile && !isProcessing && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-text-primary">
              3D Preview
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? "Hide" : "Show"} Preview
            </Button>
          </div>
          {showPreview && (
            <div className="h-96">
              <STLViewer file={selectedFile} className="h-full" />
            </div>
          )}
        </div>
      )}

      {/* Upload Success */}
      {uploadedFile && !analyzing && analysisStatus === "idle" && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">File uploaded successfully!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            {uploadedFile.original_filename} (
            {(uploadedFile.file_size / (1024 * 1024)).toFixed(2)} MB)
          </p>
          {!autoStartAnalysis && (
            <Button
              onClick={() => analyzeFile(uploadedFile, analysisSettings)}
              className="mt-3"
              size="sm"
            >
              Start Analysis
            </Button>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {isAnalysisComplete && analysisResult && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-700 mb-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Analysis Complete!</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(getAnalysisMetrics() || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { FileUploadBox };
