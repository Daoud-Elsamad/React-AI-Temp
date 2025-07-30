import { useState, useCallback, useMemo } from 'react';
import imageCompression from 'browser-image-compression';
import {
  FileUploadOptions,
  UploadedFile,
  FileValidationResult,
  FileCompressionOptions,
} from '../lib/types/file';

const DEFAULT_OPTIONS: FileUploadOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
  ],
  maxFiles: 10,
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080,
};

export function useFileUpload(options: FileUploadOptions = {}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const mergedOptions = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options]
  );

  const validateFile = useCallback(
    (file: File): FileValidationResult => {
      const errors: string[] = [];

      // Check file size
      if (file.size > mergedOptions.maxSize!) {
        errors.push(
          `File size must be less than ${(mergedOptions.maxSize! / 1024 / 1024).toFixed(1)}MB`
        );
      }

      // Check file type
      if (
        mergedOptions.allowedTypes &&
        !mergedOptions.allowedTypes.includes(file.type)
      ) {
        errors.push(`File type ${file.type} is not allowed`);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    [mergedOptions]
  );

  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      if (!file.type.startsWith('image/')) {
        return file;
      }

      const compressionOptions: FileCompressionOptions = {
        maxSizeMB: mergedOptions.maxSize! / 1024 / 1024,
        maxWidthOrHeight: Math.max(
          mergedOptions.maxWidth!,
          mergedOptions.maxHeight!
        ),
        useWebWorker: true,
        quality: mergedOptions.quality,
      };

      try {
        const compressedFile = await imageCompression(file, compressionOptions);
        return compressedFile;
      } catch (error) {
        console.warn('Image compression failed, using original file:', error);
        return file;
      }
    },
    [mergedOptions]
  );

  const createThumbnail = useCallback(
    (file: File): Promise<string | undefined> => {
      return new Promise(resolve => {
        if (!file.type.startsWith('image/')) {
          resolve(undefined);
          return;
        }

        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Create thumbnail (150x150)
            const size = 150;
            canvas.width = size;
            canvas.height = size;

            const aspectRatio = img.width / img.height;
            let drawWidth = size;
            let drawHeight = size;
            let offsetX = 0;
            let offsetY = 0;

            if (aspectRatio > 1) {
              drawHeight = size / aspectRatio;
              offsetY = (size - drawHeight) / 2;
            } else {
              drawWidth = size * aspectRatio;
              offsetX = (size - drawWidth) / 2;
            }

            ctx?.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      // Check max files limit
      if (files.length + newFiles.length > mergedOptions.maxFiles!) {
        throw new Error(`Maximum ${mergedOptions.maxFiles} files allowed`);
      }

      const processedFiles: UploadedFile[] = [];

      for (const file of newFiles) {
        const validation = validateFile(file);

        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }

        const id = crypto.randomUUID();
        const originalSize = file.size;

        // Compress image if needed
        const processedFile = await compressImage(file);

        // Create thumbnail for images
        const thumbnail = await createThumbnail(processedFile);

        const uploadedFile: UploadedFile = {
          id,
          name: file.name,
          size: originalSize,
          type: file.type,
          url: URL.createObjectURL(processedFile),
          file: processedFile,
          uploadProgress: 0,
          uploadStatus: 'pending',
          thumbnail,
          compressedSize:
            processedFile.size !== originalSize
              ? processedFile.size
              : undefined,
        };

        processedFiles.push(uploadedFile);
      }

      setFiles(prev => [...prev, ...processedFiles]);
      return processedFiles;
    },
    [files.length, mergedOptions, validateFile, compressImage, createThumbnail]
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.url) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const updateFileProgress = useCallback((fileId: string, progress: number) => {
    setFiles(prev =>
      prev.map(file =>
        file.id === fileId ? { ...file, uploadProgress: progress } : file
      )
    );
  }, []);

  const updateFileStatus = useCallback(
    (fileId: string, status: UploadedFile['uploadStatus'], error?: string) => {
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId ? { ...file, uploadStatus: status, error } : file
        )
      );
    },
    []
  );

  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
      }
    });
    setFiles([]);
  }, [files]);

  const simulateUpload = useCallback(
    async (fileId: string) => {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      updateFileStatus(fileId, 'uploading');

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        updateFileProgress(fileId, progress);
      }

      updateFileStatus(fileId, 'completed');
    },
    [files, updateFileStatus, updateFileProgress]
  );

  return {
    files,
    isDragging,
    setIsDragging,
    addFiles,
    removeFile,
    updateFileProgress,
    updateFileStatus,
    clearFiles,
    simulateUpload,
    validateFile,
    options: mergedOptions,
  };
}
