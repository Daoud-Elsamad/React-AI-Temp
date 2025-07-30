import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AIProviderType } from '../../lib/ai/types';
import { useConversationManager } from '../../hooks/useConversationManager';
import { useAI } from '../../hooks/useAI';
import { useMessageActions } from '../../hooks/useMessageActions';
import { ConversationList } from './ConversationList';
import { RichMessage } from './RichMessage';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Icon } from '../ui/Icon';

interface EnhancedAIChatProps {
  provider?: AIProviderType;
  model?: string;
  systemMessage?: string;
  className?: string;
  maxHeight?: string;
  showConversationList?: boolean;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
}

export function EnhancedAIChat({
  provider = 'openai',
  model,
  systemMessage = 'You are a helpful assistant.',
  className = '',
  maxHeight = '600px',
  showConversationList = true,
  onMessageSent,
  onResponseReceived
}: EnhancedAIChatProps) {
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(showConversationList);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Conversation management
  const conversationManager = useConversationManager({
    autoSave: true,
    provider,
    model,
    systemMessage
  });

  // AI chat functionality
  const { generateChat, loading, error } = useAI({ provider });

  // Message actions (rating, regeneration)
  const { ratings, rateMessage, regenerateMessage, isRegenerating } = useMessageActions();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationManager.messages]);

  // Handle message regeneration
  const handleRegenerate = useCallback(async (messageId: string) => {
    const messageIndex = conversationManager.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return; // Can't regenerate if message not found or is first message

    // Get all messages up to the one being regenerated (excluding the message itself)
    const precedingMessages = conversationManager.messages.slice(0, messageIndex);
    
    try {
      // Generate new response with the same context
      const response = await generateChat(precedingMessages);
      
      if (response) {
        // For now, just add the new message - in a full implementation, 
        // we would need to implement message replacement in the conversation manager
        await conversationManager.addMessage({
          role: 'assistant',
          content: `[Regenerated] ${response.text}`,
          regeneratedFrom: messageId,
          regenerationCount: 1
        });
      }
    } catch (error) {
      console.error('Failed to regenerate message:', error);
    }
  }, [conversationManager, generateChat]);

  const handleCreateConversation = useCallback(async () => {
    try {
      const id = await conversationManager.createConversation();
      await conversationManager.loadConversation(id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [conversationManager]);

  const handleConversationSelect = useCallback(async (id: string) => {
    try {
      await conversationManager.loadConversation(id);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [conversationManager]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    
    // If no current conversation, create one
    if (!conversationManager.currentConversation) {
      await handleCreateConversation();
    }

    if (onMessageSent) {
      onMessageSent(userInput);
    }

    try {
      // Add user message to conversation
      await conversationManager.addMessage({
        role: 'user',
        content: userInput
      });

      // Generate AI response
      const response = await generateChat([
        ...conversationManager.messages,
        { role: 'user', content: userInput }
      ]);
      
      if (response) {
        // Add AI response to conversation
        await conversationManager.addMessage({
          role: 'assistant',
          content: response.text
        });

        if (onResponseReceived) {
          onResponseReceived(response.text);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleExportConversation = useCallback(async (id: string) => {
    try {
      const data = await conversationManager.exportConversation(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export conversation:', error);
    }
  }, [conversationManager]);

  const currentConversationTitle = conversationManager.currentConversation?.title || 'New Conversation';
  const hasMessages = conversationManager.messages.length > 0;

  return (
    <div className={`flex h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Conversation List Sidebar */}
      {showSidebar && (
        <div className="w-80 flex-shrink-0">
          <ConversationList
            conversations={conversationManager.conversations}
            loading={conversationManager.loading}
            error={conversationManager.error}
            currentFilter={conversationManager.currentFilter}
            selectedConversationId={conversationManager.currentConversation?.id}
            onConversationSelect={handleConversationSelect}
            onConversationDelete={conversationManager.deleteConversation}
            onConversationStar={conversationManager.toggleStar}
            onConversationArchive={conversationManager.toggleArchive}
            onCreateNew={handleCreateConversation}
            onFilterChange={conversationManager.applyFilter}
            onFilterClear={conversationManager.clearFilter}
            onExport={handleExportConversation}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {!showSidebar && showConversationList && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(true)}
                  className="mr-3"
                >
                  <Icon name="menu" className="w-4 h-4" />
                </Button>
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {currentConversationTitle}
              </h3>
              {conversationManager.currentConversation?.starred && (
                <Icon name="star" className="w-4 h-4 text-yellow-500 ml-2" />
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {conversationManager.currentConversation && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => conversationManager.toggleStar(conversationManager.currentConversation!.id)}
                    title={conversationManager.currentConversation.starred ? 'Unstar' : 'Star'}
                  >
                    <Icon 
                      name="star" 
                      className={`w-4 h-4 ${conversationManager.currentConversation.starred ? 'text-yellow-500' : 'text-gray-400'}`} 
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportConversation(conversationManager.currentConversation!.id)}
                    title="Export conversation"
                  >
                    <Icon name="chevronDown" className="w-4 h-4 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => conversationManager.clearCurrentConversation()}
                    title="Clear conversation"
                  >
                    <Icon name="x" className="w-4 h-4 text-gray-400" />
                  </Button>
                </>
              )}
              {showSidebar && showConversationList && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  title="Hide sidebar"
                >
                  <Icon name="x" className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ maxHeight }}
        >
          {conversationManager.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <Icon name="error" className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 dark:text-red-400">{conversationManager.error}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <Icon name="error" className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 dark:text-red-400">{error}</span>
              </div>
            </div>
          )}

          {!hasMessages && !loading && (
            <div className="text-center py-12">
              <Icon name="search" className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Type a message below to begin chatting with the AI assistant.
              </p>
            </div>
          )}

          {conversationManager.messages.map((message, index) => (
            <RichMessage
              key={message.id || index}
              message={message}
              index={index}
              onRegenerate={message.role === 'assistant' ? (messageId) => regenerateMessage(messageId, handleRegenerate) : undefined}
              onRate={message.role === 'assistant' ? rateMessage : undefined}
              canRegenerate={message.role === 'assistant' && !loading && !isRegenerating}
              rating={message.id ? ratings[message.id] : null}
            />
          ))}

          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-bl-sm max-w-[85%]">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white px-6"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Send'
              )}
            </Button>
          </form>
          
          {conversationManager.currentConversation && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {conversationManager.messages.length} messages • Auto-saved
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 