import { useState, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadBoxProps {
  onFileUpload: (file: File) => void;
  isAnalyzing: boolean;
}

const FileUploadBox = ({ onFileUpload, isAnalyzing }: FileUploadBoxProps) => {
  const [dragOver, setDragOver] = useState(false);
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
      if (file.name.toLowerCase().endsWith('.stl')) {
        onFileUpload(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`upload-zone ${dragOver ? 'dragover' : ''} ${isAnalyzing ? 'opacity-75' : ''}`}
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
      
      <div className="flex flex-col items-center space-y-4">
        {isAnalyzing ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium text-text-primary">
                Analyzing Your Model...
              </p>
              <p className="text-sm text-text-muted mt-1">
                This will take just a moment
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-primary" />
            <div className="text-center">
              <p className="text-lg font-medium text-text-primary mb-2">
                Upload STL to Get Instant Quote
              </p>
              <p className="text-sm text-text-muted">
                Drag and drop your file here, or{' '}
                <span className="text-primary font-medium">click to browse</span>
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-text-muted">
              <FileText className="w-4 h-4" />
              <span>STL files only • Max 50MB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export { FileUploadBox };