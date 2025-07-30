import {
  ConversationExport,
  ExportOptions,
  ImportResult,
  Conversation,
  ChatMessage,
  AIProviderType
} from './types';
import { conversationStorage } from './conversationStorage';

export class ExportImportService {
  
  async exportConversation(
    conversationId: string,
    options: ExportOptions
  ): Promise<string | Blob> {
    const conversation = await conversationStorage.getConversation(conversationId);
    const thread = await conversationStorage.getThread(conversationId);
    
    if (!conversation || !thread) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    let messages = thread.messages;

    // Apply filters
    if (options.dateRange) {
      messages = messages.filter(msg => 
        msg.timestamp && 
        msg.timestamp >= options.dateRange!.start && 
        msg.timestamp <= options.dateRange!.end
      );
    }

    if (options.messageFilter) {
      const { roles, minLength, maxLength } = options.messageFilter;
      messages = messages.filter(msg => {
        if (roles && !roles.includes(msg.role)) return false;
        if (minLength && msg.content.length < minLength) return false;
        if (maxLength && msg.content.length > maxLength) return false;
        return true;
      });
    }

    if (!options.includeSystemMessages) {
      messages = messages.filter(msg => msg.role !== 'system');
    }

    // Calculate metadata
    const metadata = this.calculateExportMetadata(messages, conversation);

    const exportData: ConversationExport = {
      version: '2.0',
      exportedAt: Date.now(),
      format: options.format,
      conversation,
      messages,
      metadata
    };

    // Generate export based on format
    switch (options.format) {
      case 'json':
        return this.exportAsJSON(exportData, options);
      case 'markdown':
        return this.exportAsMarkdown(exportData, options);
      case 'txt':
        return this.exportAsText(exportData, options);
      case 'csv':
        return this.exportAsCSV(exportData, options);
      case 'pdf':
        return this.exportAsPDF(exportData, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private calculateExportMetadata(messages: ChatMessage[], conversation: Conversation) {
    const totalTokens = messages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);
    
    const providerDistribution: Record<AIProviderType, number> = {
      openai: 0,
      huggingface: 0
    };

    // Count messages by provider (simplified - would need message-level provider tracking)
    providerDistribution[conversation.provider] = messages.length;

    const responseTimes: number[] = [];
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant' && messages[i-1].role === 'user') {
        const timeDiff = (messages[i].timestamp || 0) - (messages[i-1].timestamp || 0);
        if (timeDiff > 0 && timeDiff < 300000) { // Less than 5 minutes
          responseTimes.push(timeDiff);
        }
      }
    }

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      totalTokens,
      totalCost: 0, // Would need cost calculation based on model and tokens
      averageResponseTime,
      providerDistribution
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private exportAsJSON(exportData: ConversationExport, options: ExportOptions): string {
    if (options.includeMetadata) {
      return JSON.stringify(exportData, null, 2);
    } else {
      const simplifiedData = {
        conversation: exportData.conversation,
        messages: exportData.messages
      };
      return JSON.stringify(simplifiedData, null, 2);
    }
  }

  private exportAsMarkdown(exportData: ConversationExport, options: ExportOptions): string {
    let markdown = '';
    
    // Header
    markdown += `# ${exportData.conversation.title}\n\n`;
    
    if (options.includeMetadata) {
      markdown += `**Created:** ${new Date(exportData.conversation.createdAt).toLocaleString()}\n`;
      markdown += `**Provider:** ${exportData.conversation.provider}\n`;
      if (exportData.conversation.model) {
        markdown += `**Model:** ${exportData.conversation.model}\n`;
      }
      markdown += `**Messages:** ${exportData.messages.length}\n`;
      markdown += `**Estimated Tokens:** ${exportData.metadata.totalTokens}\n\n`;
      markdown += '---\n\n';
    }

    // Messages
    exportData.messages.forEach(message => {
      const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
      markdown += `## ${role}\n\n`;
      
      if (options.includeTimestamps && message.timestamp) {
        markdown += `*${new Date(message.timestamp).toLocaleString()}*\n\n`;
      }
      
      markdown += `${message.content}\n\n`;
    });

    return markdown;
  }

  private exportAsText(exportData: ConversationExport, options: ExportOptions): string {
    let text = '';
    
    // Header
    text += `${exportData.conversation.title}\n`;
    text += '='.repeat(exportData.conversation.title.length) + '\n\n';
    
    if (options.includeMetadata) {
      text += `Created: ${new Date(exportData.conversation.createdAt).toLocaleString()}\n`;
      text += `Provider: ${exportData.conversation.provider}\n`;
      if (exportData.conversation.model) {
        text += `Model: ${exportData.conversation.model}\n`;
      }
      text += `Messages: ${exportData.messages.length}\n`;
      text += `Estimated Tokens: ${exportData.metadata.totalTokens}\n\n`;
      text += '-'.repeat(50) + '\n\n';
    }

    // Messages
    exportData.messages.forEach((message) => {
      const role = message.role.toUpperCase();
      text += `[${role}]`;
      
      if (options.includeTimestamps && message.timestamp) {
        text += ` ${new Date(message.timestamp).toLocaleString()}`;
      }
      
      text += '\n';
      text += message.content + '\n\n';
    });

    return text;
  }

  private exportAsCSV(exportData: ConversationExport, options: ExportOptions): string {
    let csv = '';
    
    // Headers
    const headers = ['Role', 'Content'];
    if (options.includeTimestamps) headers.push('Timestamp');
    if (options.includeMetadata) headers.push('Length', 'Tokens');
    
    csv += headers.join(',') + '\n';

    // Data rows
    exportData.messages.forEach(message => {
      const row = [
        `"${message.role}"`,
        `"${message.content.replace(/"/g, '""')}"` // Escape quotes
      ];
      
      if (options.includeTimestamps) {
        row.push(message.timestamp ? new Date(message.timestamp).toISOString() : '');
      }
      
      if (options.includeMetadata) {
        row.push(String(message.content.length));
        row.push(String(this.estimateTokens(message.content)));
      }
      
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  private exportAsPDF(exportData: ConversationExport, options: ExportOptions): string {
    // For now, return HTML that can be printed to PDF
    // In a real implementation, you'd use a PDF library like jsPDF or Puppeteer
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${exportData.conversation.title}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .message { margin: 20px 0; padding: 15px; border-left: 4px solid #ccc; }
          .user { border-left-color: #007bff; }
          .assistant { border-left-color: #28a745; }
          .system { border-left-color: #ffc107; }
          .role { font-weight: bold; color: #666; margin-bottom: 5px; }
          .timestamp { font-size: 0.8em; color: #999; }
          .content { line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>${exportData.conversation.title}</h1>
    `;

    if (options.includeMetadata) {
      html += `
        <div class="metadata">
          <strong>Created:</strong> ${new Date(exportData.conversation.createdAt).toLocaleString()}<br>
          <strong>Provider:</strong> ${exportData.conversation.provider}<br>
          ${exportData.conversation.model ? `<strong>Model:</strong> ${exportData.conversation.model}<br>` : ''}
          <strong>Messages:</strong> ${exportData.messages.length}<br>
          <strong>Estimated Tokens:</strong> ${exportData.metadata.totalTokens}
        </div>
      `;
    }

    exportData.messages.forEach(message => {
      html += `
        <div class="message ${message.role}">
          <div class="role">${message.role.charAt(0).toUpperCase() + message.role.slice(1)}</div>
          ${options.includeTimestamps && message.timestamp ? 
            `<div class="timestamp">${new Date(message.timestamp).toLocaleString()}</div>` : ''}
          <div class="content">${message.content.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    });

    html += `
      </body>
      </html>
    `;

    return html;
  }

  async importConversation(
    data: string | File,
    format: 'json' | 'markdown' | 'txt' | 'csv'
  ): Promise<ImportResult> {
    let content: string;

    if (data instanceof File) {
      content = await this.readFileContent(data);
    } else {
      content = data;
    }

    const result: ImportResult = {
      success: false,
      errors: [],
      warnings: [],
      metadata: {
        totalMessages: 0,
        skippedMessages: 0,
        estimatedTokens: 0
      }
    };

    try {
      let parsedData: {
        conversation?: Conversation;
        messages: ChatMessage[];
      };

      switch (format) {
        case 'json':
          parsedData = this.parseJSONImport(content);
          break;
        case 'markdown':
          parsedData = this.parseMarkdownImport(content);
          break;
        case 'txt':
          parsedData = this.parseTextImport(content);
          break;
        case 'csv':
          parsedData = this.parseCSVImport(content);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate and clean messages
      const validMessages = this.validateAndCleanMessages(parsedData.messages, result);

      if (validMessages.length === 0) {
        result.errors.push('No valid messages found in import data');
        return result;
      }

      // Create conversation
      const conversationData = parsedData.conversation || {
        title: this.generateConversationTitle(validMessages[0]?.content || 'Imported Conversation'),
        provider: 'openai' as AIProviderType,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: validMessages.length
      };

      // Import conversation
      const conversationId = await conversationStorage.importConversation({
        conversation: conversationData,
        thread: {
          messages: validMessages
        },
        exportedAt: Date.now(),
        version: '2.0'
      });

      result.success = true;
      result.conversationId = conversationId;
      result.metadata.totalMessages = validMessages.length;
      result.metadata.estimatedTokens = validMessages.reduce(
        (sum, msg) => sum + this.estimateTokens(msg.content), 
        0
      );

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown import error');
    }

    return result;
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private parseJSONImport(content: string): { conversation?: Conversation; messages: ChatMessage[] } {
    const data = JSON.parse(content);

    // Handle different JSON structures
    if (data.messages && Array.isArray(data.messages)) {
      return {
        conversation: data.conversation,
        messages: data.messages
      };
    } else if (data.thread && data.thread.messages) {
      return {
        conversation: data.conversation,
        messages: data.thread.messages
      };
    } else if (Array.isArray(data)) {
      return { messages: data };
    } else {
      throw new Error('Invalid JSON structure for conversation import');
    }
  }

  private parseMarkdownImport(content: string): { messages: ChatMessage[] } {
    const messages: ChatMessage[] = [];
    const sections = content.split(/^## /m).filter(section => section.trim());

    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      const roleLine = lines[0];
      
      let role: 'user' | 'assistant' | 'system' = 'user';
      if (roleLine.toLowerCase().includes('assistant')) role = 'assistant';
      else if (roleLine.toLowerCase().includes('system')) role = 'system';

      const contentLines = lines.slice(1).filter(line => 
        !line.match(/^\*.*\*$/) // Skip timestamp lines
      );
      
      const content = contentLines.join('\n').trim();
      
      if (content) {
        messages.push({
          id: `imported-${Date.now()}-${index}`,
          role,
          content,
          timestamp: Date.now()
        });
      }
    });

    return { messages };
  }

  private parseTextImport(content: string): { messages: ChatMessage[] } {
    const messages: ChatMessage[] = [];
    const sections = content.split(/\[(?:USER|ASSISTANT|SYSTEM)\]/i).filter(section => section.trim());
    
    // Find role markers
    const roleMatches = content.match(/\[(?:USER|ASSISTANT|SYSTEM)\]/gi) || [];
    
    sections.forEach((section, index) => {
      if (index === 0 && !roleMatches[0]) return; // Skip header section
      
      const roleMatch = roleMatches[index - (roleMatches[0] ? 1 : 0)];
      if (!roleMatch) return;
      
      let role: 'user' | 'assistant' | 'system' = 'user';
      const roleText = roleMatch.toLowerCase();
      if (roleText.includes('assistant')) role = 'assistant';
      else if (roleText.includes('system')) role = 'system';
      
      const content = section.trim();
      if (content) {
        messages.push({
          id: `imported-${Date.now()}-${index}`,
          role,
          content,
          timestamp: Date.now()
        });
      }
    });

    return { messages };
  }

  private parseCSVImport(content: string): { messages: ChatMessage[] } {
    const lines = content.split('\n').filter(line => line.trim());
    const messages: ChatMessage[] = [];
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least header and one data row');
    }
    
    const headers = this.parseCSVLine(lines[0]);
    const roleIndex = headers.findIndex(h => h.toLowerCase().includes('role'));
    const contentIndex = headers.findIndex(h => h.toLowerCase().includes('content'));
    
    if (roleIndex === -1 || contentIndex === -1) {
      throw new Error('CSV must have Role and Content columns');
    }
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.length > Math.max(roleIndex, contentIndex)) {
          const roleText = values[roleIndex].toLowerCase();
          let role: 'user' | 'assistant' | 'system' = 'user';
          if (roleText.includes('assistant')) role = 'assistant';
          else if (roleText.includes('system')) role = 'system';
          
          const content = values[contentIndex];
          if (content.trim()) {
            messages.push({
              id: `imported-${Date.now()}-${i}`,
              role,
              content: content.trim(),
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.warn(`Error parsing CSV line ${i + 1}:`, error);
      }
    }
    
    return { messages };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private validateAndCleanMessages(messages: any[], result: ImportResult): ChatMessage[] {
    const validMessages: ChatMessage[] = [];
    
    messages.forEach((msg, index) => {
      try {
        // Validate required fields
        if (!msg.content || typeof msg.content !== 'string') {
          result.warnings.push(`Message ${index + 1}: Missing or invalid content`);
          result.metadata.skippedMessages++;
          return;
        }
        
        // Validate role
        let role: 'user' | 'assistant' | 'system' = 'user';
        if (msg.role && ['user', 'assistant', 'system'].includes(msg.role)) {
          role = msg.role;
        } else {
          result.warnings.push(`Message ${index + 1}: Invalid role, defaulting to 'user'`);
        }
        
        // Clean content
        const content = msg.content.trim();
        if (content.length === 0) {
          result.warnings.push(`Message ${index + 1}: Empty content, skipping`);
          result.metadata.skippedMessages++;
          return;
        }
        
        validMessages.push({
          id: msg.id || `imported-${Date.now()}-${index}`,
          role,
          content,
          timestamp: msg.timestamp || Date.now()
        });
        
      } catch (error) {
        result.warnings.push(`Message ${index + 1}: Validation error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.metadata.skippedMessages++;
      }
    });
    
    return validMessages;
  }

  private generateConversationTitle(firstMessage: string): string {
    const cleanMessage = firstMessage.replace(/^\s+|\s+$/g, '').replace(/\n+/g, ' ');
    const maxLength = 50;
    if (cleanMessage.length <= maxLength) {
      return cleanMessage;
    }
    return cleanMessage.substring(0, maxLength).replace(/\s+\w*$/, '') + '...';
  }

  async exportMultipleConversations(
    conversationIds: string[],
    options: ExportOptions
  ): Promise<string | Blob> {
    const exports: ConversationExport[] = [];
    
    for (const id of conversationIds) {
      try {
        const exportData = await this.exportConversation(id, { ...options, format: 'json' }) as string;
        exports.push(JSON.parse(exportData));
      } catch (error) {
        console.error(`Failed to export conversation ${id}:`, error);
      }
    }
    
         const multiExport = {
       version: '2.0',
       exportedAt: Date.now(),
       format: options.format,
       conversations: exports,
       metadata: {
         totalConversations: exports.length,
         totalMessages: exports.reduce((sum, exp) => sum + exp.messages.length, 0),
         totalTokens: exports.reduce((sum, exp) => sum + (exp.metadata?.totalTokens || 0), 0)
       }
     };
    
    return JSON.stringify(multiExport, null, 2);
  }

  async createExportBlob(content: string, format: ExportOptions['format']): Promise<Blob> {
    const mimeTypes = {
      json: 'application/json',
      markdown: 'text/markdown',
      txt: 'text/plain',
      csv: 'text/csv',
      pdf: 'text/html' // Since we're returning HTML for PDF
    };
    
    return new Blob([content], { type: mimeTypes[format] });
  }

  async downloadExport(
    conversationId: string,
    options: ExportOptions,
    filename?: string
  ): Promise<void> {
    const content = await this.exportConversation(conversationId, options);
    const conversation = await conversationStorage.getConversation(conversationId);
    
    const defaultFilename = filename || 
      `${conversation?.title.replace(/[^a-zA-Z0-9]/g, '_') || 'conversation'}_${Date.now()}.${options.format}`;
    
    if (typeof content === 'string') {
      const blob = await this.createExportBlob(content, options.format);
      this.triggerDownload(blob, defaultFilename);
    } else {
      this.triggerDownload(content, defaultFilename);
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const exportImportService = new ExportImportService(); 