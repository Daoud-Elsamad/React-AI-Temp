import { useState, useEffect, useCallback } from 'react';
import {
  Conversation,
  ConversationThread,
  ConversationSummary,
  ConversationFilter,
  ChatMessage,
  AIProviderType
} from '../lib/ai/types';
import { conversationStorage } from '../lib/ai/conversationStorage';

export interface UseConversationManagerOptions {
  autoSave?: boolean;
  provider?: AIProviderType;
  model?: string;
  systemMessage?: string;
}

export interface UseConversationManagerReturn {
  // Current conversation state
  currentConversation: Conversation | null;
  currentThread: ConversationThread | null;
  messages: ChatMessage[];
  
  // Conversation list management
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  
  // Conversation operations
  createConversation: (title?: string) => Promise<string>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  
  // Message operations
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'conversationId'>) => Promise<void>;
  saveCurrentThread: () => Promise<void>;
  clearCurrentConversation: () => void;
  
  // Filtering and search
  applyFilter: (filter: ConversationFilter) => void;
  clearFilter: () => void;
  currentFilter: ConversationFilter | null;
  
  // Export/Import
  exportConversation: (id: string) => Promise<any>;
  importConversation: (data: any) => Promise<string>;
  
  // Statistics
  getStatistics: () => Promise<{
    totalConversations: number;
    totalMessages: number;
    providers: Record<AIProviderType, number>;
    recentActivity: { date: string; count: number }[];
  }>;
}

export function useConversationManager(options: UseConversationManagerOptions = {}): UseConversationManagerReturn {
  const {
    autoSave = true,
    provider = 'openai',
    model,
    systemMessage
  } = options;

  // State
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [currentThread, setCurrentThread] = useState<ConversationThread | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ConversationFilter | null>(null);

  // Derived state
  const messages = currentThread?.messages || [];

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = useCallback(async (filter?: ConversationFilter) => {
    try {
      setLoading(true);
      setError(null);
      const conversationList = await conversationStorage.getConversations(filter);
      setConversations(conversationList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (title?: string): Promise<string> => {
    try {
      setError(null);
      const id = await conversationStorage.createNewConversation(
        provider,
        systemMessage,
        model,
        title
      );
      
      // Reload conversations to include the new one
      await loadConversations(currentFilter || undefined);
      
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [provider, model, systemMessage, currentFilter, loadConversations]);

  const loadConversation = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const [conversation, thread] = await Promise.all([
        conversationStorage.getConversation(id),
        conversationStorage.getThread(id)
      ]);

      if (!conversation || !thread) {
        throw new Error(`Conversation ${id} not found`);
      }

      setCurrentConversation(conversation);
      setCurrentThread(thread);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(errorMessage);
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await conversationStorage.deleteConversation(id);
      
      // If we're deleting the current conversation, clear it
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setCurrentThread(null);
      }
      
      // Reload conversations
      await loadConversations(currentFilter || undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentConversation?.id, currentFilter, loadConversations]);

  const updateConversationTitle = useCallback(async (id: string, title: string): Promise<void> => {
    try {
      setError(null);
      await conversationStorage.updateConversation(id, { title });
      
      // Update current conversation if it's the one being updated
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, title } : null);
      }
      
      // Reload conversations to reflect the change
      await loadConversations(currentFilter || undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update conversation title';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentConversation?.id, currentFilter, loadConversations]);

  const toggleStar = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      const conversation = await conversationStorage.getConversation(id);
      if (!conversation) {
        throw new Error(`Conversation ${id} not found`);
      }
      
      await conversationStorage.updateConversation(id, { starred: !conversation.starred });
      
      // Update current conversation if it's the one being updated
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, starred: !prev.starred } : null);
      }
      
      // Reload conversations to reflect the change
      await loadConversations(currentFilter || undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle star';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentConversation?.id, currentFilter, loadConversations]);

  const toggleArchive = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      const conversation = await conversationStorage.getConversation(id);
      if (!conversation) {
        throw new Error(`Conversation ${id} not found`);
      }
      
      await conversationStorage.updateConversation(id, { archived: !conversation.archived });
      
      // Update current conversation if it's the one being updated
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, archived: !prev.archived } : null);
      }
      
      // Reload conversations to reflect the change
      await loadConversations(currentFilter || undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle archive';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentConversation?.id, currentFilter, loadConversations]);

  const addMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp' | 'conversationId'>): Promise<void> => {
    if (!currentConversation || !currentThread) {
      throw new Error('No active conversation to add message to');
    }

    try {
      setError(null);
      const fullMessage: ChatMessage = {
        ...message,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        conversationId: currentConversation.id
      };

      // Update local state immediately for UI responsiveness
      setCurrentThread(prev => prev ? {
        ...prev,
        messages: [...prev.messages, fullMessage],
        updatedAt: Date.now()
      } : null);

      // Auto-update conversation title from first user message
      if (message.role === 'user' && currentThread.messages.filter(m => m.role === 'user').length === 0) {
        await conversationStorage.updateConversationTitle(currentConversation.id, message.content);
      }

      // Save to storage if auto-save is enabled
      if (autoSave) {
        await conversationStorage.saveMessage(fullMessage);
        // Reload conversations to update the summary
        await loadConversations(currentFilter || undefined);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentConversation, currentThread, autoSave, currentFilter, loadConversations]);

  const saveCurrentThread = useCallback(async (): Promise<void> => {
    if (!currentThread) {
      return;
    }

    try {
      setError(null);
      await conversationStorage.saveThread(currentThread);
      // Reload conversations to update the summary
      await loadConversations(currentFilter || undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save conversation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentThread, currentFilter, loadConversations]);

  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setCurrentThread(null);
    setError(null);
  }, []);

  const applyFilter = useCallback((filter: ConversationFilter) => {
    setCurrentFilter(filter);
    loadConversations(filter);
  }, [loadConversations]);

  const clearFilter = useCallback(() => {
    setCurrentFilter(null);
    loadConversations();
  }, [loadConversations]);

  const exportConversation = useCallback(async (id: string): Promise<any> => {
    try {
      setError(null);
      return await conversationStorage.exportConversation(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export conversation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const importConversation = useCallback(async (data: any): Promise<string> => {
    try {
      setError(null);
      const id = await conversationStorage.importConversation(data);
      await loadConversations(currentFilter || undefined);
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import conversation';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentFilter, loadConversations]);

  const getStatistics = useCallback(async () => {
    try {
      setError(null);
      return await conversationStorage.getStatistics();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get statistics';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    // Current conversation state
    currentConversation,
    currentThread,
    messages,
    
    // Conversation list management
    conversations,
    loading,
    error,
    
    // Conversation operations
    createConversation,
    loadConversation,
    deleteConversation,
    updateConversationTitle,
    toggleStar,
    toggleArchive,
    
    // Message operations
    addMessage,
    saveCurrentThread,
    clearCurrentConversation,
    
    // Filtering and search
    applyFilter,
    clearFilter,
    currentFilter,
    
    // Export/Import
    exportConversation,
    importConversation,
    
    // Statistics
    getStatistics
  };
} 