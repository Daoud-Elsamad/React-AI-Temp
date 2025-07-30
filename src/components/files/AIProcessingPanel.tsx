import { useState } from 'react';
import {
  UploadedFile,
  AIPromptTemplate,
  FileProcessingOptions,
} from '@/lib/types/file';
import { useFileProcessing } from '@/hooks/useFileProcessing';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface AIProcessingPanelProps {
  file: UploadedFile;
  onFileUpdate?: (fileId: string, updates: Partial<UploadedFile>) => void;
  className?: string;
}

export function AIProcessingPanel({
  file,
  onFileUpdate,
  className = '',
}: AIProcessingPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<
    AIPromptTemplate | undefined
  >();
  const [processingOptions, setProcessingOptions] =
    useState<FileProcessingOptions>({
      extractText: true,
      performOCR: true,
      analyzeImages: true,
      extractMetadata: true,
      generateAIPrompt: true,
    });
  const [showPrompt, setShowPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');

  const {
    processFile,
    generatePromptFromFile,
    isProcessing,
    getPromptTemplates,
  } = useFileProcessing({
    onProcessingComplete: (fileId, result) => {
      if (onFileUpdate) {
        onFileUpdate(fileId, result);
      }
    },
    onProcessingError: (fileId, error) => {
      if (onFileUpdate) {
        onFileUpdate(fileId, { aiProcessingStatus: 'error', error });
      }
    },
  });

  const handleProcessFile = async () => {
    try {
      await processFile(file, processingOptions);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  const handleGeneratePrompt = async () => {
    try {
      const prompt = await generatePromptFromFile(file, selectedTemplate);
      setGeneratedPrompt(prompt);
      setShowPrompt(true);
    } catch (error) {
      console.error('Failed to generate prompt:', error);
    }
  };

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      // Could add toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getStatusIcon = () => {
    switch (file.aiProcessingStatus) {
      case 'processed':
        return <Icon name="checkCircle" className="text-green-500" />;
      case 'processing':
        return <Icon name="loader" className="text-blue-500 animate-spin" />;
      case 'error':
        return <Icon name="xCircle" className="text-red-500" />;
      default:
        return <Icon name="clock" className="text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (file.aiProcessingStatus) {
      case 'processed':
        return 'Processed';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      default:
        return 'Not processed';
    }
  };

  const templates = getPromptTemplates();
  const isCurrentlyProcessing = isProcessing(file.id);
  const canProcess =
    !isCurrentlyProcessing && file.aiProcessingStatus !== 'processing';
  const canGeneratePrompt =
    file.aiProcessingStatus === 'processed' || file.extractedContent;

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4 ${className}`}
    >
      {/* Status Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            AI Processing: {getStatusText()}
          </span>
        </div>

        {canProcess && (
          <Button
            size="sm"
            onClick={handleProcessFile}
            disabled={isCurrentlyProcessing}
            className="flex items-center gap-2"
          >
            <Icon name="refresh" size="sm" />
            Process File
          </Button>
        )}
      </div>

      {/* Error Display */}
      {file.aiProcessingStatus === 'error' && file.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{file.error}</p>
        </div>
      )}

      {/* Processing Options */}
      {(file.aiProcessingStatus === 'not_processed' ||
        !file.aiProcessingStatus) && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Processing Options
          </h4>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={processingOptions.extractText}
                onChange={e =>
                  setProcessingOptions(prev => ({
                    ...prev,
                    extractText: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Extract Text
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={processingOptions.performOCR}
                onChange={e =>
                  setProcessingOptions(prev => ({
                    ...prev,
                    performOCR: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Perform OCR
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={processingOptions.analyzeImages}
                onChange={e =>
                  setProcessingOptions(prev => ({
                    ...prev,
                    analyzeImages: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Analyze Images
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={processingOptions.extractMetadata}
                onChange={e =>
                  setProcessingOptions(prev => ({
                    ...prev,
                    extractMetadata: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Extract Metadata
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Extracted Content Summary */}
      {file.aiProcessingStatus === 'processed' && file.extractedContent && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Extracted Content
          </h4>

          <div className="space-y-2 text-sm">
            {file.extractedContent.textContent && (
              <div className="bg-white dark:bg-gray-700 rounded border p-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Text Content:
                </span>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs max-h-20 overflow-y-auto">
                  {file.extractedContent.textContent.substring(0, 200)}
                  {file.extractedContent.textContent.length > 200 ? '...' : ''}
                </p>
              </div>
            )}

            {file.extractedContent.ocrText && (
              <div className="bg-white dark:bg-gray-700 rounded border p-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  OCR Text:
                </span>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs">
                  {file.extractedContent.ocrText.substring(0, 100)}
                  {file.extractedContent.ocrText.length > 100 ? '...' : ''}
                </p>
              </div>
            )}

            {file.extractedContent.documentStructure && (
              <div className="bg-white dark:bg-gray-700 rounded border p-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Document:
                </span>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs">
                  {file.extractedContent.documentStructure.pageCount} pages
                  {file.extractedContent.documentStructure.title &&
                    ` - ${file.extractedContent.documentStructure.title}`}
                </p>
              </div>
            )}

            {file.extractedContent.imageAnalysis && (
              <div className="bg-white dark:bg-gray-700 rounded border p-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Image Analysis:
                </span>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs">
                  {file.extractedContent.imageAnalysis.dimensions.width}×
                  {file.extractedContent.imageAnalysis.dimensions.height}
                  {file.extractedContent.imageAnalysis.format &&
                    ` ${file.extractedContent.imageAnalysis.format.toUpperCase()}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Prompt Generation */}
      {canGeneratePrompt && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Generate AI Prompt
          </h4>

          <div className="space-y-2">
            <select
              value={selectedTemplate?.id || ''}
              onChange={e => {
                const template = templates.find(t => t.id === e.target.value);
                setSelectedTemplate(template);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Generic Prompt</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              onClick={handleGeneratePrompt}
              className="w-full flex items-center justify-center gap-2"
            >
              <Icon name="edit" size="sm" />
              Generate Prompt
            </Button>
          </div>
        </div>
      )}

      {/* Generated Prompt Display */}
      {showPrompt && generatedPrompt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Generated Prompt
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={copyPromptToClipboard}
              className="flex items-center gap-1"
            >
              <Icon name="copy" size="sm" />
              Copy
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto">
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {generatedPrompt}
            </pre>
          </div>
        </div>
      )}

      {/* Metadata Display */}
      {file.metadata && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            File Metadata
          </h4>

          <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {file.metadata.wordCount && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Words:
                  </span>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    {file.metadata.wordCount}
                  </span>
                </div>
              )}
              {file.metadata.characterCount && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Characters:
                  </span>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    {file.metadata.characterCount}
                  </span>
                </div>
              )}
              {file.metadata.language && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Language:
                  </span>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    {file.metadata.language}
                  </span>
                </div>
              )}
              {file.metadata.pages && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Pages:
                  </span>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    {file.metadata.pages}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
