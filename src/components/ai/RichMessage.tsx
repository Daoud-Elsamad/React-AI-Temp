import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../lib/ai/types';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useToastHelpers } from '../ui/Toast';

interface RichMessageProps {
  message: ChatMessage;
  index: number;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onRate?: (messageId: string, rating: 'up' | 'down') => void;
  canRegenerate?: boolean;
  rating?: 'up' | 'down' | null;
}

interface CopyState {
  copied: boolean;
  timeout?: NodeJS.Timeout;
}

export function RichMessage({
  message,
  index,
  isStreaming = false,
  onRegenerate,
  onRate,
  canRegenerate = false,
  rating = null
}: RichMessageProps) {
  const [copyState, setCopyState] = useState<CopyState>({ copied: false });
  const { success } = useToastHelpers();

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (copyState.timeout) {
        clearTimeout(copyState.timeout);
      }

      setCopyState({ copied: true });
      success('Copied to clipboard!');

      const timeout = setTimeout(() => {
        setCopyState({ copied: false });
      }, 2000);

      setCopyState(prev => ({ ...prev, timeout }));
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [copyState.timeout]);

  const handleRegenerate = useCallback(() => {
    if (onRegenerate && message.id) {
      onRegenerate(message.id);
    }
  }, [onRegenerate, message.id]);

  const handleRate = useCallback((rating: 'up' | 'down') => {
    if (onRate && message.id) {
      onRate(message.id, rating);
    }
  }, [onRate, message.id]);

  // Custom renderers for ReactMarkdown
  const markdownComponents = {
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const codeContent = String(children).replace(/\n$/, '');

      if (!inline) {
        return (
          <div className="relative group">
            <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-xs text-gray-300 border-b border-gray-700">
              <span>{language}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(codeContent)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 h-6"
              >
                <Icon name="copy" className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: '0 0 0.375rem 0.375rem',
                fontSize: '0.875rem'
              }}
              {...props}
            >
              {codeContent}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    pre({ children }: any) {
      return <div className="my-4 rounded-lg overflow-hidden">{children}</div>;
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800/50 rounded-r">
          {children}
        </blockquote>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
            {children}
          </table>
        </div>
      );
    },
    th({ children }: any) {
      return (
        <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return (
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
          {children}
        </td>
      );
    }
  };

  if (message.role === 'system') return null;

  return (
    <>
      <div
        key={isStreaming ? 'streaming' : message.id || index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}
      >
        <div
          className={`max-w-[85%] ${
            isUser
              ? 'bg-blue-600 text-white rounded-lg rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg rounded-bl-sm'
          } relative`}
        >
          {/* Message Content */}
          <div className="p-3">
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                )}
              </div>
            )}
          </div>

          {/* Action Buttons for AI Messages */}
          {isAssistant && !isStreaming && (
            <div className="flex items-center justify-between px-3 pb-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 dark:text-gray-400">AI Assistant</span>
                {message.timestamp && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Copy Message */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(message.content)}
                  className="h-6 px-2 text-xs"
                  title="Copy message"
                >
                  <Icon name="copy" className="w-3 h-3" />
                </Button>

                {/* Regenerate Response */}
                {canRegenerate && onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-6 px-2 text-xs"
                    title="Regenerate response"
                  >
                    <Icon name="refresh" className="w-3 h-3" />
                  </Button>
                )}

                {/* Rating Buttons */}
                {onRate && (
                  <div className="flex items-center space-x-1 ml-1 border-l border-gray-300 dark:border-gray-600 pl-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRate('up')}
                      className={`h-6 px-1 text-xs ${
                        rating === 'up' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                      }`}
                      title="Rate positive"
                    >
                      <Icon name="thumbsUp" className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRate('down')}
                      className={`h-6 px-1 text-xs ${
                        rating === 'down' 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                      }`}
                      title="Rate negative"
                    >
                      <Icon name="thumbsDown" className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Message Actions */}
          {isUser && (
            <div className="flex items-center justify-between px-3 pb-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-blue-100">You</span>
                {message.timestamp && (
                  <span className="text-blue-200">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(message.content)}
                className="h-6 px-2 text-xs text-blue-100 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy message"
              >
                <Icon name="copy" className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>


    </>
  );
} 