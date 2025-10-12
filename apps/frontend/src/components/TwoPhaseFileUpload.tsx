/**
 * Two-Phase File Upload Component
 * Implements secure file upload with initiate -> upload -> complete flow
 */
import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
} from "lucide-react";
import {
  useInitiateUpload,
  useCompleteUpload,
  useCancelUpload,
} from "@/hooks/api/useFiles";
import { UploadedFile } from "@/types/api";
import { toast } from "sonner";

interface TwoPhaseFileUploadProps {
  onUploadComplete: (file: UploadedFile) => void;
  onUploadStart?: () => void;
  onUploadProgress?: (progress: number) => void;
  onUploadError?: (error: Error) => void;
  maxSize?: number;
  allowedTypes?: string[];
  className?: string;
}

interface UploadState {
  phase:
    | "idle"
    | "initiating"
    | "uploading"
    | "completing"
    | "completed"
    | "error";
  progress: number;
  sessionId?: string;
  error?: string;
  file?: File;
  uploadedFile?: UploadedFile;
}

export function TwoPhaseFileUpload({
  onUploadComplete,
  onUploadStart,
  onUploadProgress,
  onUploadError,
  maxSize = 50 * 1024 * 1024, // 50MB
  allowedTypes = [".stl", "model/stl", "application/octet-stream"],
  className = "",
}: TwoPhaseFileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    phase: "idle",
    progress: 0,
  });
  const [dragOver, setDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const initiateUpload = useInitiateUpload();
  const completeUpload = useCompleteUpload();
  const cancelUpload = useCancelUpload();

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File size must be less than ${Math.round(
            maxSize / (1024 * 1024)
          )}MB`,
        };
      }

      // Check file type
      const isValidType = allowedTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type === type;
      });

      if (!isValidType) {
        return {
          valid: false,
          error: "Only STL files are allowed",
        };
      }

      return { valid: true };
    },
    [maxSize, allowedTypes]
  );

  const uploadToStorage = useCallback(
    async (
      file: File,
      uploadUrl: string,
      onProgress?: (progress: number) => void
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        abortControllerRef.current = new AbortController();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress?.(progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed due to network error"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was cancelled"));
        });

        // Handle abort signal
        abortControllerRef.current.signal.addEventListener("abort", () => {
          xhr.abort();
        });

        // Determine upload method based on URL
        if (uploadUrl.includes("/api/upload/local/")) {
          // Local storage upload
          const formData = new FormData();
          formData.append("file", file);
          xhr.open("PUT", uploadUrl);
          xhr.send(formData);
        } else {
          // S3 or other cloud storage
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader(
            "Content-Type",
            file.type || "application/octet-stream"
          );
          xhr.send(file);
        }
      });
    },
    []
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadState({
          phase: "error",
          progress: 0,
          error: validation.error,
        });
        onUploadError?.(new Error(validation.error!));
        return;
      }

      setUploadState({
        phase: "initiating",
        progress: 0,
        file,
      });

      onUploadStart?.();

      try {
        // Phase 1: Initiate upload
        const session = await initiateUpload.mutateAsync({
          filename: file.name,
          file_size: file.size,
          content_type: file.type || "application/octet-stream",
        });

        setUploadState((prev) => ({
          ...prev,
          phase: "uploading",
          progress: 10,
          sessionId: session.session_id,
        }));

        onUploadProgress?.(10);

        // Phase 2: Upload to storage
        await uploadToStorage(file, session.upload_url, (progress) => {
          const adjustedProgress = 10 + progress * 0.8; // 10-90%
          setUploadState((prev) => ({
            ...prev,
            progress: adjustedProgress,
          }));
          onUploadProgress?.(adjustedProgress);
        });

        setUploadState((prev) => ({
          ...prev,
          phase: "completing",
          progress: 90,
        }));

        onUploadProgress?.(90);

        // Phase 3: Complete upload
        const completed = await completeUpload.mutateAsync({
          session_id: session.session_id,
        });

        const uploadedFile: UploadedFile = {
          id: completed.file_id,
          filename: completed.filename,
          original_filename: completed.filename,
          file_size: completed.file_size,
          uploaded_at: completed.upload_completed_at,
          created_at: completed.upload_completed_at,
          updated_at: completed.upload_completed_at,
        };

        setUploadState({
          phase: "completed",
          progress: 100,
          uploadedFile,
          file,
        });

        onUploadProgress?.(100);
        onUploadComplete(uploadedFile);

        toast.success("File uploaded successfully!");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setUploadState((prev) => ({
          ...prev,
          phase: "error",
          error: errorMessage,
        }));

        onUploadError?.(
          error instanceof Error ? error : new Error(errorMessage)
        );

        toast.error("Upload failed", {
          description: errorMessage,
        });

        // Clean up session if it exists
        if (uploadState.sessionId) {
          try {
            await cancelUpload.mutateAsync(uploadState.sessionId);
          } catch (cancelError) {
            console.error("Failed to cancel upload session:", cancelError);
          }
        }
      }
    },
    [
      validateFile,
      initiateUpload,
      completeUpload,
      cancelUpload,
      uploadToStorage,
      uploadState.sessionId,
      onUploadStart,
      onUploadProgress,
      onUploadComplete,
      onUploadError,
    ]
  );

  const handleCancel = useCallback(async () => {
    if (uploadState.sessionId) {
      try {
        await cancelUpload.mutateAsync(uploadState.sessionId);
      } catch (error) {
        console.error("Failed to cancel upload:", error);
      }
    }

    // Abort ongoing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setUploadState({
      phase: "idle",
      progress: 0,
    });

    toast.info("Upload cancelled");
  }, [uploadState.sessionId, cancelUpload]);

  const handleReset = useCallback(() => {
    setUploadState({
      phase: "idle",
      progress: 0,
    });
    setShowPreview(false);
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleClick = useCallback(() => {
    if (uploadState.phase === "idle" || uploadState.phase === "error") {
      fileInputRef.current?.click();
    }
  }, [uploadState.phase]);

  const isUploading = ["initiating", "uploading", "completing"].includes(
    uploadState.phase
  );
  const canInteract =
    uploadState.phase === "idle" || uploadState.phase === "error";

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          upload-zone border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${dragOver ? "border-primary bg-primary/5" : "border-border"}
          ${
            canInteract
              ? "hover:border-primary hover:bg-primary/5"
              : "cursor-not-allowed opacity-75"
          }
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={!canInteract}
        />

        <div className="flex flex-col items-center space-y-4">
          {uploadState.phase === "idle" && (
            <>
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-text-primary">
                  Upload Your STL File
                </h3>
                <p className="text-sm text-text-muted max-w-sm">
                  Drag and drop your 3D model here, or{" "}
                  <span className="text-primary font-medium">
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
                  <span>Max {Math.round(maxSize / (1024 * 1024))}MB</span>
                </div>
              </div>
            </>
          )}

          {isUploading && (
            <>
              <div className="relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-text-primary">
                  {uploadState.phase === "initiating" && "Preparing Upload..."}
                  {uploadState.phase === "uploading" && "Uploading File..."}
                  {uploadState.phase === "completing" && "Finalizing Upload..."}
                </h3>
                <p className="text-sm text-text-muted">
                  {uploadState.file?.name}
                </p>
              </div>
              <div className="w-64 space-y-2">
                <Progress value={uploadState.progress} className="h-2" />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-text-muted">
                    {Math.round(uploadState.progress)}% complete
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}

          {uploadState.phase === "completed" && uploadState.uploadedFile && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-green-600">
                  Upload Complete!
                </h3>
                <p className="text-sm text-text-muted">
                  {uploadState.uploadedFile.original_filename} (
                  {(uploadState.uploadedFile.file_size / (1024 * 1024)).toFixed(
                    2
                  )}{" "}
                  MB)
                </p>
              </div>
              <Button variant="outline" onClick={handleReset}>
                Upload Another File
              </Button>
            </>
          )}

          {uploadState.phase === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-red-600">
                  Upload Failed
                </h3>
                <p className="text-sm text-text-muted">{uploadState.error}</p>
              </div>
              <div className="space-x-2">
                <Button variant="outline" onClick={handleReset}>
                  Try Again
                </Button>
                {uploadState.file && (
                  <Button onClick={() => handleFileUpload(uploadState.file!)}>
                    Retry Upload
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Preview */}
      {uploadState.file && uploadState.phase !== "error" && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-text-primary">
              File Preview
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
            <div className="h-96 border border-border rounded-lg overflow-hidden">
              {/* STL Viewer would go here */}
              <div className="h-full flex items-center justify-center bg-neutral-50 text-text-muted">
                3D Preview (STL Viewer integration needed)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TwoPhaseFileUpload;
