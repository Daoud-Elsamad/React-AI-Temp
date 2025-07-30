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
  // AI Processing fields
  aiProcessingStatus?: 'not_processed' | 'processing' | 'processed' | 'error';
  extractedContent?: FileExtractedContent;
  metadata?: FileMetadata;
  aiPrompt?: string;
}

export interface FileExtractedContent {
  textContent?: string; // Extracted text from documents/images
  ocrText?: string; // OCR text from images
  documentStructure?: DocumentStructure; // PDF structure
  imageAnalysis?: ImageAnalysisData; // Image analysis results
  audioTranscription?: string; // Audio transcription
  extractedAt: Date;
  extractionMethod: 'direct' | 'ocr' | 'pdf-parse' | 'manual';
}

export interface DocumentStructure {
  pageCount?: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  pages?: DocumentPage[];
  outline?: DocumentOutline[];
}

export interface DocumentPage {
  pageNumber: number;
  text: string;
  images?: string[]; // Base64 encoded images
}

export interface DocumentOutline {
  title: string;
  level: number;
  page: number;
  children?: DocumentOutline[];
}

export interface ImageAnalysisData {
  dimensions: { width: number; height: number };
  format: string;
  colorProfile?: string;
  dominantColors?: string[];
  detectedObjects?: DetectedObject[];
  textRegions?: TextRegion[];
  faces?: FaceDetection[];
  exifData?: ExifData;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface TextRegion {
  text: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface FaceDetection {
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  landmarks?: { x: number; y: number }[];
}

export interface ExifData {
  camera?: string;
  lens?: string;
  settings?: {
    aperture?: string;
    shutter?: string;
    iso?: number;
    focalLength?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  timestamp?: Date;
  orientation?: number;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  extension: string;
  lastModified: Date;
  hash?: string; // File hash for deduplication
  encoding?: string; // Text encoding
  language?: string; // Detected language
  wordCount?: number;
  characterCount?: number;
  pages?: number;
  duration?: number; // For audio/video files
  bitrate?: number;
  resolution?: { width: number; height: number };
  compression?: string;
  extractedAt: Date;
}

export interface FileProcessingOptions {
  extractText?: boolean;
  performOCR?: boolean;
  analyzeImages?: boolean;
  extractMetadata?: boolean;
  generateAIPrompt?: boolean;
  language?: string; // For OCR language
  confidenceThreshold?: number; // For OCR confidence
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  supportedFileTypes: string[];
  variables: string[]; // Variables that can be replaced in template
}

export interface FileToPromptOptions {
  template?: AIPromptTemplate;
  includeMetadata?: boolean;
  includeContent?: boolean;
  maxContentLength?: number;
  summarizeContent?: boolean;
  contextInstructions?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FilePreviewProps {
  file: UploadedFile;
  onRemove?: (fileId: string) => void;
  showProgress?: boolean;
  showAIProcessing?: boolean;
}

export interface DragDropUploadProps {
  onFilesSelected: (files: File[]) => void;
  options?: FileUploadOptions;
  disabled?: boolean;
  className?: string;
  enableAIProcessing?: boolean;
}

export interface FileCompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker?: boolean;
  quality?: number;
}
