import {
  Conversation,
  ConversationThread,
  ConversationStorage,
  ConversationSummary,
  ConversationFilter,
  ChatMessage,
  AIProviderType
} from './types';

// Storage keys
const CONVERSATIONS_KEY = 'ai_conversations';
const THREADS_KEY = 'ai_conversation_threads';
const CONVERSATION_INDEX_KEY = 'ai_conversation_index';

// Utility functions
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const generateTitle = (firstMessage: string): string => {
  const cleanMessage = firstMessage.replace(/^\s+|\s+$/g, '').replace(/\n+/g, ' ');
  const maxLength = 50;
  if (cleanMessage.length <= maxLength) {
    return cleanMessage;
  }
  return cleanMessage.substring(0, maxLength).replace(/\s+\w*$/, '') + '...';
};

export class LocalStorageConversationStorage implements ConversationStorage {
  private async getStorageItem<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key ${key}:`, error);
      return null;
    }
  }

  private async setStorageItem<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key ${key}:`, error);
      throw new Error(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateConversationIndex(conversation: Conversation): Promise<void> {
    const index = await this.getStorageItem<Record<string, ConversationSummary>>(CONVERSATION_INDEX_KEY) || {};
    
    index[conversation.id] = {
      id: conversation.id,
      title: conversation.title,
      lastMessage: conversation.lastMessage || '',
      messageCount: conversation.messageCount,
      updatedAt: conversation.updatedAt,
      provider: conversation.provider,
      starred: conversation.starred,
      archived: conversation.archived
    };

    await this.setStorageItem(CONVERSATION_INDEX_KEY, index);
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    const conversations = await this.getStorageItem<Record<string, Conversation>>(CONVERSATIONS_KEY) || {};
    conversations[conversation.id] = conversation;
    
    await this.setStorageItem(CONVERSATIONS_KEY, conversations);
    await this.updateConversationIndex(conversation);
  }

  async saveThread(thread: ConversationThread): Promise<void> {
    const threads = await this.getStorageItem<Record<string, ConversationThread>>(THREADS_KEY) || {};
    threads[thread.conversationId] = thread;
    
    await this.setStorageItem(THREADS_KEY, threads);

    // Update conversation with latest info
    const conversation = await this.getConversation(thread.conversationId);
    if (conversation) {
      const lastMessage = thread.messages.length > 0 ? 
        thread.messages[thread.messages.length - 1].content : '';
      
      await this.updateConversation(thread.conversationId, {
        updatedAt: thread.updatedAt,
        messageCount: thread.messages.length,
        lastMessage: lastMessage.length > 100 ? lastMessage.substring(0, 100) + '...' : lastMessage
      });
    }
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    if (!message.conversationId) {
      throw new Error('Message must have a conversationId');
    }

    const thread = await this.getThread(message.conversationId);
    if (!thread) {
      throw new Error(`Conversation thread ${message.conversationId} not found`);
    }

    // Add message to thread
    const updatedThread: ConversationThread = {
      ...thread,
      messages: [...thread.messages, {
        ...message,
        id: message.id || generateId(),
        timestamp: message.timestamp || Date.now()
      }],
      updatedAt: Date.now()
    };

    await this.saveThread(updatedThread);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const conversations = await this.getStorageItem<Record<string, Conversation>>(CONVERSATIONS_KEY);
    return conversations?.[id] || null;
  }

  async getThread(conversationId: string): Promise<ConversationThread | null> {
    const threads = await this.getStorageItem<Record<string, ConversationThread>>(THREADS_KEY);
    return threads?.[conversationId] || null;
  }

  async getConversations(filter?: ConversationFilter): Promise<ConversationSummary[]> {
    const index = await this.getStorageItem<Record<string, ConversationSummary>>(CONVERSATION_INDEX_KEY) || {};
    let conversations = Object.values(index);

    // Apply filters
    if (filter) {
      if (filter.provider) {
        conversations = conversations.filter(c => c.provider === filter.provider);
      }

      if (filter.starred !== undefined) {
        conversations = conversations.filter(c => c.starred === filter.starred);
      }

      if (filter.archived !== undefined) {
        conversations = conversations.filter(c => c.archived === filter.archived);
      }

      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        conversations = conversations.filter(c => 
          c.title.toLowerCase().includes(searchTerm) ||
          c.lastMessage.toLowerCase().includes(searchTerm)
        );
      }

      if (filter.dateRange) {
        conversations = conversations.filter(c => 
          c.updatedAt >= filter.dateRange!.start &&
          c.updatedAt <= filter.dateRange!.end
        );
      }
    }

    // Sort by updatedAt (most recent first)
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteConversation(id: string): Promise<void> {
    // Delete from conversations
    const conversations = await this.getStorageItem<Record<string, Conversation>>(CONVERSATIONS_KEY) || {};
    delete conversations[id];
    await this.setStorageItem(CONVERSATIONS_KEY, conversations);

    // Delete from threads
    const threads = await this.getStorageItem<Record<string, ConversationThread>>(THREADS_KEY) || {};
    delete threads[id];
    await this.setStorageItem(THREADS_KEY, threads);

    // Delete from index
    const index = await this.getStorageItem<Record<string, ConversationSummary>>(CONVERSATION_INDEX_KEY) || {};
    delete index[id];
    await this.setStorageItem(CONVERSATION_INDEX_KEY, index);
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const conversation = await this.getConversation(id);
    if (!conversation) {
      throw new Error(`Conversation ${id} not found`);
    }

    const updatedConversation = { ...conversation, ...updates, updatedAt: Date.now() };
    await this.saveConversation(updatedConversation);
  }

  async exportConversation(id: string): Promise<any> {
    const conversation = await this.getConversation(id);
    const thread = await this.getThread(id);

    if (!conversation || !thread) {
      throw new Error(`Conversation ${id} not found`);
    }

    return {
      conversation,
      thread,
      exportedAt: Date.now(),
      version: '1.0'
    };
  }

  async importConversation(data: any): Promise<string> {
    if (!data.conversation || !data.thread) {
      throw new Error('Invalid conversation data format');
    }

    const newId = generateId();
    const conversation: Conversation = {
      ...data.conversation,
      id: newId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const thread: ConversationThread = {
      ...data.thread,
      id: newId,
      conversationId: newId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: data.thread.messages.map((msg: ChatMessage) => ({
        ...msg,
        id: generateId(),
        conversationId: newId,
        timestamp: msg.timestamp || Date.now()
      }))
    };

    await this.saveConversation(conversation);
    await this.saveThread(thread);

    return newId;
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem(CONVERSATIONS_KEY);
    localStorage.removeItem(THREADS_KEY);
    localStorage.removeItem(CONVERSATION_INDEX_KEY);
  }

  // Helper methods
  async createNewConversation(
    provider: AIProviderType,
    systemMessage?: string,
    model?: string,
    title?: string
  ): Promise<string> {
    const id = generateId();
    const now = Date.now();

    const conversation: Conversation = {
      id,
      title: title || 'New Conversation',
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      provider,
      model,
      systemMessage,
      archived: false,
      starred: false
    };

    const thread: ConversationThread = {
      id,
      conversationId: id,
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        provider,
        model,
        totalTokens: 0,
        estimatedCost: 0
      }
    };

    // Add system message if provided
    if (systemMessage) {
      thread.messages.push({
        id: generateId(),
        role: 'system',
        content: systemMessage,
        timestamp: now,
        conversationId: id
      });
      conversation.messageCount = 1;
    }

    await this.saveConversation(conversation);
    await this.saveThread(thread);

    return id;
  }

  async updateConversationTitle(id: string, firstUserMessage?: string): Promise<void> {
    if (firstUserMessage) {
      const title = generateTitle(firstUserMessage);
      await this.updateConversation(id, { title });
    }
  }

  async getStatistics(): Promise<{
    totalConversations: number;
    totalMessages: number;
    providers: Record<AIProviderType, number>;
    recentActivity: { date: string; count: number }[];
  }> {
    const conversations = await this.getConversations();
    const threads = await this.getStorageItem<Record<string, ConversationThread>>(THREADS_KEY) || {};
    
    const totalMessages = Object.values(threads).reduce((sum, thread) => sum + thread.messages.length, 0);
    
    const providers: Record<AIProviderType, number> = {
      openai: 0,
      huggingface: 0
    };

    conversations.forEach(conv => {
      if (providers[conv.provider] !== undefined) {
        providers[conv.provider]++;
      }
    });

    // Calculate recent activity (last 7 days)
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const recentConversations = conversations.filter(c => c.updatedAt >= weekAgo);
    
    const dailyActivity: Record<string, number> = {};
    recentConversations.forEach(conv => {
      const date = new Date(conv.updatedAt).toDateString();
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    const recentActivity = Object.entries(dailyActivity)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalConversations: conversations.length,
      totalMessages,
      providers,
      recentActivity
    };
  }
}

// Export singleton instance
export const conversationStorage = new LocalStorageConversationStorage(); 