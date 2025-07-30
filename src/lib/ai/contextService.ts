import {
  ConversationContext,
  ContextRule,
  ContextSummary,
  ChatMessage
} from './types';
import { aiService } from './aiService';

const CONTEXT_CONFIGS_KEY = 'ai_context_configs';
const CONTEXT_SUMMARIES_KEY = 'ai_context_summaries';

// Default context configurations
const DEFAULT_CONTEXT_CONFIGS: Record<string, ConversationContext> = {
  balanced: {
    id: 'balanced',
    conversationId: '',
    windowSize: 20,
    compressionStrategy: 'selective',
    priority: [
      {
        type: 'system',
        weight: 1.0,
        rules: [
          { condition: 'message_role', operator: 'equals', value: 'system', action: 'keep' }
        ]
      },
      {
        type: 'user',
        weight: 0.8,
        rules: [
          { condition: 'message_age', operator: 'less_than', value: 5, action: 'keep' },
          { condition: 'message_length', operator: 'greater_than', value: 20, action: 'keep' }
        ]
      },
      {
        type: 'assistant',
        weight: 0.7,
        rules: [
          { condition: 'message_age', operator: 'less_than', value: 3, action: 'keep' },
          { condition: 'importance_score', operator: 'greater_than', value: 0.7, action: 'keep' }
        ]
      }
    ],
    metadata: {
      totalTokens: 0,
      contextTokens: 0,
      compressionRatio: 0
    }
  },
  
  performance: {
    id: 'performance',
    conversationId: '',
    windowSize: 10,
    compressionStrategy: 'truncate',
    priority: [
      {
        type: 'system',
        weight: 1.0,
        rules: [
          { condition: 'message_role', operator: 'equals', value: 'system', action: 'keep' }
        ]
      },
      {
        type: 'user',
        weight: 0.9,
        rules: [
          { condition: 'message_age', operator: 'less_than', value: 3, action: 'keep' }
        ]
      },
      {
        type: 'assistant',
        weight: 0.5,
        rules: [
          { condition: 'message_age', operator: 'less_than', value: 2, action: 'keep' }
        ]
      }
    ],
    metadata: {
      totalTokens: 0,
      contextTokens: 0,
      compressionRatio: 0
    }
  },

  comprehensive: {
    id: 'comprehensive',
    conversationId: '',
    windowSize: 50,
    compressionStrategy: 'summarize',
    priority: [
      {
        type: 'system',
        weight: 1.0,
        rules: [
          { condition: 'message_role', operator: 'equals', value: 'system', action: 'keep' }
        ]
      },
      {
        type: 'user',
        weight: 0.8,
        rules: [
          { condition: 'message_age', operator: 'less_than', value: 10, action: 'keep' },
          { condition: 'keyword_presence', operator: 'contains', value: ['important', 'key', 'remember'], action: 'keep' }
        ]
      },
      {
        type: 'assistant',
        weight: 0.7,
        rules: [
          { condition: 'message_age', operator: 'less_than', value: 8, action: 'keep' },
          { condition: 'message_length', operator: 'greater_than', value: 50, action: 'summarize' }
        ]
      }
    ],
    metadata: {
      totalTokens: 0,
      contextTokens: 0,
      compressionRatio: 0
    }
  }
};

