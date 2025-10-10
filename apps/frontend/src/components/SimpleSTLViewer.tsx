import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Eye, EyeOff } from "lucide-react";

interface SimpleSTLViewerProps {
  file: File | null;
  className?: string;
}

const SimpleSTLViewer = ({ file, className = "" }: SimpleSTLViewerProps) => {
  const [showPreview, setShowPreview] = useState(false);

  if (!file) {
    return (
      <div
        className={`bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center ${className}`}
      >
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-sm text-text-muted">No file selected</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div>
          <h4 className="text-sm font-medium text-text-primary">{file.name}</h4>
          <p className="text-xs text-text-muted">
            {(file.size / 1024 / 1024).toFixed(2)} MB • STL File
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <EyeOff className="w-4 h-4 mr-2" />
          ) : (
            <Eye className="w-4 h-4 mr-2" />
          )}
          {showPreview ? "Hide" : "Show"} Preview
        </Button>
      </div>

      {/* Preview Area */}
      {showPreview && (
        <div className="p-8 text-center">
          <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            3D Model Ready
          </h3>
          <p className="text-sm text-text-muted mb-4">
            Your STL file has been uploaded and is ready for analysis.
          </p>
          <div className="bg-white rounded-lg p-4 border border-neutral-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">File Type:</span>
                <span className="ml-2 font-medium">STL</span>
              </div>
              <div>
                <span className="text-text-muted">Size:</span>
                <span className="ml-2 font-medium">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div>
                <span className="text-text-muted">Status:</span>
                <span className="ml-2 font-medium text-green-600">Ready</span>
              </div>
              <div>
                <span className="text-text-muted">Format:</span>
                <span className="ml-2 font-medium">Binary</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { SimpleSTLViewer };
