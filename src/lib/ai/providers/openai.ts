import OpenAI from 'openai';
import { 
  AIResponse, 
  ChatMessage, 
  GenerateOptions, 
  EmbeddingResponse, 
  ImageResponse, 
  ImageGenerateOptions,
  ProviderConfig,
  AIServiceConfig,
  StreamingOptions,
  StreamResponse,
  StreamChunk
} from '../types';
import { BaseAIService } from '../baseService';
import { ValidationError } from '../errors';

export class OpenAIProvider extends BaseAIService {
  public readonly name = 'OpenAI';

  private client: OpenAI;

  constructor(config: ProviderConfig, serviceConfig: AIServiceConfig) {
    super('openai', config, serviceConfig);
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout || serviceConfig.timeout,
      dangerouslyAllowBrowser: true // For client-side usage
    });
  }

  async generateText(prompt: string, options: GenerateOptions = {}): Promise<AIResponse> {
    this.validateInput({ prompt }, ['prompt']);
    
    const preparedOptions = this.prepareOptions(options);
    
    return this.executeWithMiddleware(
      'generateText',
      { prompt, ...preparedOptions },
      async () => {
        return this.executeWithRetry(async () => {
          const response = await this.client.completions.create({
            model: preparedOptions.model || 'gpt-3.5-turbo-instruct',
            prompt,
            max_tokens: preparedOptions.maxTokens,
            temperature: preparedOptions.temperature,
            top_p: preparedOptions.topP,
            frequency_penalty: preparedOptions.frequencyPenalty,
            presence_penalty: preparedOptions.presencePenalty,
            stop: preparedOptions.stopSequences?.length ? preparedOptions.stopSequences : undefined
          });

          const choice = response.choices[0];
          if (!choice) {
            throw new ValidationError('No completion generated');
          }

          return {
            text: choice.text || '',
            finishReason: choice.finish_reason as any,
            usage: response.usage ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens
            } : undefined,
            model: response.model,
            created: response.created
          };
        });
      }
    );
  }

  async generateChat(messages: ChatMessage[], options: GenerateOptions = {}): Promise<AIResponse> {
    this.validateInput({ messages }, ['messages']);
    
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ValidationError('Messages must be a non-empty array');
    }

    const preparedOptions = this.prepareOptions(options);
    
    return this.executeWithMiddleware(
      'generateChat',
      { messages, ...preparedOptions },
      async () => {
        return this.executeWithRetry(async () => {
                     const response = await this.client.chat.completions.create({
             model: preparedOptions.model || 'gpt-3.5-turbo',
             messages: messages.map(msg => ({
               role: msg.role,
               content: msg.content,
               name: msg.name
             })),
             max_tokens: preparedOptions.maxTokens,
             temperature: preparedOptions.temperature,
             top_p: preparedOptions.topP,
             frequency_penalty: preparedOptions.frequencyPenalty,
             presence_penalty: preparedOptions.presencePenalty,
             stop: preparedOptions.stopSequences?.length ? preparedOptions.stopSequences : undefined,
             stream: false // Disable streaming for non-streaming method
           });

          const choice = response.choices[0];
          if (!choice?.message) {
            throw new ValidationError('No chat completion generated');
          }

          return {
            text: choice.message.content || '',
            finishReason: choice.finish_reason as any,
            usage: response.usage ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens
            } : undefined,
            model: response.model,
            created: response.created
          };
        });
      }
    );
  }

  /**
   * Generate streaming text completion
   */
  async generateTextStream(prompt: string, options: StreamingOptions = {}): Promise<StreamResponse> {
    this.validateInput({ prompt }, ['prompt']);
    
    const preparedOptions = this.prepareOptions(options);
    const controller = new AbortController();
    const streamId = `openai_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const stream = await this.client.completions.create({
        model: preparedOptions.model || 'gpt-3.5-turbo-instruct',
        prompt,
        max_tokens: preparedOptions.maxTokens,
        temperature: preparedOptions.temperature,
        top_p: preparedOptions.topP,
        frequency_penalty: preparedOptions.frequencyPenalty,
        presence_penalty: preparedOptions.presencePenalty,
        stop: preparedOptions.stopSequences?.length ? preparedOptions.stopSequences : undefined,
        stream: true
      }, {
        signal: controller.signal
      });

      const readableStream = this.createOpenAIReadableStream(stream, options);

      return {
        id: streamId,
        stream: readableStream,
        controller,
        status: 'streaming'
      };
    } catch (error) {
      throw this.errorHandler(error);
    }
  }

  /**
   * Generate streaming chat completion
   */
  async generateChatStream(messages: ChatMessage[], options: StreamingOptions = {}): Promise<StreamResponse> {
    this.validateInput({ messages }, ['messages']);
    
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new ValidationError('Messages must be a non-empty array');
    }

    const preparedOptions = this.prepareOptions(options);
    const controller = new AbortController();
    const streamId = `openai_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const stream = await this.client.chat.completions.create({
        model: preparedOptions.model || 'gpt-3.5-turbo',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          name: msg.name
        })),
        max_tokens: preparedOptions.maxTokens,
        temperature: preparedOptions.temperature,
        top_p: preparedOptions.topP,
        frequency_penalty: preparedOptions.frequencyPenalty,
        presence_penalty: preparedOptions.presencePenalty,
        stop: preparedOptions.stopSequences?.length ? preparedOptions.stopSequences : undefined,
        stream: true
      }, {
        signal: controller.signal
      });

      const readableStream = this.createOpenAIReadableStream(stream, options);

      return {
        id: streamId,
        stream: readableStream,
        controller,
        status: 'streaming'
      };
    } catch (error) {
      throw this.errorHandler(error);
    }
  }

  /**
   * Create ReadableStream from OpenAI stream
   */
  private createOpenAIReadableStream(
    openaiStream: any,
    options: StreamingOptions
  ): ReadableStream<import('../types').StreamEvent> {
    return new ReadableStream({
      async start(controller) {
        try {
          if (options.onStart) {
            options.onStart();
          }

          for await (const chunk of openaiStream) {
            const choice = chunk.choices[0];
            if (!choice) continue;

            const text = choice.delta?.content || choice.text || '';
            const finishReason = choice.finish_reason;

            if (text || finishReason) {
              const streamChunk: StreamChunk = {
                text,
                finishReason: finishReason as any,
                model: chunk.model,
                created: chunk.created
              };

              controller.enqueue({
                type: 'chunk' as const,
                data: streamChunk
              });

              if (options.onChunk) {
                options.onChunk(streamChunk);
              }
            }

            if (finishReason) {
              controller.enqueue({ type: 'complete' as const });
              if (options.onComplete) {
                options.onComplete();
              }
              break;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Stream processing error';
          controller.enqueue({
            type: 'error' as const,
            error: errorMessage
          });
          if (options.onError) {
            options.onError(errorMessage);
          }
          controller.error(error);
        } finally {
          controller.close();
        }
      },

      cancel() {
        // Stream cleanup is handled by the AbortController
      }
    });
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    this.validateInput({ text }, ['text']);

    return this.executeWithMiddleware(
      'generateEmbedding',
      { text },
      async () => {
        return this.executeWithRetry(async () => {
          const response = await this.client.embeddings.create({
            model: 'text-embedding-ada-002',
            input: text
          });

          const embedding = response.data[0];
          if (!embedding) {
            throw new ValidationError('No embedding generated');
          }

          return {
            embedding: embedding.embedding,
            model: response.model,
            usage: {
              promptTokens: response.usage.prompt_tokens,
              totalTokens: response.usage.total_tokens
            }
          };
        });
      }
    );
  }

  async generateImage(prompt: string, options: ImageGenerateOptions = {}): Promise<ImageResponse> {
    this.validateInput({ prompt }, ['prompt']);

    return this.executeWithMiddleware(
      'generateImage',
      { prompt, ...options },
      async () => {
        return this.executeWithRetry(async () => {
          const response = await this.client.images.generate({
            model: 'dall-e-3',
            prompt,
            size: options.size || '1024x1024',
            quality: options.quality || 'standard',
            style: options.style || 'vivid',
            n: options.n || 1,
            response_format: 'url'
          });

          const image = response.data[0];
          if (!image) {
            throw new ValidationError('No image generated');
          }

          return {
            url: image.url,
            revisedPrompt: image.revised_prompt
          };
        });
      },
      { cacheable: false } // Don't cache image generation
    );
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    return this.executeWithMiddleware(
      'listModels',
      {},
      async () => {
        const response = await this.client.models.list();
        return response.data
          .filter(model => model.id.includes('gpt') || model.id.includes('text-') || model.id.includes('dall-e'))
          .map(model => model.id)
          .sort();
      },
      { customCacheTtl: 1000 * 60 * 60 } // Cache for 1 hour
    );
  }

  /**
   * Get model information
   */
  async getModel(modelId: string) {
    return this.executeWithMiddleware(
      'getModel',
      { modelId },
      async () => {
        const model = await this.client.models.retrieve(modelId);
        return {
          id: model.id,
          object: model.object,
          created: model.created,
          ownedBy: model.owned_by
        };
      },
      { customCacheTtl: 1000 * 60 * 60 } // Cache for 1 hour
    );
  }
} 