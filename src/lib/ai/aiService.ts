import { 
  AIProvider, 
  AIProviderType, 
  AIServiceConfig,
  ChatMessage,
  GenerateOptions,
  ImageGenerateOptions,
  AIResponse,
  EmbeddingResponse,
  ImageResponse,
  StreamingOptions,
  StreamResponse
} from './types';
import { OpenAIProvider } from './providers/openai';
import { HuggingFaceProvider } from './providers/huggingface';
import { getAIConfig, validateAIConfig } from './config';
import { AIServiceError } from './errors';

export class AIService {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private defaultProvider: AIProviderType = 'openai';
  private config: AIServiceConfig;

  constructor(customConfig?: Partial<AIServiceConfig>) {
    this.config = customConfig ? { ...getAIConfig(), ...customConfig } : getAIConfig();
    validateAIConfig(this.config);
    
    this.initializeProviders();
  }

  /**
   * Initialize AI providers with their configurations
   */
  private initializeProviders(): void {
    // Initialize OpenAI provider if API key is available
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
      try {
        const openaiProvider = new OpenAIProvider(
          {
            apiKey: openaiKey,
            defaultModel: 'gpt-3.5-turbo'
          },
          this.config
        );
        this.providers.set('openai', openaiProvider);
        console.log('✅ OpenAI provider initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize OpenAI provider:', error);
      }
    } else {
      console.warn('⚠️ OpenAI API key not found. OpenAI provider will not be available.');
    }

    // Initialize Hugging Face provider if API key is available
    const hfKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    if (hfKey && hfKey !== 'your_huggingface_api_key_here') {
      try {
        const hfProvider = new HuggingFaceProvider(
          {
            apiKey: hfKey,
            defaultModel: 'microsoft/DialoGPT-medium'
          },
          this.config
        );
        this.providers.set('huggingface', hfProvider);
        console.log('✅ Hugging Face provider initialized');
        
        // If OpenAI is not available, use Hugging Face as default
        if (!this.providers.has('openai')) {
          this.defaultProvider = 'huggingface';
        }
      } catch (error) {
        console.warn('⚠️ Failed to initialize Hugging Face provider:', error);
      }
    } else {
      console.warn('⚠️ Hugging Face API key not found. Hugging Face provider will not be available.');
    }

