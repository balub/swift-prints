import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { STLViewer } from "@/components/STLViewer";
import { SimpleSTLViewer } from "@/components/SimpleSTLViewer";

interface FileUploadBoxProps {
  onFileUpload: (file: File) => void;
  isAnalyzing: boolean;
}

const FileUploadBox = ({ onFileUpload, isAnalyzing }: FileUploadBoxProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (file: File) => {
    // Simulate upload progress
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onFileUpload(file);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <div
        className={`upload-zone ${dragOver ? "dragover" : ""} ${
          isAnalyzing ? "opacity-75" : ""
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!isAnalyzing ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isAnalyzing}
        />

        <div className="flex flex-col items-center space-y-6">
          {isAnalyzing ? (
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
                  Analyzing Your Model
                </p>
                <p className="text-sm text-text-muted mb-4">
                  Calculating print time, material usage, and cost estimates...
                </p>
                <div className="w-64 mx-auto">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-text-muted mt-2 text-center">
                    {uploadProgress}% complete
                  </p>
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
      {uploadedFile && !isAnalyzing && (
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
              <STLViewer file={uploadedFile} className="h-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { FileUploadBox };
