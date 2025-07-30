import { useState, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { FileManager } from '@/components/files';
import { FileUploadOptions, UploadedFile } from '@/lib/types/file';
import { useFileProcessing } from '@/hooks/useFileProcessing';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export function AIFileProcessingPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles] = useState<string[]>([]);
  const [processingStats, setProcessingStats] = useState({
    processed: 0,
    processing: 0,
    pending: 0,
    errors: 0,
  });

  const {
    processMultipleFiles,
    generatePromptFromFile,
    processingQueueLength,
    getPromptTemplates,
  } = useFileProcessing({
    onProcessingStart: () => {
      updateProcessingStats();
    },
    onProcessingComplete: (fileId, result) => {
      setFiles(prev =>
        prev.map(file => (file.id === fileId ? { ...file, ...result } : file))
      );
      updateProcessingStats();
    },
    onProcessingError: (fileId, error) => {
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId
            ? { ...file, aiProcessingStatus: 'error', error }
            : file
        )
      );
      updateProcessingStats();
    },
  });

  const updateProcessingStats = useCallback(() => {
    const stats = files.reduce(
      (acc, file) => {
        switch (file.aiProcessingStatus) {
          case 'processed':
            acc.processed++;
            break;
          case 'processing':
            acc.processing++;
            break;
          case 'error':
            acc.errors++;
            break;
          default:
            acc.pending++;
        }
        return acc;
      },
      { processed: 0, processing: 0, pending: 0, errors: 0 }
    );

    setProcessingStats(stats);
  }, [files]);

  const handleFilesChange = useCallback(
    (newFiles: UploadedFile[]) => {
      setFiles(newFiles);
      updateProcessingStats();
    },
    [updateProcessingStats]
  );

  const handleProcessSelected = async () => {
    const filesToProcess = files.filter(
      file =>
        selectedFiles.includes(file.id) &&
        file.aiProcessingStatus !== 'processed' &&
        file.aiProcessingStatus !== 'processing'
    );

    if (filesToProcess.length > 0) {
      try {
        await processMultipleFiles(filesToProcess);
      } catch (error) {
        console.error('Batch processing failed:', error);
      }
    }
  };

  const handleProcessAll = async () => {
    const unprocessedFiles = files.filter(
      file =>
        !file.aiProcessingStatus ||
        file.aiProcessingStatus === 'not_processed' ||
        file.aiProcessingStatus === 'error'
    );

    if (unprocessedFiles.length > 0) {
      try {
        await processMultipleFiles(unprocessedFiles);
      } catch (error) {
        console.error('Batch processing failed:', error);
      }
    }
  };

  const handleGeneratePrompts = async () => {
    const processedFiles = files.filter(
      file =>
        file.aiProcessingStatus === 'processed' &&
        selectedFiles.includes(file.id)
    );

    for (const file of processedFiles) {
      try {
        const prompt = await generatePromptFromFile(file);
        console.log(`Generated prompt for ${file.name}:`, prompt);
        // In a real app, you might show this in a modal or copy to clipboard
      } catch (error) {
        console.error(`Failed to generate prompt for ${file.name}:`, error);
      }
    }
  };

  // File upload options optimized for AI processing
  const aiOptimizedUploadOptions: FileUploadOptions = {
    maxSize: 50 * 1024 * 1024, // 50MB for larger documents
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json',
      'text/javascript',
      'text/typescript',
    ],
    maxFiles: 20,
    quality: 0.9, // Higher quality for better OCR
  };

  const templates = getPromptTemplates();
  const hasFiles = files.length > 0;
  const hasSelected = selectedFiles.length > 0;
  const unprocessedCount = files.filter(
    file =>
      !file.aiProcessingStatus ||
      file.aiProcessingStatus === 'not_processed' ||
      file.aiProcessingStatus === 'error'
  ).length;

  return (
    <PageWrapper
      title="AI File Processing"
      subtitle="Upload files and process them for AI integration with content extraction, OCR, and prompt generation"
    >
      <div className="space-y-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            🤖 AI-Powered File Processing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <ul className="space-y-1">
              <li>• Extract text from documents and images</li>
              <li>• Perform OCR on images with text</li>
              <li>• Analyze image content and metadata</li>
              <li>• Extract EXIF data from photos</li>
            </ul>
            <ul className="space-y-1">
              <li>• Generate AI-ready prompts</li>
              <li>• Parse PDF documents and structure</li>
              <li>• Detect document language and encoding</li>
              <li>• Create comprehensive file metadata</li>
            </ul>
          </div>
        </div>

        {/* Processing Stats */}
        {hasFiles && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {processingStats.processed}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Processed
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {processingStats.processing}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Processing
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {processingStats.pending}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Pending
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {processingStats.errors}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Errors
              </div>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upload Files for AI Processing
            </h2>
            {hasFiles && (
              <div className="flex items-center gap-2">
                {unprocessedCount > 0 && (
                  <Button
                    onClick={handleProcessAll}
                    disabled={processingQueueLength > 0}
                    className="flex items-center gap-2"
                  >
                    <Icon name="refresh" size="sm" />
                    Process All ({unprocessedCount})
                  </Button>
                )}

                {hasSelected && (
                  <>
                    <Button
                      onClick={handleProcessSelected}
                      disabled={processingQueueLength > 0}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Icon name="settings" size="sm" />
                      Process Selected ({selectedFiles.length})
                    </Button>

                    <Button
                      onClick={handleGeneratePrompts}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Icon name="edit" size="sm" />
                      Generate Prompts
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <FileManager
            options={aiOptimizedUploadOptions}
            onFilesChange={handleFilesChange}
            showUploadAll={false}
            // Enable AI processing features in FilePreview components
          />
        </section>

        {/* Template Information */}
        {templates.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Available Prompt Templates
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.supportedFileTypes.slice(0, 3).map(type => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded"
                      >
                        {type.split('/')[1]?.toUpperCase() || type}
                      </span>
                    ))}
                    {template.supportedFileTypes.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                        +{template.supportedFileTypes.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Processing Queue Status */}
        {processingQueueLength > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Icon
                name="loader"
                className="text-blue-600 dark:text-blue-400 animate-spin"
              />
              <span className="text-blue-800 dark:text-blue-200 font-medium">
                Processing {processingQueueLength} file
                {processingQueueLength !== 1 ? 's' : ''}...
              </span>
            </div>
          </div>
        )}

        {/* Technical Details */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Processing Capabilities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Document Processing
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  • <strong>PDF Parsing:</strong> Extract text, metadata, and
                  structure
                </li>
                <li>
                  • <strong>Text Files:</strong> Content extraction with
                  encoding detection
                </li>
                <li>
                  • <strong>Code Files:</strong> Syntax-aware processing
                </li>
                <li>
                  • <strong>Language Detection:</strong> Automatic language
                  identification
                </li>
                <li>
                  • <strong>Word/Character Counts:</strong> Statistical analysis
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Image Processing
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  • <strong>OCR Processing:</strong> Text extraction from images
                </li>
                <li>
                  • <strong>EXIF Data:</strong> Camera settings and location
                  data
                </li>
                <li>
                  • <strong>Color Analysis:</strong> Dominant color extraction
                </li>
                <li>
                  • <strong>Dimension Analysis:</strong> Size and format
                  detection
                </li>
                <li>
                  • <strong>Thumbnail Generation:</strong> Preview creation
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
