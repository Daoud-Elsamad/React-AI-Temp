export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
  quality?: number; // for image compression (0-1)
  maxWidth?: number; // for image compression
  maxHeight?: number; // for image compression
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file: File;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  thumbnail?: string; // for image previews
  compressedSize?: number; // size after compression
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FilePreviewProps {
  file: UploadedFile;
  onRemove?: (fileId: string) => void;
  showProgress?: boolean;
}

export interface DragDropUploadProps {
  onFilesSelected: (files: File[]) => void;
  options?: FileUploadOptions;
  disabled?: boolean;
  className?: string;
}

export interface FileCompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker?: boolean;
  quality?: number;
} 