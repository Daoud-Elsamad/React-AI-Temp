import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { Icon } from '@/components/ui/Icon';
import { useStreamingConversation, useAIStreaming } from '@/hooks/useAIStreaming';
import { ChatMessage, AIProviderType } from '@/lib/ai';

interface StreamingAIChatProps {
  provider?: AIProviderType;
  systemMessage?: string;
  placeholder?: string;
  className?: string;
  maxHeight?: string;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
  onStreamStart?: () => void;
  onStreamComplete?: () => void;
  enableAutoReconnect?: boolean;
  showConnectionStatus?: boolean;
}

export function StreamingAIChat({
  provider,
  systemMessage = 'You are a helpful assistant.',
  placeholder = 'Type your message...',
  className = '',
  maxHeight = '400px',
  onMessageSent,
  onResponseReceived,
  onStreamStart,
  onStreamComplete,
  enableAutoReconnect = true,
  showConnectionStatus = true
}: StreamingAIChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    currentStreamingMessage,
    loading,
    streaming,
    error,
    connectionStatus,
    canRetry,
    retryAttempts,
    sendMessage,
    clearConversation,
    addMessage,
    cancelCurrentMessage,
    resetState
  } = useStreamingConversation({ 
    provider,
    autoReconnect: enableAutoReconnect,
    onStart: onStreamStart,
    onComplete: () => {
      if (onStreamComplete) onStreamComplete();
      if (onResponseReceived && currentStreamingMessage) {
        onResponseReceived(currentStreamingMessage);
      }
    }
  });

  // Add system message on mount
  useEffect(() => {
    if (systemMessage && messages.length === 0) {
      addMessage({ role: 'system', content: systemMessage });
    }
  }, [systemMessage, messages.length, addMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || streaming) return;

    const userInput = input.trim();
    setInput('');
    
    if (onMessageSent) {
      onMessageSent(userInput);
    }

    await sendMessage(userInput);
  };

  const handleCancel = () => {
    cancelCurrentMessage();
  };

  const handleRetry = () => {
    resetState();
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Spinner size="sm" />;
      case 'streaming':
        return <Icon name="info" className="text-green-500" />;
      case 'completed':
        return <Icon name="check" className="text-blue-500" />;
      case 'error':
        return <Icon name="error" className="text-red-500" />;
      case 'cancelled':
        return <Icon name="x" className="text-gray-500" />;
      default:
        return <Icon name="info" className="text-gray-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'streaming':
        return 'Streaming';
      case 'completed':
        return 'Complete';
      case 'error':
        return `Error${retryAttempts > 0 ? ` (${retryAttempts} retries)` : ''}`;
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Ready';
    }
  };

  const formatMessage = (message: ChatMessage, index: number, isStreaming = false) => {
    if (message.role === 'system') return null;

    const isUser = message.role === 'user';
    return (
      <div
        key={isStreaming ? 'streaming' : index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>
          {!isUser && (
            <div className="text-xs opacity-70 mt-1 flex items-center justify-between">
              <span>AI Assistant</span>
              {isStreaming && (
                <div className="flex items-center space-x-1">
                  <Spinner size="xs" />
                  <span>Streaming...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const allDisplayMessages = [...messages];
  if (currentStreamingMessage) {
    allDisplayMessages.push({
      role: 'assistant',
      content: currentStreamingMessage
    });
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Streaming AI Chat {provider && `(${provider})`}
          </h3>
          {showConnectionStatus && (
            <div className="flex items-center space-x-1 text-xs">
              {getConnectionStatusIcon()}
              <span className="text-gray-600 dark:text-gray-400">
                {getConnectionStatusText()}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {streaming && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              className="text-red-600 hover:text-red-700"
            >
              <Icon name="x" className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          {error && canRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              className="text-blue-600 hover:text-blue-700"
            >
                             <Icon name="settings" className="w-4 h-4 mr-1" />
              Retry
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={clearConversation}
            disabled={loading || streaming}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ maxHeight }}
      >
        {allDisplayMessages.length === 0 || (allDisplayMessages.length === 1 && allDisplayMessages[0].role === 'system') ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            Start a conversation with the AI assistant
          </div>
        ) : (
          allDisplayMessages.map((message, index) => {
            const isStreamingMessage = index === allDisplayMessages.length - 1 && !!currentStreamingMessage;
            return formatMessage(message, index, isStreamingMessage);
          })
        )}
        
        {loading && !streaming && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
              <Spinner size="sm" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Connecting to AI...
              </span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-4 py-2 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-red-700 dark:text-red-400 text-sm">
                Error: {error}
              </div>
              {canRetry && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetry}
                  className="text-red-600 hover:text-red-700"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading}
            variant="primary"
          >
            {loading ? <Spinner size="sm" /> : 'Send'}
          </Button>
        </div>
        
        {/* Connection info */}
        {showConnectionStatus && (connectionStatus === 'error' || retryAttempts > 0) && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {connectionStatus === 'error' && (
              <span>Connection failed. {enableAutoReconnect ? 'Auto-retry enabled.' : 'Manual retry required.'}</span>
            )}
            {retryAttempts > 0 && (
              <span> Retry attempts: {retryAttempts}</span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

// Simple streaming text generator component
interface StreamingTextGeneratorProps {
  provider?: AIProviderType;
  placeholder?: string;
  buttonText?: string;
  className?: string;
  onGenerate?: (text: string) => void;
  onStreamComplete?: (text: string) => void;
  showConnectionStatus?: boolean;
}

export function StreamingTextGenerator({
  provider,
  placeholder = 'Enter a prompt...',
  buttonText = 'Generate',
  className = '',
  onGenerate,
  onStreamComplete,
  showConnectionStatus = true
}: StreamingTextGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  
  const {
    content,
    loading,
    streaming,
    error,
    connectionStatus,
    generateTextStream,
    cancelStream,
    resetState
     } = useAIStreaming({ 
     provider,
     onComplete: () => {
       if (onStreamComplete && content) {
         onStreamComplete(content);
       }
     }
   });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading || streaming) return;

    if (onGenerate) {
      onGenerate(prompt);
    }

    await generateTextStream(prompt);
  };

  const handleCancel = () => {
    cancelStream();
  };

  const handleRetry = () => {
    resetState();
  };

  return (
    <div className={className}>
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            disabled={loading || streaming}
            className="w-full"
          />
        </div>
        
        <div className="flex space-x-2">
          <Button
            type="submit"
            disabled={!prompt.trim() || loading || streaming}
            variant="primary"
            className="flex-1"
          >
            {loading || streaming ? <Spinner size="sm" /> : buttonText}
          </Button>
          
          {streaming && (
            <Button
              type="button"
              onClick={handleCancel}
              variant="secondary"
              className="text-red-600 hover:text-red-700"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Connection Status */}
      {showConnectionStatus && connectionStatus !== 'idle' && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Status: {connectionStatus}
          {streaming && (
            <span className="ml-2 inline-flex items-center">
              <Spinner size="xs" />
              <span className="ml-1">Streaming...</span>
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-red-700 dark:text-red-400 text-sm">
              Error: {error}
            </div>
            <Button
              onClick={handleRetry}
              variant="secondary"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {content && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
            Generated Text:
            {streaming && (
              <span className="ml-2 inline-flex items-center text-blue-600">
                <Spinner size="xs" />
                <span className="ml-1 text-xs">Streaming...</span>
              </span>
            )}
          </h4>
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {content}
            {streaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
} 