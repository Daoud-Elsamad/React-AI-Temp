import {
  UploadedFile,
  FileExtractedContent,
  FileMetadata,
  FileProcessingOptions,
  AIPromptTemplate,
  FileToPromptOptions,
  DocumentStructure,
  ImageAnalysisData,
  ExifData,
} from '../types/file';

// Note: These imports would be dynamically imported to avoid bundle size issues
// import pdfParse from 'pdf-parse';
// import EXIFR from 'exifr';
// import Tesseract from 'tesseract.js';
// import { fileTypeFromBuffer } from 'file-type';

/**
 * File Processing Service for AI Integration
 * Handles content extraction, metadata extraction, and AI prompt generation
 */
export class FileProcessingService {
  private readonly supportedTextTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'text/markdown',
  ];

  private readonly supportedDocumentTypes = ['application/pdf'];

  private readonly supportedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ];

  private readonly defaultPromptTemplates: AIPromptTemplate[] = [
    {
      id: 'document-analysis',
      name: 'Document Analysis',
      description: 'Analyze and summarize document content',
      template: `Please analyze this document:

**File Information:**
- Name: {{fileName}}
- Type: {{fileType}}
- Size: {{fileSize}}
{{#if pageCount}}- Pages: {{pageCount}}{{/if}}

**Content:**
{{content}}

Please provide:
1. A brief summary of the main topics
2. Key insights or important information
3. Any actionable items or recommendations`,
      supportedFileTypes: ['application/pdf', 'text/plain', 'text/markdown'],
      variables: ['fileName', 'fileType', 'fileSize', 'pageCount', 'content'],
    },
    {
      id: 'image-description',
      name: 'Image Description',
      description: 'Describe and analyze image content',
      template: `Please analyze this image:

**Image Information:**
- Name: {{fileName}}
- Dimensions: {{width}}x{{height}}
- Format: {{format}}
{{#if ocrText}}- Detected Text: {{ocrText}}{{/if}}

Please describe:
1. What you see in the image
2. The main subjects or objects
3. The setting or context
4. Any text visible in the image
5. Overall mood or impression`,
      supportedFileTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ],
      variables: ['fileName', 'width', 'height', 'format', 'ocrText'],
    },
    {
      id: 'code-review',
      name: 'Code Review',
      description: 'Review and analyze code files',
      template: `Please review this code file:

**File Information:**
- Name: {{fileName}}
- Language: {{language}}
- Size: {{fileSize}}
- Lines: {{lineCount}}

**Code:**
\`\`\`{{language}}
{{content}}
\`\`\`

Please provide:
1. Code quality assessment
2. Potential improvements or optimizations
3. Security considerations
4. Best practices recommendations
5. Bug detection`,
      supportedFileTypes: [
        'text/javascript',
        'text/typescript',
        'text/python',
        'text/java',
      ],
      variables: ['fileName', 'language', 'fileSize', 'lineCount', 'content'],
    },
  ];

  /**
   * Process a file for AI integration
   */
  async processFile(
    file: UploadedFile,
    options: FileProcessingOptions = {}
  ): Promise<Partial<UploadedFile>> {
    const defaultOptions: FileProcessingOptions = {
      extractText: true,
      performOCR: true,
      analyzeImages: true,
      extractMetadata: true,
      generateAIPrompt: true,
      language: 'eng',
      confidenceThreshold: 0.7,
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const updates: Partial<UploadedFile> = {
      aiProcessingStatus: 'processing',
    };

    try {
      // Extract basic metadata
      if (mergedOptions.extractMetadata) {
        updates.metadata = await this.extractMetadata(file);
      }

      // Extract content based on file type
      const extractedContent: FileExtractedContent = {
        extractedAt: new Date(),
        extractionMethod: 'direct',
      };

      if (mergedOptions.extractText) {
        if (this.supportedTextTypes.includes(file.type)) {
          extractedContent.textContent = await this.extractTextContent(file);
        } else if (this.supportedDocumentTypes.includes(file.type)) {
          const docStructure = await this.parseDocument(file);
          extractedContent.documentStructure = docStructure;
          extractedContent.textContent =
            this.extractTextFromDocument(docStructure);
          extractedContent.extractionMethod = 'pdf-parse';
        }
      }

      // Image processing
      if (
        mergedOptions.analyzeImages &&
        this.supportedImageTypes.includes(file.type)
      ) {
        extractedContent.imageAnalysis = await this.analyzeImage(file);

        if (mergedOptions.performOCR) {
          extractedContent.ocrText = await this.performOCR(
            file,
            mergedOptions.language!
          );
          if (extractedContent.ocrText) {
            extractedContent.extractionMethod = 'ocr';
          }
        }
      }

      updates.extractedContent = extractedContent;

      // Generate AI prompt
      if (mergedOptions.generateAIPrompt) {
        updates.aiPrompt = await this.generateAIPrompt(
          file,
          extractedContent,
          updates.metadata
        );
      }

      updates.aiProcessingStatus = 'processed';
    } catch (error) {
      console.error('Error processing file:', error);
      updates.aiProcessingStatus = 'error';
      updates.error = `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return updates;
  }

  /**
   * Extract basic file metadata
   */
  private async extractMetadata(file: UploadedFile): Promise<FileMetadata> {
    const metadata: FileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      extension: this.getFileExtension(file.name),
      lastModified: new Date(file.file.lastModified),
      extractedAt: new Date(),
    };

    // Add content-specific metadata
    if (this.supportedTextTypes.includes(file.type)) {
      const text = await this.extractTextContent(file);
      if (text) {
        metadata.characterCount = text.length;
        metadata.wordCount = text
          .split(/\s+/)
          .filter(word => word.length > 0).length;
        metadata.language = this.detectLanguage(text);
      }
    }

    // Generate file hash for deduplication
    try {
      metadata.hash = await this.generateFileHash(file.file);
    } catch (error) {
      console.warn('Could not generate file hash:', error);
    }

    return metadata;
  }

  /**
   * Extract text content from text files
   */
  private async extractTextContent(file: UploadedFile): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const content = e.target?.result as string;
        resolve(content || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file content'));
      reader.readAsText(file.file);
    });
  }

  /**
   * Parse PDF documents
   */
  private async parseDocument(file: UploadedFile): Promise<DocumentStructure> {
    // Dynamic import to avoid bundle size issues
    const pdfParse = await import('pdf-parse').then(m => m.default);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const pdfData = await pdfParse(Buffer.from(buffer));

          const structure: DocumentStructure = {
            pageCount: pdfData.numpages,
            title: pdfData.info?.Title || undefined,
            author: pdfData.info?.Author || undefined,
            subject: pdfData.info?.Subject || undefined,
            keywords: pdfData.info?.Keywords
              ? pdfData.info.Keywords.split(',').map((k: string) => k.trim())
              : undefined,
            pages: [],
          };

          // Extract text by pages if possible
          const fullText = pdfData.text;
          if (fullText) {
            // Simple page splitting (in real implementation, you'd use a more sophisticated method)
            const estimatedTextPerPage = Math.ceil(
              fullText.length / pdfData.numpages
            );
            for (let i = 0; i < pdfData.numpages; i++) {
              const startIndex = i * estimatedTextPerPage;
              const endIndex = Math.min(
                (i + 1) * estimatedTextPerPage,
                fullText.length
              );
              structure.pages!.push({
                pageNumber: i + 1,
                text: fullText.substring(startIndex, endIndex),
              });
            }
          }

          resolve(structure);
        } catch (error) {
          reject(
            new Error(
              `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file.file);
    });
  }

  /**
   * Extract text from document structure
   */
  private extractTextFromDocument(docStructure: DocumentStructure): string {
    if (!docStructure.pages) return '';
    return docStructure.pages.map(page => page.text).join('\n\n');
  }

  /**
   * Analyze image content and extract metadata
   */
  private async analyzeImage(file: UploadedFile): Promise<ImageAnalysisData> {
    const analysis: ImageAnalysisData = {
      dimensions: { width: 0, height: 0 },
      format: file.type.split('/')[1] || 'unknown',
    };

    // Get image dimensions
    const dimensions = await this.getImageDimensions(file);
    analysis.dimensions = dimensions;

    // Extract EXIF data if available
    try {
      analysis.exifData = await this.extractExifData(file);
    } catch (error) {
      console.warn('Could not extract EXIF data:', error);
    }

    // Analyze colors (simplified implementation)
    try {
      analysis.dominantColors = await this.extractDominantColors(file);
    } catch (error) {
      console.warn('Could not extract dominant colors:', error);
    }

    return analysis;
  }

  /**
   * Perform OCR on image files
   */
  private async performOCR(
    file: UploadedFile,
    language: string
  ): Promise<string> {
    try {
      // Dynamic import to avoid bundle size issues
      const Tesseract = await import('tesseract.js');

      const {
        data: { text },
      } = await Tesseract.recognize(file.file, language, {
        logger: m => console.log(m), // Optional logging
      });

      return text.trim();
    } catch (error) {
      console.error('OCR failed:', error);
      throw new Error(
        `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract EXIF data from images
   */
  private async extractExifData(
    file: UploadedFile
  ): Promise<ExifData | undefined> {
    try {
      // Dynamic import
      const EXIFR = await import('exifr').then(m => m.default);

      const exifData = await EXIFR.parse(file.file);
      if (!exifData) return undefined;

      const extracted: ExifData = {};

      // Camera information
      if (exifData.Make && exifData.Model) {
        extracted.camera = `${exifData.Make} ${exifData.Model}`;
      }
      if (exifData.LensModel) {
        extracted.lens = exifData.LensModel;
      }

      // Camera settings
      extracted.settings = {};
      if (exifData.FNumber)
        extracted.settings.aperture = `f/${exifData.FNumber}`;
      if (exifData.ExposureTime)
        extracted.settings.shutter = `${exifData.ExposureTime}s`;
      if (exifData.ISO) extracted.settings.iso = exifData.ISO;
      if (exifData.FocalLength)
        extracted.settings.focalLength = `${exifData.FocalLength}mm`;

      // Location
      if (exifData.latitude && exifData.longitude) {
        extracted.location = {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
        };
      }

      // Timestamp
      if (exifData.DateTimeOriginal) {
        extracted.timestamp = new Date(exifData.DateTimeOriginal);
      }

      // Orientation
      if (exifData.Orientation) {
        extracted.orientation = exifData.Orientation;
      }

      return extracted;
    } catch (error) {
      console.warn('EXIF extraction failed:', error);
      return undefined;
    }
  }

  /**
   * Get image dimensions
   */
  private getImageDimensions(
    file: UploadedFile
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = file.url;
    });
  }

  /**
   * Extract dominant colors from image (simplified implementation)
   */
  private async extractDominantColors(file: UploadedFile): Promise<string[]> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = 100; // Small size for performance
        canvas.height = 100;

        ctx?.drawImage(img, 0, 0, 100, 100);

        // Simple color extraction (in production, use a proper color quantization algorithm)
        const imageData = ctx?.getImageData(0, 0, 100, 100);
        const colors: string[] = [];

        if (imageData) {
          // Sample every 10th pixel to get representative colors
          for (let i = 0; i < imageData.data.length; i += 40) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            colors.push(`rgb(${r}, ${g}, ${b})`);
          }
        }

        // Return unique colors (simplified)
        resolve([...new Set(colors)].slice(0, 5));
      };

      img.onerror = () => resolve([]);
      img.crossOrigin = 'anonymous';
      img.src = file.url;
    });
  }

  /**
   * Generate AI prompt from file content
   */
  async generateAIPrompt(
    file: UploadedFile,
    content: FileExtractedContent,
    metadata?: FileMetadata,
    options: FileToPromptOptions = {}
  ): Promise<string> {
    // Find appropriate template
    const template = options.template || this.findBestTemplate(file.type);

    if (!template) {
      return this.generateGenericPrompt(file, content, metadata, options);
    }

    // Prepare template variables
    const variables: Record<string, any> = {
      fileName: file.name,
      fileType: file.type,
      fileSize: this.formatFileSize(file.size),
    };

    // Add content
    if (options.includeContent !== false) {
      let textContent = content.textContent || content.ocrText || '';

      if (
        options.maxContentLength &&
        textContent.length > options.maxContentLength
      ) {
        textContent =
          textContent.substring(0, options.maxContentLength) + '...';
      }

      variables.content = textContent;
    }

    // Add metadata
    if (options.includeMetadata && metadata) {
      Object.assign(variables, {
        wordCount: metadata.wordCount,
        characterCount: metadata.characterCount,
        pages: metadata.pages,
        language: metadata.language,
      });
    }

    // Add image-specific variables
    if (content.imageAnalysis) {
      Object.assign(variables, {
        width: content.imageAnalysis.dimensions.width,
        height: content.imageAnalysis.dimensions.height,
        format: content.imageAnalysis.format,
      });
    }

    // Add document-specific variables
    if (content.documentStructure) {
      variables.pageCount = content.documentStructure.pageCount;
    }

    // Simple template replacement (in production, use a proper template engine)
    let prompt = template.template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      prompt = prompt.replace(regex, String(value || ''));
    }

    // Add context instructions if provided
    if (options.contextInstructions) {
      prompt = `${options.contextInstructions}\n\n${prompt}`;
    }

    return prompt;
  }

  /**
   * Find the best template for a file type
   */
  private findBestTemplate(fileType: string): AIPromptTemplate | undefined {
    return this.defaultPromptTemplates.find(template =>
      template.supportedFileTypes.includes(fileType)
    );
  }

  /**
   * Generate a generic prompt when no specific template is found
   */
  private generateGenericPrompt(
    file: UploadedFile,
    content: FileExtractedContent,
    metadata?: FileMetadata,
    options: FileToPromptOptions = {}
  ): string {
    let prompt = `Please analyze this file:\n\n`;
    prompt += `**File Information:**\n`;
    prompt += `- Name: ${file.name}\n`;
    prompt += `- Type: ${file.type}\n`;
    prompt += `- Size: ${this.formatFileSize(file.size)}\n`;

    if (metadata) {
      if (metadata.wordCount) prompt += `- Word Count: ${metadata.wordCount}\n`;
      if (metadata.pages) prompt += `- Pages: ${metadata.pages}\n`;
      if (metadata.language) prompt += `- Language: ${metadata.language}\n`;
    }

    if (
      options.includeContent !== false &&
      (content.textContent || content.ocrText)
    ) {
      prompt += `\n**Content:**\n`;
      let textContent = content.textContent || content.ocrText || '';

      if (
        options.maxContentLength &&
        textContent.length > options.maxContentLength
      ) {
        textContent =
          textContent.substring(0, options.maxContentLength) + '...';
      }

      prompt += textContent;
    }

    prompt += `\n\nPlease provide an analysis of this file's content and any relevant insights.`;

    return prompt;
  }

  /**
   * Utility functions
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private detectLanguage(text: string): string {
    // Simple language detection (in production, use a proper language detection library)
    const commonWords = {
      en: [
        'the',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'by',
      ],
      es: [
        'el',
        'la',
        'y',
        'o',
        'pero',
        'en',
        'por',
        'para',
        'de',
        'con',
        'por',
      ],
      fr: [
        'le',
        'la',
        'et',
        'ou',
        'mais',
        'dans',
        'sur',
        'pour',
        'de',
        'avec',
        'par',
      ],
      de: [
        'der',
        'die',
        'und',
        'oder',
        'aber',
        'in',
        'auf',
        'für',
        'von',
        'mit',
        'durch',
      ],
    };

    const words = text.toLowerCase().split(/\s+/).slice(0, 100);
    let bestLang = 'en';
    let bestScore = 0;

    for (const [lang, wordList] of Object.entries(commonWords) as [
      string,
      string[],
    ][]) {
      const score = words.filter(word => wordList.includes(word)).length;
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }

    return bestLang;
  }

  /**
   * Get available prompt templates
   */
  getPromptTemplates(): AIPromptTemplate[] {
    return [...this.defaultPromptTemplates];
  }

  /**
   * Add custom prompt template
   */
  addPromptTemplate(template: AIPromptTemplate): void {
    this.defaultPromptTemplates.push(template);
  }
}
