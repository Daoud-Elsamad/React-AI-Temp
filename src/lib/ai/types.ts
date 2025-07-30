// AI Service Types and Interfaces

export interface AIProvider {
  readonly name: string;
  readonly id: string;
  generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse>;
  generateChat(messages: ChatMessage[], options?: GenerateOptions): Promise<AIResponse>;
  // New streaming methods
  generateTextStream?(prompt: string, options?: StreamingOptions): Promise<StreamResponse>;
  generateChatStream?(messages: ChatMessage[], options?: StreamingOptions): Promise<StreamResponse>;
  generateEmbedding?(text: string): Promise<EmbeddingResponse>;
  generateImage?(prompt: string, options?: ImageGenerateOptions): Promise<ImageResponse>;
  getStatus(): any;
  updateConfig(config: Partial<AIServiceConfig>): void;
  reset(): void;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  model?: string;
  stream?: boolean;
  stopSequences?: string[];
}

// Streaming-specific types
export interface StreamChunk {
  text: string;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  created?: number;
}

export interface StreamEvent {
  type: 'chunk' | 'error' | 'complete' | 'start';
  data?: StreamChunk;
  error?: string;
  id?: string;
  retry?: number;
}

export interface StreamResponse {
  id: string;
  stream: ReadableStream<StreamEvent>;
  controller: AbortController;
  status: 'connecting' | 'streaming' | 'completed' | 'error' | 'cancelled';
}

export interface StreamingOptions extends GenerateOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
  onStart?: () => void;
}

export interface ImageGenerateOptions {
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  timestamp?: number;
  conversationId?: string;
  rating?: 'up' | 'down' | null;
  regeneratedFrom?: string; // ID of the message this was regenerated from
  regenerationCount?: number;
}

// Conversation Management Types
export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  provider: AIProviderType;
  model?: string;
  systemMessage?: string;
  lastMessage?: string;
  tags?: string[];
  archived?: boolean;
  starred?: boolean;
}

export interface ConversationThread {
  id: string;
  conversationId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    provider: AIProviderType;
    model?: string;
    totalTokens?: number;
    estimatedCost?: number;
  };
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  updatedAt: number;
  provider: AIProviderType;
  starred?: boolean;
  archived?: boolean;
}

export interface ConversationFilter {
  provider?: AIProviderType;
  dateRange?: {
    start: number;
    end: number;
  };
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
  searchTerm?: string;
}

export interface ConversationStorage {
  saveConversation(conversation: Conversation): Promise<void>;
  saveThread(thread: ConversationThread): Promise<void>;
  saveMessage(message: ChatMessage): Promise<void>;
  getConversation(id: string): Promise<Conversation | null>;
  getThread(conversationId: string): Promise<ConversationThread | null>;
  getConversations(filter?: ConversationFilter): Promise<ConversationSummary[]>;
  deleteConversation(id: string): Promise<void>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<void>;
  exportConversation(id: string): Promise<any>;
  importConversation(data: any): Promise<string>;
  clearAll(): Promise<void>;
}

export interface AIResponse {
  text: string;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  created?: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface ImageResponse {
  url?: string;
  b64Json?: string;
  revisedPrompt?: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  interval: number; // in milliseconds
  minTime?: number; // minimum time between requests
}

export interface CacheConfig {
  ttl: number; // time to live in milliseconds
  maxSize?: number;
  enabled: boolean;
}

export interface AIServiceConfig {
  rateLimit: RateLimitConfig;
  cache: CacheConfig;
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface AIError extends Error {
  code: string;
  status?: number;
  provider?: string;
  retryable?: boolean;
  details?: any;
}

export interface ProviderCapabilities {
  textGeneration: boolean;
  chatCompletion: boolean;
  imageGeneration: boolean;
  embeddings: boolean;
  streaming: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: ProviderCapabilities;
  contextLength: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

export type AIProviderType = 'openai' | 'huggingface';

export interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  defaultModel?: string;
} 