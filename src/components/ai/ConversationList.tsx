import { useState, useCallback } from 'react';
import { 
  ConversationSummary, 
  ConversationFilter, 
  AIProviderType 
} from '../../lib/ai/types';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ConversationListProps {
  conversations: ConversationSummary[];
  loading?: boolean;
  error?: string | null;
  currentFilter?: ConversationFilter | null;
  selectedConversationId?: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onConversationStar: (id: string) => void;
  onConversationArchive: (id: string) => void;
  onCreateNew: () => void;
  onFilterChange: (filter: ConversationFilter) => void;
  onFilterClear: () => void;
  onExport?: (id: string) => void;
  className?: string;
}

export function ConversationList({
  conversations,
  loading = false,
  error = null,
  currentFilter = null,
  selectedConversationId = null,
  onConversationSelect,
  onConversationDelete,
  onConversationStar,
  onConversationArchive,
  onCreateNew,
  onFilterChange,
  onFilterClear,
  onExport,
  className = ''
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState(currentFilter?.searchTerm || '');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | ''>('');
  const [showStarred, setShowStarred] = useState(currentFilter?.starred || false);
  const [showArchived, setShowArchived] = useState(currentFilter?.archived || false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getProviderIcon = (provider: AIProviderType) => {
    switch (provider) {
      case 'openai':
        return '🤖';
      case 'huggingface':
        return '🤗';
      default:
        return '💬';
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    const filter: ConversationFilter = {
      ...currentFilter,
      searchTerm: value || undefined
    };
    onFilterChange(filter);
  }, [currentFilter, onFilterChange]);

  const handleProviderFilter = useCallback((provider: AIProviderType | '') => {
    setSelectedProvider(provider);
    const filter: ConversationFilter = {
      ...currentFilter,
      provider: provider || undefined
    };
    onFilterChange(filter);
  }, [currentFilter, onFilterChange]);

  const handleStarredFilter = useCallback((starred: boolean) => {
    setShowStarred(starred);
    const filter: ConversationFilter = {
      ...currentFilter,
      starred: starred || undefined
    };
    onFilterChange(filter);
  }, [currentFilter, onFilterChange]);

  const handleArchivedFilter = useCallback((archived: boolean) => {
    setShowArchived(archived);
    const filter: ConversationFilter = {
      ...currentFilter,
      archived: archived || undefined
    };
    onFilterChange(filter);
  }, [currentFilter, onFilterChange]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedProvider('');
    setShowStarred(false);
    setShowArchived(false);
    onFilterClear();
  }, [onFilterClear]);

  const hasActiveFilters = !!(
    currentFilter?.searchTerm ||
    currentFilter?.provider ||
    currentFilter?.starred ||
    currentFilter?.archived
  );

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Conversations
          </h2>
          <Button
            onClick={onCreateNew}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Icon name="plus" className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10"
          />
          <Icon 
            name="search" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-600 dark:text-gray-400"
          >
            <Icon name="filter" className="w-4 h-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-2 h-2"></span>
            )}
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            {/* Provider Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => handleProviderFilter(e.target.value as AIProviderType | '')}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Providers</option>
                <option value="openai">OpenAI</option>
                <option value="huggingface">Hugging Face</option>
              </select>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showStarred}
                  onChange={(e) => handleStarredFilter(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Starred</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => handleArchivedFilter(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Archived</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading conversations...</span>
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {!loading && conversations.length === 0 ? (
                     <div className="p-8 text-center">
             <Icon name="search" className="w-12 h-12 mx-auto text-gray-400 mb-4" />
             <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
               No conversations yet
             </h3>
             <p className="text-gray-600 dark:text-gray-400 mb-4">
               Start a new conversation to get started
             </p>
             <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
               Create your first conversation
             </Button>
           </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500'
                    : ''
                }`}
                onClick={() => onConversationSelect(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1">
                      <span className="text-lg mr-2" title={`${conversation.provider} provider`}>
                        {getProviderIcon(conversation.provider)}
                      </span>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {conversation.title}
                      </h3>
                      {conversation.starred && (
                        <Icon name="star" className="w-4 h-4 text-yellow-500 ml-1 flex-shrink-0" />
                      )}
                                             {conversation.archived && (
                         <Icon name="settings" className="w-4 h-4 text-gray-400 ml-1 flex-shrink-0" />
                       )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                      {conversation.lastMessage || 'No messages'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{conversation.messageCount} messages</span>
                      <span>{formatDate(conversation.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Action Menu */}
                  <div className="flex-shrink-0 ml-2">
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConversationStar(conversation.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                        title={conversation.starred ? 'Unstar' : 'Star'}
                      >
                        <Icon 
                          name="star" 
                          className={`w-4 h-4 ${conversation.starred ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} 
                        />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConversationArchive(conversation.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                        title={conversation.archived ? 'Unarchive' : 'Archive'}
                      >
                                                 <Icon 
                           name="settings" 
                           className={`w-4 h-4 ${conversation.archived ? 'text-blue-500' : 'text-gray-400'}`} 
                         />
                      </Button>

                      {onExport && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExport(conversation.id);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Export conversation"
                        >
                                                     <Icon name="chevronDown" className="w-4 h-4 text-gray-400" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this conversation?')) {
                            onConversationDelete(conversation.id);
                          }
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20"
                        title="Delete conversation"
                      >
                                                 <Icon name="delete" className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          {hasActiveFilters && ' (filtered)'}
        </p>
      </div>
    </div>
  );
} 