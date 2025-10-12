/**
 * Custom hook for file upload with progress tracking
 */
import { useState, useCallback } from "react";
import {
  useInitiateUpload,
  useCompleteUpload,
  useDirectUpload,
} from "./api/useFiles";
import { UploadedFile } from "@/types/api";
import { toast } from "sonner";

interface UseFileUploadOptions {
  onSuccess?: (file: UploadedFile) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  maxSize?: number;
  allowedTypes?: string[];
  useTwoPhase?: boolean;
}

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const initiateUpload = useInitiateUpload();
  const completeUpload = useCompleteUpload();
  const directUpload = useDirectUpload();

  const {
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = [".stl", "model/stl", "application/octet-stream"],
    useTwoPhase = true,
    onSuccess,
    onError,
    onProgress,
  } = options;

  const validateFile = useCallback(
    (file: File): FileValidationResult => {
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

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setProgress(0);
      setError(null);
      setUploadedFile(null);

      try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        let result: UploadedFile;

        if (useTwoPhase) {
          // Two-phase upload
          setProgress(10);
          onProgress?.(10);

          // Step 1: Initiate upload
          const session = await initiateUpload.mutateAsync({
            filename: file.name,
            file_size: file.size,
            content_type: file.type || "application/octet-stream",
          });

          setProgress(20);
          onProgress?.(20);

          // Step 2: Upload to storage
          await uploadToStorage(file, session.upload_url, (progress) => {
            const adjustedProgress = 20 + progress * 0.7; // 20-90%
            setProgress(adjustedProgress);
            onProgress?.(adjustedProgress);
          });

          setProgress(90);
          onProgress?.(90);

          // Step 3: Complete upload
          const completed = await completeUpload.mutateAsync({
            session_id: session.session_id,
          });

          result = {
            id: completed.file_id,
            filename: completed.filename,
            original_filename: completed.filename,
            file_size: completed.file_size,
            uploaded_at: completed.upload_completed_at,
            created_at: completed.upload_completed_at,
            updated_at: completed.upload_completed_at,
          };
        } else {
          // Direct upload
          const uploadResult = await directUpload.mutateAsync(file);
          result = {
            id: uploadResult.file_id,
            filename: uploadResult.filename,
            original_filename: uploadResult.filename,
            file_size: uploadResult.file_size,
            uploaded_at: uploadResult.upload_completed_at,
            created_at: uploadResult.upload_completed_at,
            updated_at: uploadResult.upload_completed_at,
          };
        }

        setProgress(100);
        onProgress?.(100);
        setUploadedFile(result);
        onSuccess?.(result);

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [
      validateFile,
      useTwoPhase,
      initiateUpload,
      completeUpload,
      directUpload,
      onSuccess,
      onError,
      onProgress,
    ]
  );

  const uploadToStorage = async (
    file: File,
    uploadUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

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
  };

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedFile(null);
  }, []);

  return {
    uploadFile,
    uploading,
    progress,
    error,
    uploadedFile,
    reset,
    validateFile,
  };
}