    if (this.providers.size === 0) {
      console.error('❌ No AI providers initialized. Please check your API keys.');
    }
  }

  /**
   * Get a specific provider or the default one
   */
  private getProvider(providerType?: AIProviderType): AIProvider {
    const targetProvider = providerType || this.defaultProvider;
    const provider = this.providers.get(targetProvider);
    
    if (!provider) {
      throw new AIServiceError(
        `Provider ${targetProvider} is not available. Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
        'PROVIDER_NOT_AVAILABLE'
      );
    }
    
    return provider;
  }

  /**
   * Generate text using the specified or default provider
   */
  async generateText(
    prompt: string, 
    options?: GenerateOptions & { provider?: AIProviderType }
  ): Promise<AIResponse> {
    const { provider, ...generateOptions } = options || {};
    const aiProvider = this.getProvider(provider);
    
    return aiProvider.generateText(prompt, generateOptions);
  }

  /**
   * Generate chat completion using the specified or default provider
   */
  async generateChat(
    messages: ChatMessage[], 
    options?: GenerateOptions & { provider?: AIProviderType }
  ): Promise<AIResponse> {
    const { provider, ...generateOptions } = options || {};
    const aiProvider = this.getProvider(provider);
    
    return aiProvider.generateChat(messages, generateOptions);
  }

  /**
   * Generate embeddings (only available for providers that support it)
   */
  async generateEmbedding(
    text: string, 
    provider?: AIProviderType
  ): Promise<EmbeddingResponse> {
    const aiProvider = this.getProvider(provider);
    
    if (!aiProvider.generateEmbedding) {
      throw new AIServiceError(
        `Provider ${aiProvider.id} does not support embeddings`,
        'FEATURE_NOT_SUPPORTED',
        { provider: aiProvider.id }
      );
    }
    
    return aiProvider.generateEmbedding(text);
  }

  /**
   * Generate images (only available for providers that support it)
   */
  async generateImage(
    prompt: string, 
    options?: ImageGenerateOptions & { provider?: AIProviderType }
  ): Promise<ImageResponse> {
    const { provider, ...imageOptions } = options || {};
    const aiProvider = this.getProvider(provider);
    
    if (!aiProvider.generateImage) {
      throw new AIServiceError(
        `Provider ${aiProvider.id} does not support image generation`,
        'FEATURE_NOT_SUPPORTED',
        { provider: aiProvider.id }
      );
    }
    
    return aiProvider.generateImage(prompt, imageOptions);
  }

  /**
   * Generate streaming text with the specified provider
   */
  async generateTextStream(
    prompt: string,
    options: StreamingOptions & { provider?: AIProviderType } = {}
  ): Promise<StreamResponse> {
    const { provider: providerType, ...streamingOptions } = options;
    const provider = this.getProvider(providerType);

    if (!provider.generateTextStream) {
      throw new AIServiceError(
        `Provider ${provider.name} does not support text streaming`,
        'STREAMING_NOT_SUPPORTED',
        { provider: provider.id }
      );
    }

    return provider.generateTextStream(prompt, streamingOptions);
  }

  /**
   * Generate streaming chat completion with the specified provider
   */
  async generateChatStream(
    messages: ChatMessage[],
    options: StreamingOptions & { provider?: AIProviderType } = {}
  ): Promise<StreamResponse> {
    const { provider: providerType, ...streamingOptions } = options;
    const provider = this.getProvider(providerType);

    if (!provider.generateChatStream) {
      throw new AIServiceError(
        `Provider ${provider.name} does not support chat streaming`,
        'STREAMING_NOT_SUPPORTED',
        { provider: provider.id }
      );
    }

    return provider.generateChatStream(messages, streamingOptions);
  }

  /**
   * Ask a streaming question (convenience method for single question)
   */
  async askStream(
    question: string,
    options: StreamingOptions & { 
      provider?: AIProviderType;
      systemMessage?: string;
    } = {}
  ): Promise<StreamResponse> {
    const { systemMessage, ...restOptions } = options;
    const messages: ChatMessage[] = [];
    
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    
    messages.push({ role: 'user', content: question });
    
    return this.generateChatStream(messages, restOptions);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): Array<{ id: AIProviderType; name: string; status: any }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.name,
      status: provider.getStatus()
    }));
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(provider: AIProviderType): void {
    if (!this.providers.has(provider)) {
      throw new AIServiceError(
        `Cannot set ${provider} as default: provider is not available`,
        'PROVIDER_NOT_AVAILABLE'
      );
    }
    
    this.defaultProvider = provider;
    console.log(`✅ Default AI provider set to: ${provider}`);
  }

  /**
   * Get the current default provider
   */
  getDefaultProvider(): AIProviderType {
    return this.defaultProvider;
  }

  /**
   * Add a custom provider
   */
  addProvider(id: AIProviderType, provider: AIProvider): void {
    this.providers.set(id, provider);
    console.log(`✅ Added custom provider: ${id}`);
  }

  /**
   * Remove a provider
   */
  removeProvider(id: AIProviderType): void {
    if (this.providers.has(id)) {
      this.providers.delete(id);
      
      // If we removed the default provider, set a new default
             if (this.defaultProvider === id && this.providers.size > 0) {
         this.defaultProvider = this.providers.keys().next().value as AIProviderType;
        console.log(`⚠️ Default provider changed to: ${this.defaultProvider}`);
      }
      
      console.log(`✅ Removed provider: ${id}`);
    }
  }

  /**
   * Update configuration for all providers
   */
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    validateAIConfig(this.config);
    
    // Update all providers with new config
    this.providers.forEach(provider => {
      provider.updateConfig(newConfig);
    });
    
    console.log('✅ AI service configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  /**
   * Reset all providers (clear caches, reset rate limiters)
   */
  reset(): void {
    this.providers.forEach(provider => {
      provider.reset();
    });
    console.log('✅ All AI providers reset');
  }

  /**
   * Get comprehensive status of all providers
   */
  getStatus() {
    return {
      defaultProvider: this.defaultProvider,
      availableProviders: this.getAvailableProviders(),
      config: this.config,
      initialized: this.providers.size > 0
    };
  }

  /**
   * Convenience methods for common operations
   */

  /**
   * Ask a simple question (uses chat completion with a system message)
   */
  async ask(
    question: string, 
    options?: GenerateOptions & { 
      provider?: AIProviderType;
      systemMessage?: string;
    }
  ): Promise<string> {
    const { systemMessage = 'You are a helpful assistant.', ...restOptions } = options || {};
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: question }
    ];
    
    const response = await this.generateChat(messages, restOptions);
    return response.text;
  }

  /**
   * Summarize text (tries Hugging Face first, falls back to chat completion)
   */
  async summarize(
    text: string, 
    options?: { 
      provider?: AIProviderType;
      maxLength?: number;
    }
  ): Promise<string> {
    const { provider, maxLength = 150 } = options || {};
    
    // Try Hugging Face summarization if available
    if ((!provider || provider === 'huggingface') && this.providers.has('huggingface')) {
      const hfProvider = this.providers.get('huggingface') as HuggingFaceProvider;
      try {
        return await hfProvider.summarizeText(text, { maxLength });
             } catch {
         console.warn('Hugging Face summarization failed, falling back to chat completion');
       }
    }
    
    // Fallback to chat completion
    const prompt = `Please summarize the following text in about ${maxLength} characters:\n\n${text}`;
    const response = await this.ask(prompt, { provider });
    return response;
  }
}

// Export a singleton instance
export const aiService = new AIService(); 