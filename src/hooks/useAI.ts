import { useState, useCallback, useRef } from 'react';
import { 
  aiService, 
  AIResponse, 
  EmbeddingResponse, 
  ImageResponse, 
  ChatMessage, 
  GenerateOptions, 
  ImageGenerateOptions,
  AIProviderType,
  AIServiceError
} from '@/lib/ai';

interface UseAIState {
  loading: boolean;
  error: string | null;
  response: AIResponse | null;
}

interface UseAIOptions {
  provider?: AIProviderType;
  onSuccess?: (response: any) => void;
  onError?: (error: AIServiceError) => void;
}

export function useAI(options: UseAIOptions = {}) {
  const [state, setState] = useState<UseAIState>({
    loading: false,
    error: null,
    response: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    setState({
      loading: false,
      error: null,
      response: null
    });
  }, []);

  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    setState(prev => ({
      ...prev,
      loading: false,
      error: errorMessage
    }));
    
    if (options.onError && error instanceof AIServiceError) {
      options.onError(error);
    }
  }, [options]);

  const generateText = useCallback(async (
    prompt: string, 
    generateOptions?: GenerateOptions
  ): Promise<AIResponse | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await aiService.generateText(prompt, {
        ...generateOptions,
        provider: options.provider
      });
      
      setState(prev => ({
        ...prev,
        loading: false,
        response
      }));
      
      if (options.onSuccess) {
        options.onSuccess(response);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [options.provider, options.onSuccess, handleError]);

  const generateChat = useCallback(async (
    messages: ChatMessage[],
    generateOptions?: GenerateOptions
  ): Promise<AIResponse | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await aiService.generateChat(messages, {
        ...generateOptions,
        provider: options.provider
      });
      
      setState(prev => ({
        ...prev,
        loading: false,
        response
      }));
      
      if (options.onSuccess) {
        options.onSuccess(response);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [options.provider, options.onSuccess, handleError]);

  const ask = useCallback(async (
    question: string,
    generateOptions?: GenerateOptions & { systemMessage?: string }
  ): Promise<string | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await aiService.ask(question, {
        ...generateOptions,
        provider: options.provider
      });
      
      setState(prev => ({
        ...prev,
        loading: false,
        response: { text: response, finishReason: 'stop' } as AIResponse
      }));
      
      if (options.onSuccess) {
        options.onSuccess(response);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [options.provider, options.onSuccess, handleError]);

  const generateEmbedding = useCallback(async (
    text: string
  ): Promise<EmbeddingResponse | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await aiService.generateEmbedding(text, options.provider);
      
      setState(prev => ({
        ...prev,
        loading: false
      }));
      
      if (options.onSuccess) {
        options.onSuccess(response);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [options.provider, options.onSuccess, handleError]);

  const generateImage = useCallback(async (
    prompt: string,
    imageOptions?: ImageGenerateOptions
  ): Promise<ImageResponse | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await aiService.generateImage(prompt, {
        ...imageOptions,
        provider: options.provider
      });
      
      setState(prev => ({
        ...prev,
        loading: false
      }));
      
      if (options.onSuccess) {
        options.onSuccess(response);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [options.provider, options.onSuccess, handleError]);

  const summarize = useCallback(async (
    text: string,
    maxLength?: number
  ): Promise<string | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await aiService.summarize(text, {
        provider: options.provider,
        maxLength
      });
      
      setState(prev => ({
        ...prev,
        loading: false,
        response: { text: response, finishReason: 'stop' } as AIResponse
      }));
      
      if (options.onSuccess) {
        options.onSuccess(response);
      }
      
      return response;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [options.provider, options.onSuccess, handleError]);

  // Cleanup function to abort ongoing requests
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      loading: false
    }));
  }, []);

  return {
    // State
    loading: state.loading,
    error: state.error,
    response: state.response,

    // Methods
    generateText,
    generateChat,
    ask,
    generateEmbedding,
    generateImage,
    summarize,
    
    // Utilities
    resetState,
    abort,
    
    // Service info
    getStatus: () => aiService.getStatus(),
    getAvailableProviders: () => aiService.getAvailableProviders()
  };
}

// Hook for managing conversation state
export function useConversation(options: UseAIOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { generateChat, loading, error } = useAI(options);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    role: 'user' | 'system' = 'user',
    generateOptions?: GenerateOptions
  ) => {
    const userMessage: ChatMessage = { role, content };
    addMessage(userMessage);

    const response = await generateChat([...messages, userMessage], generateOptions);
    
    if (response) {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.text
      };
      addMessage(assistantMessage);
    }

    return response;
  }, [messages, generateChat, addMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  const removeLastMessage = useCallback(() => {
    setMessages(prev => prev.slice(0, -1));
  }, []);

  return {
    messages,
    loading,
    error,
    addMessage,
    sendMessage,
    clearConversation,
    removeLastMessage
  };
} 