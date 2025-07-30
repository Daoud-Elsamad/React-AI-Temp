import { useState, useCallback } from 'react';
import {
  UploadedFile,
  FileProcessingOptions,
  AIPromptTemplate,
} from '@/lib/types/file';
import { FileProcessingService } from '@/lib/ai/fileProcessingService';

interface UseFileProcessingOptions {
  autoProcess?: boolean;
  processingOptions?: FileProcessingOptions;
  onProcessingStart?: (fileId: string) => void;
  onProcessingComplete?: (
    fileId: string,
    result: Partial<UploadedFile>
  ) => void;
  onProcessingError?: (fileId: string, error: string) => void;
}

export function useFileProcessing(options: UseFileProcessingOptions = {}) {
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [processingService] = useState(() => new FileProcessingService());

  const processFile = useCallback(
    async (
      file: UploadedFile,
      processingOptions?: FileProcessingOptions
    ): Promise<Partial<UploadedFile>> => {
      const { onProcessingStart, onProcessingComplete, onProcessingError } =
        options;

      try {
        // Add to processing queue
        setProcessingQueue(prev => [...prev, file.id]);

        if (onProcessingStart) {
          onProcessingStart(file.id);
        }

        // Process the file
        const mergedOptions = {
          ...options.processingOptions,
          ...processingOptions,
        };
        const result = await processingService.processFile(file, mergedOptions);

        // Remove from processing queue
        setProcessingQueue(prev => prev.filter(id => id !== file.id));

        if (onProcessingComplete) {
          onProcessingComplete(file.id, result);
        }

        return result;
      } catch (error) {
        // Remove from processing queue
        setProcessingQueue(prev => prev.filter(id => id !== file.id));

        const errorMessage =
          error instanceof Error ? error.message : 'Processing failed';

        if (onProcessingError) {
          onProcessingError(file.id, errorMessage);
        }

        throw error;
      }
    },
    [options, processingService]
  );

  const processMultipleFiles = useCallback(
    async (
      files: UploadedFile[],
      processingOptions?: FileProcessingOptions
    ): Promise<Partial<UploadedFile>[]> => {
      const results: Partial<UploadedFile>[] = [];

      // Process files sequentially to avoid overwhelming the system
      for (const file of files) {
        try {
          const result = await processFile(file, processingOptions);
          results.push(result);
        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
          results.push({
            aiProcessingStatus: 'error',
            error: error instanceof Error ? error.message : 'Processing failed',
          });
        }
      }

      return results;
    },
    [processFile]
  );

  const generatePromptFromFile = useCallback(
    async (
      file: UploadedFile,
      template?: AIPromptTemplate
    ): Promise<string> => {
      // If file hasn't been processed yet, process it first
      if (!file.extractedContent || file.aiProcessingStatus !== 'processed') {
        const result = await processFile(file, { generateAIPrompt: true });
        return result.aiPrompt || '';
      }

      // Use existing content to generate prompt
      return processingService.generateAIPrompt(
        file,
        file.extractedContent,
        file.metadata,
        { template }
      );
    },
    [processFile, processingService]
  );

  const isProcessing = useCallback(
    (fileId: string): boolean => {
      return processingQueue.includes(fileId);
    },
    [processingQueue]
  );

  const getProcessingQueue = useCallback((): string[] => {
    return [...processingQueue];
  }, [processingQueue]);

  const getPromptTemplates = useCallback((): AIPromptTemplate[] => {
    return processingService.getPromptTemplates();
  }, [processingService]);

  const addPromptTemplate = useCallback(
    (template: AIPromptTemplate): void => {
      processingService.addPromptTemplate(template);
    },
    [processingService]
  );

  return {
    processFile,
    processMultipleFiles,
    generatePromptFromFile,
    isProcessing,
    getProcessingQueue,
    processingQueueLength: processingQueue.length,
    getPromptTemplates,
    addPromptTemplate,
  };
}
