import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { AIChat, AITextGenerator } from '@/components/ai/AIChat';
import { useAI } from '@/hooks/useAI';
import { AIProviderType } from '@/lib/ai';

export function AIPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'generate' | 'status'>('chat');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('openai');
  const { getStatus, getAvailableProviders } = useAI();

  const status = getStatus();
  const providers = getAvailableProviders();

  const tabs = [
    { id: 'chat', label: 'AI Chat', icon: '💬' },
    { id: 'generate', label: 'Text Generator', icon: '✨' },
    { id: 'status', label: 'Service Status', icon: '📊' }
  ];

  return (
    <PageWrapper
      title="AI Integration"
      subtitle="Interact with AI models using OpenAI and Hugging Face APIs"
    >
      <div className="space-y-6">
        {/* Provider Selection */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Available AI Providers
          </h3>
          <div className="flex flex-wrap gap-2">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                variant={selectedProvider === provider.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedProvider(provider.id)}
              >
                {provider.name}
                {selectedProvider === provider.id && ' ✓'}
              </Button>
            ))}
          </div>
          {providers.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No AI providers are configured. Please check your API keys in the environment variables.
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'chat' && (
              <div className="h-96">
                <AIChat
                  provider={selectedProvider}
                  systemMessage="You are a helpful AI assistant. Be concise and helpful in your responses."
                  placeholder="Ask me anything..."
                  className="h-full"
                />
              </div>
            )}

            {activeTab === 'generate' && (
              <div className="space-y-6">
                <AITextGenerator
                  provider={selectedProvider}
                  placeholder="Enter a prompt to generate text..."
                  buttonText="Generate with AI"
                />
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Example Prompts
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'Write a short story about a robot learning to paint',
                      'Explain quantum computing in simple terms',
                      'Create a recipe for chocolate chip cookies',
                      'Write a haiku about artificial intelligence'
                    ].map((prompt, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        onClick={() => {
                          const textarea = document.querySelector('input[placeholder*="prompt"]') as HTMLInputElement;
                          if (textarea) {
                            textarea.value = prompt;
                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                          }
                        }}
                      >
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {prompt}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'status' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Service Status
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-auto">
                      {JSON.stringify(status, null, 2)}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Provider Information
                  </h4>
                  <div className="space-y-3">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {provider.name}
                          </h5>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs rounded">
                            Active
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Provider ID: {provider.id}
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400">
                            View Details
                          </summary>
                          <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                            {JSON.stringify(provider.status, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-900 dark:text-blue-400 mb-2">
                    💡 Setup Instructions
                  </h5>
                  <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                    <p>
                      To use the AI features, you need to configure API keys:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        <strong>OpenAI:</strong> Get your API key from{' '}
                        <a 
                          href="https://platform.openai.com/api-keys" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          OpenAI Platform
                        </a>
                      </li>
                      <li>
                        <strong>Hugging Face:</strong> Get your API key from{' '}
                        <a 
                          href="https://huggingface.co/settings/tokens" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Hugging Face Settings
                        </a>
                      </li>
                    </ul>
                    <p className="mt-2">
                      Add them to your <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env</code> file:
                    </p>
                    <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded font-mono text-xs">
                      VITE_OPENAI_API_KEY=your_openai_key_here<br/>
                      VITE_HUGGINGFACE_API_KEY=your_hf_key_here
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
} 