export class ContextService {
  private storage = localStorage;

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateImportanceScore(message: ChatMessage, position: number, totalMessages: number): number {
    let score = 0.5; // Base score

    // Recency factor (more recent = higher score)
    const recencyFactor = Math.max(0, (totalMessages - position) / totalMessages);
    score += recencyFactor * 0.3;

    // Length factor (longer messages often more important)
    const lengthFactor = Math.min(1, message.content.length / 200);
    score += lengthFactor * 0.2;

    // Role factor
    switch (message.role) {
      case 'system':
        score += 0.3;
        break;
      case 'user':
        score += 0.1;
        break;
      case 'assistant':
        score += 0.05;
        break;
    }

    // Keyword presence
    const importantKeywords = ['important', 'key', 'remember', 'note', 'crucial', 'critical'];
    const hasImportantKeywords = importantKeywords.some(keyword => 
      message.content.toLowerCase().includes(keyword)
    );
    if (hasImportantKeywords) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  private evaluateRule(rule: ContextRule, message: ChatMessage, messageIndex: number, totalMessages: number): boolean {
    const messageAge = totalMessages - messageIndex;

    switch (rule.condition) {
      case 'message_role':
        return this.compareValues(message.role, rule.operator, rule.value);

      case 'message_age':
        return this.compareValues(messageAge, rule.operator, rule.value);

      case 'message_length':
        return this.compareValues(message.content.length, rule.operator, rule.value);

      case 'keyword_presence':
        if (rule.operator === 'contains' && Array.isArray(rule.value)) {
          return rule.value.some(keyword => 
            message.content.toLowerCase().includes(keyword.toLowerCase())
          );
        }
        return false;

      case 'importance_score':
        const score = this.calculateImportanceScore(message, messageIndex, totalMessages);
        return this.compareValues(score, rule.operator, rule.value);

      default:
        return false;
    }
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        return String(actual).toLowerCase().includes(String(expected).toLowerCase());
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'in_range':
        if (Array.isArray(expected) && expected.length === 2) {
          return Number(actual) >= Number(expected[0]) && Number(actual) <= Number(expected[1]);
        }
        return false;
      default:
        return false;
    }
  }

  private determineMessageAction(
    message: ChatMessage,
    messageIndex: number,
    totalMessages: number,
    context: ConversationContext
  ): 'keep' | 'summarize' | 'remove' {
    const relevantPriority = context.priority.find(p => p.type === message.role);
    if (!relevantPriority) {
      return 'remove';
    }

    for (const rule of relevantPriority.rules) {
      if (this.evaluateRule(rule, message, messageIndex, totalMessages)) {
        return rule.action;
      }
    }

    // Default action based on priority weight and position
    const positionFactor = (totalMessages - messageIndex) / totalMessages;
    const keepThreshold = relevantPriority.weight * positionFactor;

    if (keepThreshold > 0.7) return 'keep';
    if (keepThreshold > 0.4) return 'summarize';
    return 'remove';
  }

  async optimizeContext(
    messages: ChatMessage[],
    maxTokens: number,
    contextConfig?: ConversationContext
  ): Promise<{
    optimizedMessages: ChatMessage[];
    summary: ContextSummary;
    tokensUsed: number;
  }> {
    const config = contextConfig || DEFAULT_CONTEXT_CONFIGS.balanced;
    const totalMessages = messages.length;
    
    // Calculate current token usage
    const totalTokens = messages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);

    if (totalTokens <= maxTokens) {
      // No optimization needed
      return {
        optimizedMessages: messages,
        summary: {
          originalMessageCount: totalMessages,
          summarizedContent: '',
          retainedMessages: messages,
          compressionRatio: 1.0,
          generatedAt: Date.now()
        },
        tokensUsed: totalTokens
      };
    }

    const optimizedMessages: ChatMessage[] = [];
    const messagesToSummarize: ChatMessage[] = [];
    let currentTokens = 0;

    // Apply context optimization strategy
    switch (config.compressionStrategy) {
      case 'truncate':
        return this.optimizeByTruncation(messages, maxTokens, config);

      case 'selective':
        return this.optimizeBySelection(messages, maxTokens, config);

      case 'summarize':
        return this.optimizeBySummarization(messages, maxTokens, config);

      case 'none':
      default:
        // Keep recent messages within token limit
        for (let i = messages.length - 1; i >= 0; i--) {
          const messageTokens = this.estimateTokens(messages[i].content);
          if (currentTokens + messageTokens <= maxTokens) {
            optimizedMessages.unshift(messages[i]);
            currentTokens += messageTokens;
          } else {
            break;
          }
        }
        break;
    }

