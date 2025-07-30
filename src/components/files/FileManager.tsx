import { useEffect } from 'react';
import { DragDropUpload } from './DragDropUpload';
import { FilePreview } from './FilePreview';
import { useFileUpload } from '@/hooks/useFileUpload';
import { FileUploadOptions } from '@/lib/types/file';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface FileManagerProps {
  options?: FileUploadOptions;
  onFilesChange?: (files: any[]) => void;
  showUploadAll?: boolean;
  className?: string;
}

export function FileManager({ 
  options, 
  onFilesChange, 
  showUploadAll = true, 
  className = '' 
}: FileManagerProps) {
  const {
    files,
    addFiles,
    removeFile,
    clearFiles,
    simulateUpload,
    options: mergedOptions,
  } = useFileUpload(options);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    try {
      await addFiles(selectedFiles);
    } catch (error) {
      console.error('Error adding files:', error);
      // You could add toast notification here
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter(file => file.uploadStatus === 'pending');
    
    for (const file of pendingFiles) {
      try {
        await simulateUpload(file.id);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
      }
    }
  };

  const handleUploadSingle = async (fileId: string) => {
    try {
      await simulateUpload(fileId);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);

  const pendingCount = files.filter(file => file.uploadStatus === 'pending').length;
  const uploadingCount = files.filter(file => file.uploadStatus === 'uploading').length;
  const completedCount = files.filter(file => file.uploadStatus === 'completed').length;
  const errorCount = files.filter(file => file.uploadStatus === 'error').length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <DragDropUpload
        onFilesSelected={handleFilesSelected}
        options={mergedOptions}
        disabled={uploadingCount > 0}
      />

      {/* File Stats */}
      {files.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Files ({files.length})
            </h3>
            <div className="flex items-center gap-2">
              {showUploadAll && pendingCount > 0 && (
                <Button
                  onClick={handleUploadAll}
                  disabled={uploadingCount > 0}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Icon name="upload" size="sm" />
                  Upload All ({pendingCount})
                </Button>
              )}
              {files.length > 0 && (
                <Button
                  onClick={clearFiles}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Icon name="x" size="sm" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Icon name="clock" size="sm" className="text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Pending: {pendingCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="loader" size="sm" className="text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Uploading: {uploadingCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="checkCircle" size="sm" className="text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Completed: {completedCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="xCircle" size="sm" className="text-red-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Errors: {errorCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="relative">
              <FilePreview
                file={file}
                onRemove={removeFile}
                showProgress={true}
              />
              
              {/* Individual upload button for pending files */}
              {file.uploadStatus === 'pending' && (
                <div className="absolute top-4 right-16">
                  <Button
                    onClick={() => handleUploadSingle(file.id)}
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                  >
                    Upload
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Icon name="cloudUpload" size="xl" className="mx-auto mb-2 text-gray-300" />
          <p>No files uploaded yet</p>
        </div>
      )}
    </div>
  );
} 