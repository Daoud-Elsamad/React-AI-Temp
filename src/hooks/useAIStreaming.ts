import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  aiService, 
  StreamResponse, 
  StreamChunk, 
  StreamEvent,
  StreamingOptions,
  ChatMessage, 
  AIProviderType,
  AIServiceError
} from '@/lib/ai';

interface UseStreamingState {
  loading: boolean;
  streaming: boolean;
  error: string | null;
  content: string;
  chunks: StreamChunk[];
  connectionStatus: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error' | 'cancelled';
}

interface UseStreamingOptions {
  provider?: AIProviderType;
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export function useAIStreaming(options: UseStreamingOptions = {}) {
  const [state, setState] = useState<UseStreamingState>({
    loading: false,
    streaming: false,
    error: null,
    content: '',
    chunks: [],
    connectionStatus: 'idle'
  });

  const streamResponseRef = useRef<StreamResponse | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 3;

  const resetState = useCallback(() => {
    setState({
      loading: false,
      streaming: false,
      error: null,
      content: '',
      chunks: [],
      connectionStatus: 'idle'
    });
    reconnectAttemptsRef.current = 0;
  }, []);

  const handleError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      loading: false,
      streaming: false,
      error,
      connectionStatus: 'error'
    }));
    
    if (options.onError) {
      options.onError(error);
    }
  }, [options]);

  const processStreamEvents = useCallback(async (streamResponse: StreamResponse) => {
    const reader = streamResponse.stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setState(prev => ({
            ...prev,
            streaming: false,
            loading: false,
            connectionStatus: 'completed'
          }));
          
          if (options.onComplete) {
            options.onComplete();
          }
          break;
        }

        if (streamResponse.controller.signal.aborted) {
          setState(prev => ({
            ...prev,
            streaming: false,
            loading: false,
            connectionStatus: 'cancelled'
          }));
          break;
        }

        // Process the stream event
        const event: StreamEvent = value;
        
        switch (event.type) {
          case 'start':
            setState(prev => ({
              ...prev,
              streaming: true,
              loading: false,
              connectionStatus: 'streaming'
            }));
            break;
            
          case 'chunk':
            if (event.data) {
              setState(prev => ({
                ...prev,
                content: prev.content + event.data!.text,
                chunks: [...prev.chunks, event.data!]
              }));
              
              if (options.onChunk) {
                options.onChunk(event.data);
              }
            }
            break;
            
          case 'complete':
            setState(prev => ({
              ...prev,
              streaming: false,
              loading: false,
              connectionStatus: 'completed'
            }));
            
            if (options.onComplete) {
              options.onComplete();
            }
            return;
            
          case 'error':
            handleError(event.error || 'Stream error occurred');
            return;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Stream reading error';
      handleError(errorMsg);
    } finally {
      reader.releaseLock();
    }
  }, [options, handleError]);

  const startStreaming = useCallback(async (streamingFn: () => Promise<StreamResponse>) => {
    try {
      setState(prev => ({
        ...prev,
        loading: true,
        streaming: false,
        error: null,
        connectionStatus: 'connecting'
      }));

      if (options.onStart) {
        options.onStart();
      }

      const streamResponse = await streamingFn();
      streamResponseRef.current = streamResponse;
      
      await processStreamEvents(streamResponse);
      
      reconnectAttemptsRef.current = 0; // Reset on successful connection
    } catch (error) {
      const errorMsg = error instanceof AIServiceError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Failed to start streaming';
      
      // Handle reconnection
      if (options.autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        setTimeout(() => {
          startStreaming(streamingFn);
        }, 1000 * reconnectAttemptsRef.current); // Exponential backoff
      } else {
        handleError(errorMsg);
      }
    }
  }, [options, processStreamEvents, handleError, maxReconnectAttempts]);

  const generateTextStream = useCallback(async (
    prompt: string,
    streamingOptions?: Omit<StreamingOptions, 'onChunk' | 'onComplete' | 'onError' | 'onStart'>
  ) => {
    await startStreaming(() => 
      aiService.generateTextStream(prompt, {
        ...streamingOptions,
        provider: options.provider,
        onChunk: options.onChunk,
        onComplete: options.onComplete,
        onError: options.onError,
        onStart: options.onStart
      })
    );
  }, [startStreaming, options]);

  const generateChatStream = useCallback(async (
    messages: ChatMessage[],
    streamingOptions?: Omit<StreamingOptions, 'onChunk' | 'onComplete' | 'onError' | 'onStart'>
  ) => {
    await startStreaming(() => 
      aiService.generateChatStream(messages, {
        ...streamingOptions,
        provider: options.provider,
        onChunk: options.onChunk,
        onComplete: options.onComplete,
        onError: options.onError,
        onStart: options.onStart
      })
    );
  }, [startStreaming, options]);

  const askStream = useCallback(async (
    question: string,
    streamingOptions?: Omit<StreamingOptions, 'onChunk' | 'onComplete' | 'onError' | 'onStart'> & {
      systemMessage?: string;
    }
  ) => {
    await startStreaming(() => 
      aiService.askStream(question, {
        ...streamingOptions,
        provider: options.provider,
        onChunk: options.onChunk,
        onComplete: options.onComplete,
        onError: options.onError,
        onStart: options.onStart
      })
    );
  }, [startStreaming, options]);

  const cancelStream = useCallback(() => {
    if (streamResponseRef.current) {
      streamResponseRef.current.controller.abort();
      streamResponseRef.current = null;
      
      setState(prev => ({
        ...prev,
        loading: false,
        streaming: false,
        connectionStatus: 'cancelled'
      }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, [cancelStream]);

  return {
    // State
    loading: state.loading,
    streaming: state.streaming,
    error: state.error,
    content: state.content,
    chunks: state.chunks,
    connectionStatus: state.connectionStatus,

    // Methods
    generateTextStream,
    generateChatStream,
    askStream,
    cancelStream,
    resetState,
    
    // Connection info
    isConnected: state.connectionStatus === 'streaming',
    canRetry: state.connectionStatus === 'error' && reconnectAttemptsRef.current < maxReconnectAttempts,
    retryAttempts: reconnectAttemptsRef.current
  };
}

// Hook for managing streaming conversation
export function useStreamingConversation(options: UseStreamingOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  
  const streamingHook = useAIStreaming({
    ...options,
    onChunk: (chunk) => {
      setCurrentStreamingMessage(prev => prev + chunk.text);
      if (options.onChunk) {
        options.onChunk(chunk);
      }
    },
    onComplete: () => {
      // Add the completed message to conversation
      if (currentStreamingMessage.trim()) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: currentStreamingMessage
        }]);
        setCurrentStreamingMessage('');
      }
      if (options.onComplete) {
        options.onComplete();
      }
    },
    onError: (error) => {
      setCurrentStreamingMessage('');
      if (options.onError) {
        options.onError(error);
      }
    }
  });

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    role: 'user' | 'system' = 'user',
    streamingOptions?: Omit<StreamingOptions, 'onChunk' | 'onComplete' | 'onError' | 'onStart'>
  ) => {
    const userMessage: ChatMessage = { role, content };
    addMessage(userMessage);
    setCurrentStreamingMessage('');

    await streamingHook.generateChatStream([...messages, userMessage], streamingOptions);
  }, [messages, addMessage, streamingHook]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentStreamingMessage('');
    streamingHook.resetState();
  }, [streamingHook]);

  const cancelCurrentMessage = useCallback(() => {
    streamingHook.cancelStream();
    setCurrentStreamingMessage('');
  }, [streamingHook]);

  return {
    // State
    messages,
    currentStreamingMessage,
    ...streamingHook,

    // Methods
    addMessage,
    sendMessage,
    clearConversation,
    cancelCurrentMessage,
    
    // Computed
    allMessages: currentStreamingMessage 
      ? [...messages, { role: 'assistant' as const, content: currentStreamingMessage }]
      : messages
  };
} 