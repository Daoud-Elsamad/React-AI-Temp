// AI Service Types and Interfaces

export interface AIProvider {
  readonly name: string;
  readonly id: string;
  generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse>;
  generateChat(messages: ChatMessage[], options?: GenerateOptions): Promise<AIResponse>;
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

export interface ImageGenerateOptions {
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
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