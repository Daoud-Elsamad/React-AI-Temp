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

// Prompt Template System Types
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'code' | 'creative' | 'business' | 'analysis' | 'custom';
  template: string;
  variables: PromptVariable[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  rating?: number;
  isBuiltIn: boolean;
  author?: string;
}

export interface PromptVariable {
  name: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean';
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select type
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface PromptTemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: PromptTemplate[];
}

export interface PromptExecution {
  templateId: string;
  variables: Record<string, any>;
  generatedPrompt: string;
  response?: string;
  timestamp: number;
  model?: string;
  provider?: AIProviderType;
  metadata?: {
    tokens?: number;
    cost?: number;
    duration?: number;
  };
}

// Model Management Types
export interface AIModel {
  id: string;
  name: string;
  provider: AIProviderType;
  capabilities: ProviderCapabilities;
  contextLength: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
  description?: string;
  version?: string;
  isAvailable: boolean;
  performance?: {
    speed: 'fast' | 'medium' | 'slow';
    quality: 'basic' | 'good' | 'excellent';
    reasoning: 'basic' | 'good' | 'excellent';
  };
}

export interface ModelComparison {
  models: AIModel[];
  testPrompt: string;
  results: ModelComparisonResult[];
  createdAt: number;
}

export interface ModelComparisonResult {
  modelId: string;
  response: string;
  metrics: {
    responseTime: number;
    tokenCount: number;
    cost: number;
    quality?: number; // 1-10 rating
  };
}

// Context Management Types
export interface ConversationContext {
  id: string;
  conversationId: string;
  windowSize: number; // Number of messages to keep in context
  compressionStrategy: 'none' | 'summarize' | 'truncate' | 'selective';
  priority: ContextPriority[];
  metadata: {
    totalTokens: number;
    contextTokens: number;
    compressionRatio: number;
  };
}

export interface ContextPriority {
  type: 'system' | 'user' | 'assistant' | 'function';
  weight: number; // 0-1, higher weight = more likely to keep
  rules: ContextRule[];
}

export interface ContextRule {
  condition: 'message_role' | 'message_age' | 'message_length' | 'keyword_presence' | 'importance_score';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range';
  value: any;
  action: 'keep' | 'summarize' | 'remove';
}

export interface ContextSummary {
  originalMessageCount: number;
  summarizedContent: string;
  retainedMessages: ChatMessage[];
  compressionRatio: number;
  generatedAt: number;
}

// Prompt Engineering Types
export interface PromptTest {
  id: string;
  name: string;
  prompt: string;
  testCases: PromptTestCase[];
  models: string[];
  createdAt: number;
  lastRunAt?: number;
  results?: PromptTestResult[];
}

export interface PromptTestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput?: string;
  evaluationCriteria: EvaluationCriteria[];
}

export interface EvaluationCriteria {
  type: 'exact_match' | 'contains' | 'similarity' | 'length' | 'custom';
  description: string;
  weight: number; // 0-1
  threshold?: number;
  customFunction?: (response: string, expected: string) => number;
}

export interface PromptTestResult {
  testId: string;
  modelId: string;
  testCaseResults: TestCaseResult[];
  overallScore: number;
  executedAt: number;
  metadata: {
    totalCost: number;
    totalTime: number;
    averageTokens: number;
  };
}

export interface TestCaseResult {
  testCaseId: string;
  response: string;
  score: number;
  passed: boolean;
  criteriaResults: CriteriaResult[];
  metadata: {
    responseTime: number;
    tokens: number;
    cost: number;
  };
}

export interface CriteriaResult {
  criteriaType: string;
  score: number;
  passed: boolean;
  message?: string;
}

// Export/Import Types
export interface ConversationExport {
  version: string;
  exportedAt: number;
  format: 'json' | 'markdown' | 'txt' | 'csv' | 'pdf';
  conversation: Conversation;
  messages: ChatMessage[];
  metadata: {
    totalTokens?: number;
    totalCost?: number;
    averageResponseTime?: number;
    providerDistribution: Record<AIProviderType, number>;
  };
}

export interface ExportOptions {
  format: 'json' | 'markdown' | 'txt' | 'csv' | 'pdf';
  includeMetadata: boolean;
  includeTimestamps: boolean;
  includeSystemMessages: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  messageFilter?: {
    roles: ('system' | 'user' | 'assistant')[];
    minLength?: number;
    maxLength?: number;
  };
}

export interface ImportResult {
  success: boolean;
  conversationId?: string;
  errors: string[];
  warnings: string[];
  metadata: {
    totalMessages: number;
    skippedMessages: number;
    estimatedTokens: number;
  };
} 