    const summary: ContextSummary = {
      originalMessageCount: totalMessages,
      summarizedContent: messagesToSummarize.length > 0 ? 
        `Summarized ${messagesToSummarize.length} earlier messages` : '',
      retainedMessages: optimizedMessages,
      compressionRatio: optimizedMessages.length / totalMessages,
      generatedAt: Date.now()
    };

    return {
      optimizedMessages,
      summary,
      tokensUsed: currentTokens
    };
  }

  private async optimizeByTruncation(
    messages: ChatMessage[],
    maxTokens: number,
    _config: ConversationContext
  ): Promise<{
    optimizedMessages: ChatMessage[];
    summary: ContextSummary;
    tokensUsed: number;
  }> {
    const optimizedMessages: ChatMessage[] = [];
    let currentTokens = 0;

    // Keep system messages first
    for (const message of messages) {
      if (message.role === 'system') {
        const messageTokens = this.estimateTokens(message.content);
        if (currentTokens + messageTokens <= maxTokens) {
          optimizedMessages.push(message);
          currentTokens += messageTokens;
        }
      }
    }

    // Add recent messages up to limit
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== 'system') {
        const messageTokens = this.estimateTokens(message.content);
        if (currentTokens + messageTokens <= maxTokens) {
          optimizedMessages.splice(-1, 0, message); // Insert before system messages
          currentTokens += messageTokens;
        } else {
          break;
        }
      }
    }

    const summary: ContextSummary = {
      originalMessageCount: messages.length,
      summarizedContent: '',
      retainedMessages: optimizedMessages,
      compressionRatio: optimizedMessages.length / messages.length,
      generatedAt: Date.now()
    };

    return {
      optimizedMessages,
      summary,
      tokensUsed: currentTokens
    };
  }

  private async optimizeBySelection(
    messages: ChatMessage[],
    maxTokens: number,
    config: ConversationContext
  ): Promise<{
    optimizedMessages: ChatMessage[];
    summary: ContextSummary;
    tokensUsed: number;
  }> {
    const messageActions = messages.map((message, index) => ({
      message,
      action: this.determineMessageAction(message, index, messages.length, config),
      importance: this.calculateImportanceScore(message, index, messages.length),
      tokens: this.estimateTokens(message.content)
    }));

    // Sort by importance for selective inclusion
    const prioritizedMessages = messageActions
      .filter(item => item.action === 'keep')
      .sort((a, b) => b.importance - a.importance);

    const optimizedMessages: ChatMessage[] = [];
    let currentTokens = 0;

    // Include messages by priority until token limit
    for (const item of prioritizedMessages) {
      if (currentTokens + item.tokens <= maxTokens) {
        optimizedMessages.push(item.message);
        currentTokens += item.tokens;
      }
    }

    // Sort final messages by original order
    optimizedMessages.sort((a, b) => {
      const aIndex = messages.findIndex(m => m.id === a.id);
      const bIndex = messages.findIndex(m => m.id === b.id);
      return aIndex - bIndex;
    });

    const summary: ContextSummary = {
      originalMessageCount: messages.length,
      summarizedContent: '',
      retainedMessages: optimizedMessages,
      compressionRatio: optimizedMessages.length / messages.length,
      generatedAt: Date.now()
    };

    return {
      optimizedMessages,
      summary,
      tokensUsed: currentTokens
    };
  }

  private async optimizeBySummarization(
    messages: ChatMessage[],
    maxTokens: number,
    config: ConversationContext
  ): Promise<{
    optimizedMessages: ChatMessage[];
    summary: ContextSummary;
    tokensUsed: number;
  }> {
    const recentMessages = messages.slice(-config.windowSize);
    const olderMessages = messages.slice(0, -config.windowSize);

    let currentTokens = recentMessages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);

    if (currentTokens <= maxTokens) {
      if (olderMessages.length === 0) {
        return this.optimizeBySelection(messages, maxTokens, config);
      }

      // Summarize older messages
      try {
        const conversationText = olderMessages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        const summaryPrompt = `Please provide a concise summary of the following conversation history, focusing on key points, decisions, and context that would be important for continuing the conversation:\n\n${conversationText}`;

        const response = await aiService.generateText(summaryPrompt, {
          maxTokens: Math.floor(maxTokens * 0.2), // Use 20% of tokens for summary
          temperature: 0.3
        });

        const summaryMessage: ChatMessage = {
          id: `summary-${Date.now()}`,
          role: 'system',
          content: `[Previous conversation summary: ${response.text}]`,
          timestamp: Date.now()
        };

        const optimizedMessages = [summaryMessage, ...recentMessages];
        currentTokens += this.estimateTokens(summaryMessage.content);

        const summary: ContextSummary = {
          originalMessageCount: messages.length,
          summarizedContent: response.text,
          retainedMessages: recentMessages,
          compressionRatio: optimizedMessages.length / messages.length,
          generatedAt: Date.now()
        };

        return {
          optimizedMessages,
          summary,
          tokensUsed: currentTokens
        };
      } catch (error) {
        console.error('Failed to generate summary, falling back to truncation:', error);
        return this.optimizeByTruncation(messages, maxTokens, config);
      }
    }

    // If even recent messages exceed limit, fall back to selection
    return this.optimizeBySelection(recentMessages, maxTokens, config);
  }

  async getContextConfig(conversationId: string): Promise<ConversationContext | null> {
    try {
      const stored = this.storage.getItem(CONTEXT_CONFIGS_KEY);
      const configs: Record<string, ConversationContext> = stored ? JSON.parse(stored) : {};
      return configs[conversationId] || null;
    } catch (error) {
      console.error('Error loading context config:', error);
      return null;
    }
  }

  async saveContextConfig(config: ConversationContext): Promise<void> {
    try {
      const stored = this.storage.getItem(CONTEXT_CONFIGS_KEY);
      const configs: Record<string, ConversationContext> = stored ? JSON.parse(stored) : {};
      configs[config.conversationId] = config;
      this.storage.setItem(CONTEXT_CONFIGS_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('Error saving context config:', error);
      throw new Error('Failed to save context configuration');
    }
  }

  async createContextConfig(
    conversationId: string,
    template: keyof typeof DEFAULT_CONTEXT_CONFIGS = 'balanced'
  ): Promise<ConversationContext> {
    const baseConfig = DEFAULT_CONTEXT_CONFIGS[template];
    const config: ConversationContext = {
      ...baseConfig,
      id: `${conversationId}-${template}`,
      conversationId
    };

    await this.saveContextConfig(config);
    return config;
  }

  getDefaultContextConfigs(): Record<string, ConversationContext> {
    return { ...DEFAULT_CONTEXT_CONFIGS };
  }

  async updateContextMetadata(
    conversationId: string,
    metadata: Partial<ConversationContext['metadata']>
  ): Promise<void> {
    const config = await this.getContextConfig(conversationId);
    if (config) {
      config.metadata = { ...config.metadata, ...metadata };
      await this.saveContextConfig(config);
    }
  }

  async getContextSummary(conversationId: string): Promise<ContextSummary | null> {
    try {
      const stored = this.storage.getItem(CONTEXT_SUMMARIES_KEY);
      const summaries: Record<string, ContextSummary> = stored ? JSON.parse(stored) : {};
      return summaries[conversationId] || null;
    } catch (error) {
      console.error('Error loading context summary:', error);
      return null;
    }
  }

  async saveContextSummary(conversationId: string, summary: ContextSummary): Promise<void> {
    try {
      const stored = this.storage.getItem(CONTEXT_SUMMARIES_KEY);
      const summaries: Record<string, ContextSummary> = stored ? JSON.parse(stored) : {};
      summaries[conversationId] = summary;
      this.storage.setItem(CONTEXT_SUMMARIES_KEY, JSON.stringify(summaries));
    } catch (error) {
      console.error('Error saving context summary:', error);
    }
  }
}

export const contextService = new ContextService(); 