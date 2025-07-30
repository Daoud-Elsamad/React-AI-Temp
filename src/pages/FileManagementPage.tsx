import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { FileManager } from '@/components/files';
import { FileUploadOptions, UploadedFile } from '@/lib/types/file';

export function FileManagementPage() {
  const [selectedFiles, setSelectedFiles] = React.useState<UploadedFile[]>([]);

  // Example configurations for different use cases
  const imageUploadOptions: FileUploadOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles: 5,
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
  };

  const documentUploadOptions: FileUploadOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'text/plain', 'application/msword'],
    maxFiles: 10,
  };

  const generalUploadOptions: FileUploadOptions = {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'video/mp4',
      'video/webm',
      'audio/mp3',
      'audio/wav',
    ],
    maxFiles: 15,
    quality: 0.9,
  };

  return (
    <PageWrapper
      title="File Management System"
      subtitle="Upload, manage, and organize your files with drag & drop functionality"
    >
      <div className="space-y-12">
        {/* Introduction */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            ✨ File Upload Features
          </h2>
          <ul className="space-y-1 text-blue-800 dark:text-blue-200 text-sm">
            <li>• Drag & drop file upload with visual feedback</li>
            <li>• File validation (size, type, count limits)</li>
            <li>• Automatic image compression and thumbnail generation</li>
            <li>• Upload progress indicators and status tracking</li>
            <li>• File preview with support for images and documents</li>
            <li>• Individual and batch upload operations</li>
          </ul>
        </div>

        {/* General File Upload */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              General File Upload
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Supports images, documents, videos, and audio files up to 20MB
              each (max 15 files)
            </p>
          </div>

          <FileManager
            options={generalUploadOptions}
            onFilesChange={setSelectedFiles}
            showUploadAll={true}
          />
        </section>

        {/* Image-Only Upload */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Image Upload with Compression
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Images only, automatically compressed and resized (max 5MB, 5
              files)
            </p>
          </div>

          <FileManager options={imageUploadOptions} showUploadAll={true} />
        </section>

        {/* Document Upload */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Document Upload
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Documents only (PDF, TXT, DOC) up to 10MB each (max 10 files)
            </p>
          </div>

          <FileManager options={documentUploadOptions} showUploadAll={false} />
        </section>

        {/* File Information */}
        {selectedFiles.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Selected Files Summary
            </h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Total Files:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {selectedFiles.length}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Total Size:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {(
                      selectedFiles.reduce((acc, file) => acc + file.size, 0) /
                      1024 /
                      1024
                    ).toFixed(2)}{' '}
                    MB
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Completed:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {
                      selectedFiles.filter(
                        file => file.uploadStatus === 'completed'
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Technical Details */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Technical Implementation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Libraries Used
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  • <strong>react-dropzone:</strong> Drag & drop functionality
                </li>
                <li>
                  • <strong>browser-image-compression:</strong> Client-side
                  image compression
                </li>
                <li>
                  • <strong>file-saver:</strong> File download capabilities
                </li>
                <li>
                  • <strong>Custom hooks:</strong> File upload state management
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Features Implemented
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• File type and size validation</li>
                <li>• Automatic thumbnail generation</li>
                <li>• Progress tracking and status updates</li>
                <li>• Responsive design with dark mode</li>
                <li>• TypeScript for type safety</li>
                <li>• Error handling and user feedback</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
