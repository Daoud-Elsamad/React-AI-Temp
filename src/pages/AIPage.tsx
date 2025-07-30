import { useState } from 'react';
import { AIChat, StreamingAIChat, EnhancedAIChat } from '@/components/ai';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { useAI } from '@/hooks/useAI';
import { AIProviderType } from '@/lib/ai';

export function AIPage() {
  const [activeTab, setActiveTab] = useState<'enhanced-chat' | 'streaming-chat' | 'chat'>('enhanced-chat');
  const [provider, setProvider] = useState<AIProviderType>('openai');
  const { getAvailableProviders } = useAI();

  const availableProviders = getAvailableProviders();

  const tabs = [
    { id: 'enhanced-chat', label: 'Enhanced Chat', description: 'AI chat with conversation management and persistence' },
    { id: 'streaming-chat', label: 'Streaming Chat', description: 'Real-time AI chat with streaming responses' },
    { id: 'chat', label: 'Regular Chat', description: 'Traditional AI chat' }
  ] as const;

  return (
    <PageWrapper title="AI Assistant" subtitle="Interact with AI models">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Provider Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            AI Provider Settings
          </h2>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Provider:
            </label>
                         <div className="flex space-x-2">
               {availableProviders.map((p) => (
                 <Button
                   key={p.id}
                   variant={provider === p.id ? 'primary' : 'secondary'}
                   size="sm"
                   onClick={() => setProvider(p.id)}
                 >
                   {p.name}
                 </Button>
               ))}
            </div>
            {availableProviders.length === 0 && (
              <div className="text-sm text-red-600 dark:text-red-400">
                No AI providers available. Please check your API keys in .env file.
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span>{tab.label}</span>
                    <span className="text-xs text-gray-400 mt-1">{tab.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'enhanced-chat' && (
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                    🎯 Enhanced AI Chat with Conversation Management
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Complete chat system with persistent conversations. Features include:
                  </p>
                  <ul className="mt-2 text-sm text-purple-600 dark:text-purple-400 list-disc list-inside">
                    <li>Persistent conversation history</li>
                    <li>Conversation management and threading</li>
                    <li>Search and filter conversations</li>
                    <li>Star and archive conversations</li>
                    <li>Export/import functionality</li>
                    <li>Auto-save messages</li>
                  </ul>
                </div>
                <div className="h-[600px]">
                  <EnhancedAIChat
                    provider={provider}
                    systemMessage="You are a helpful AI assistant. Provide detailed and informative responses."
                    showConversationList={true}
                    onMessageSent={(message) => console.log('Message sent:', message)}
                    onResponseReceived={(response) => console.log('Response received:', response)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'streaming-chat' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    🚀 Streaming AI Chat
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Experience real-time AI responses as they're generated. Features include:
                  </p>
                  <ul className="mt-2 text-sm text-blue-600 dark:text-blue-400 list-disc list-inside">
                    <li>Real-time streaming responses</li>
                    <li>Connection status indicators</li>
                    <li>Response cancellation</li>
                    <li>Auto-reconnection on failures</li>
                  </ul>
                </div>
                <div className="h-96">
                  <StreamingAIChat
                    provider={provider}
                    systemMessage="You are a helpful AI assistant. Provide detailed and informative responses."
                    placeholder="Ask me anything..."
                    maxHeight="100%"
                    enableAutoReconnect={true}
                    showConnectionStatus={true}
                    onStreamStart={() => console.log('Stream started')}
                    onStreamComplete={() => console.log('Stream completed')}
                  />
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    💬 Regular AI Chat
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Traditional AI chat that waits for complete responses before displaying them.
                  </p>
                </div>
                <div className="h-96">
                  <AIChat
                    provider={provider}
                    systemMessage="You are a helpful AI assistant."
                    placeholder="Type your message..."
                    maxHeight="100%"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Management Features */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🎯 Conversation Management Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Persistent Storage</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All conversations are automatically saved to local storage
              </p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Search & Filter</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Find conversations by content, provider, date, or status
              </p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Organization</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Star important conversations and archive old ones
              </p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Export/Import</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Save conversations as JSON files for backup or sharing
              </p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🔧 Technical Implementation
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <ul className="text-sm space-y-2">
              <li><strong>Local Storage API:</strong> Browser-native persistent storage for conversation data</li>
              <li><strong>React Hooks:</strong> Custom hooks for conversation management and state</li>
              <li><strong>TypeScript Interfaces:</strong> Strongly typed conversation models and threading</li>
              <li><strong>Conversation Threading:</strong> Organized message history with metadata tracking</li>
              <li><strong>Search & Filtering:</strong> Client-side full-text search and advanced filtering</li>
              <li><strong>Export/Import:</strong> JSON-based data portability and backup functionality</li>
            </ul>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
} 