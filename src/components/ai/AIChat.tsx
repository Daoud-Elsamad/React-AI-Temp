import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { useConversation, useAI } from '@/hooks/useAI';
import { ChatMessage, AIProviderType } from '@/lib/ai';

interface AIChatProps {
  provider?: AIProviderType;
  systemMessage?: string;
  placeholder?: string;
  className?: string;
  maxHeight?: string;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
}

export function AIChat({
  provider,
  systemMessage = 'You are a helpful assistant.',
  placeholder = 'Type your message...',
  className = '',
  maxHeight = '400px',
  onMessageSent,
  onResponseReceived
}: AIChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    loading,
    error,
    sendMessage,
    clearConversation,
    addMessage
  } = useConversation({ provider });

  // Add system message on mount
  useEffect(() => {
    if (systemMessage && messages.length === 0) {
      addMessage({ role: 'system', content: systemMessage });
    }
  }, [systemMessage, messages.length, addMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    
    if (onMessageSent) {
      onMessageSent(userInput);
    }

    const response = await sendMessage(userInput);
    
    if (response && onResponseReceived) {
      onResponseReceived(response.text);
    }
  };

  const formatMessage = (message: ChatMessage, index: number) => {
    if (message.role === 'system') return null;

    const isUser = message.role === 'user';
    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          {!isUser && (
            <div className="text-xs opacity-70 mt-1">
              AI Assistant
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Chat {provider && `(${provider})`}
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={clearConversation}
          disabled={loading}
        >
          Clear
        </Button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ maxHeight }}
      >
        {messages.length === 0 || (messages.length === 1 && messages[0].role === 'system') ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            Start a conversation with the AI assistant
          </div>
        ) : (
          messages.map((message, index) => formatMessage(message, index))
        )}
        
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                             <Spinner size="sm" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                AI is thinking...
              </span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-4 py-2 rounded-lg">
            <div className="text-red-700 dark:text-red-400 text-sm">
              Error: {error}
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
      </form>
    </div>
  );
}

// Simple AI text generator component
interface AITextGeneratorProps {
  provider?: AIProviderType;
  placeholder?: string;
  buttonText?: string;
  className?: string;
  onGenerate?: (text: string) => void;
}

export function AITextGenerator({
  provider,
  placeholder = 'Enter a prompt...',
  buttonText = 'Generate',
  className = '',
  onGenerate
}: AITextGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const { generateText, loading, error } = useAI({ provider });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const response = await generateText(prompt);
    if (response) {
      setResult(response.text);
      if (onGenerate) {
        onGenerate(response.text);
      }
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="w-full"
          />
        </div>
        
        <Button
          type="submit"
          disabled={!prompt.trim() || loading}
          variant="primary"
          className="w-full"
        >
          {loading ? <Spinner size="sm" /> : buttonText}
        </Button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <div className="text-red-700 dark:text-red-400 text-sm">
            Error: {error}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Generated Text:
          </h4>
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
} 