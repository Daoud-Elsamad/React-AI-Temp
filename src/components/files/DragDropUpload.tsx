import { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { DragDropUploadProps } from '@/lib/types/file';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export function DragDropUpload({ 
  onFilesSelected, 
  options = {}, 
  disabled = false, 
  className = '' 
}: DragDropUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesSelected(acceptedFiles);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    disabled,
    accept: options.allowedTypes ? 
      options.allowedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}) : 
      undefined,
    maxSize: options.maxSize,
    maxFiles: options.maxFiles,
  });

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileTypes = () => {
    if (!options.allowedTypes) return 'Any file type';
    
    const types = options.allowedTypes.map(type => {
      if (type.startsWith('image/')) return type.split('/')[1].toUpperCase();
      if (type === 'application/pdf') return 'PDF';
      if (type === 'text/plain') return 'TXT';
      return type;
    });
    
    return types.join(', ');
  };

  const formatMaxSize = () => {
    if (!options.maxSize) return '';
    const mb = (options.maxSize / 1024 / 1024).toFixed(1);
    return `Max size: ${mb}MB`;
  };

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive && !isDragReject ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
        ${isDragReject ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : ''}
        ${!isDragActive && !isDragReject ? 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500' : ''}
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        ${className}
      `}
    >
      <input {...getInputProps()} ref={fileInputRef} />
      
      <div className="space-y-4">
        <div className="flex justify-center">
          <Icon 
            name={isDragActive ? 'upload' : 'cloudUpload'} 
            size="xl" 
            className={`
              ${isDragActive && !isDragReject ? 'text-blue-500' : ''}
              ${isDragReject ? 'text-red-500' : ''}
              ${!isDragActive && !isDragReject ? 'text-gray-400' : ''}
            `}
          />
        </div>
        
        <div>
          {isDragActive ? (
            isDragReject ? (
              <p className="text-red-600 dark:text-red-400 font-medium">
                Some files are not supported
              </p>
            ) : (
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                Drop the files here...
              </p>
            )
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Drag & drop files here
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                or
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleButtonClick}
                disabled={disabled}
                type="button"
              >
                Choose Files
              </Button>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>Supported formats: {formatFileTypes()}</p>
          {options.maxSize && <p>{formatMaxSize()}</p>}
          {options.maxFiles && <p>Max files: {options.maxFiles}</p>}
        </div>
      </div>
    </div>
  );
} 