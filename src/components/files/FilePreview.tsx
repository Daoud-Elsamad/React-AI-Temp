import { FilePreviewProps } from '@/lib/types/file';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { AIProcessingPanel } from './AIProcessingPanel';
import { useState } from 'react';

export function FilePreview({
  file,
  onRemove,
  showProgress = true,
  showAIProcessing = false,
}: FilePreviewProps) {
  const [showAIPanel, setShowAIPanel] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'fileText';
    if (type.startsWith('text/')) return 'fileText';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'music';
    return 'file';
  };

  const getStatusColor = () => {
    switch (file.uploadStatus) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'uploading':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (file.uploadStatus) {
      case 'completed':
        return 'checkCircle';
      case 'error':
        return 'xCircle';
      case 'uploading':
        return 'loader';
      default:
        return 'clock';
    }
  };

  const getAIProcessingStatusColor = () => {
    switch (file.aiProcessingStatus) {
      case 'processed':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-500 dark:text-gray-500';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* File thumbnail or icon */}
          <div className="flex-shrink-0">
            {file.thumbnail ? (
              <img
                src={file.thumbnail}
                alt={file.name}
                className="w-12 h-12 object-cover rounded-lg"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Icon
                  name={getFileIcon(file.type)}
                  className="text-gray-400 dark:text-gray-500"
                />
              </div>
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(file.size)}</span>
                  {file.compressedSize && file.compressedSize !== file.size && (
                    <>
                      <span>→</span>
                      <span className="text-green-600 dark:text-green-400">
                        {formatFileSize(file.compressedSize)}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>{file.type.split('/')[1]?.toUpperCase()}</span>
                </div>

                {/* AI Processing Status */}
                {(file.aiProcessingStatus || showAIProcessing) && (
                  <div
                    className={`flex items-center gap-1 mt-1 ${getAIProcessingStatusColor()}`}
                  >
                    <Icon
                      name={
                        file.aiProcessingStatus === 'processing'
                          ? 'loader'
                          : 'info'
                      }
                      size="sm"
                      className={
                        file.aiProcessingStatus === 'processing'
                          ? 'animate-spin'
                          : ''
                      }
                    />
                    <span className="text-xs">
                      AI:{' '}
                      {file.aiProcessingStatus
                        ? file.aiProcessingStatus.replace('_', ' ')
                        : 'available'}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <div className={`flex items-center gap-1 ${getStatusColor()}`}>
                  <Icon
                    name={getStatusIcon()}
                    size="sm"
                    className={
                      file.uploadStatus === 'uploading' ? 'animate-spin' : ''
                    }
                  />
                  <span className="text-xs capitalize">
                    {file.uploadStatus}
                  </span>
                </div>

                {showAIProcessing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAIPanel(!showAIPanel)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                    title="AI Processing"
                  >
                    <Icon name="settings" size="sm" />
                  </Button>
                )}

                {onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(file.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Icon name="x" size="sm" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {showProgress && file.uploadStatus === 'uploading' && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${file.uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {file.uploadProgress}% uploaded
                </p>
              </div>
            )}

            {/* Error message */}
            {file.uploadStatus === 'error' && file.error && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {file.error}
              </p>
            )}

            {/* Extracted content preview */}
            {file.extractedContent &&
              file.aiProcessingStatus === 'processed' && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                  {file.extractedContent.textContent && (
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                      <span className="font-medium">Content:</span>{' '}
                      {file.extractedContent.textContent.substring(0, 100)}...
                    </p>
                  )}
                  {file.extractedContent.ocrText && (
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                      <span className="font-medium">OCR:</span>{' '}
                      {file.extractedContent.ocrText.substring(0, 100)}...
                    </p>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* AI Processing Panel */}
      {showAIPanel && showAIProcessing && (
        <AIProcessingPanel
          file={file}
          onFileUpdate={(fileId, updates) => {
            // This would typically be handled by a parent component
            console.log('File updated:', fileId, updates);
          }}
        />
      )}
    </div>
  );
}
