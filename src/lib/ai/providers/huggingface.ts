import { HfInference } from '@huggingface/inference';
import { 
  AIResponse, 
  ChatMessage, 
  GenerateOptions, 
  EmbeddingResponse,
  ProviderConfig,
  AIServiceConfig
} from '../types';
import { BaseAIService } from '../baseService';
import { ValidationError } from '../errors';

export class HuggingFaceProvider extends BaseAIService {
  public readonly name = 'Hugging Face';

  private client: HfInference;

  constructor(config: ProviderConfig, serviceConfig: AIServiceConfig) {
    super('huggingface', config, serviceConfig);
    
    this.client = new HfInference(config.apiKey, {
      fetch: fetch
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
          const response = await this.client.textGeneration({
            model: preparedOptions.model || 'microsoft/DialoGPT-medium',
            inputs: prompt,
            parameters: {
              max_new_tokens: preparedOptions.maxTokens,
              temperature: preparedOptions.temperature,
              top_p: preparedOptions.topP,
              repetition_penalty: 1 + (preparedOptions.frequencyPenalty || 0),
              do_sample: true,
              return_full_text: false
            }
          });

          if (!response.generated_text) {
            throw new ValidationError('No text generated');
          }

          return {
            text: response.generated_text,
            finishReason: 'stop',
            model: preparedOptions.model || 'microsoft/DialoGPT-medium'
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

    // Convert chat messages to a single prompt for Hugging Face
    const prompt = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n') + '\nassistant:';

    const preparedOptions = this.prepareOptions(options);
    
    return this.executeWithMiddleware(
      'generateChat',
      { messages, ...preparedOptions },
      async () => {
        return this.executeWithRetry(async () => {
          const response = await this.client.textGeneration({
            model: preparedOptions.model || 'microsoft/DialoGPT-medium',
            inputs: prompt,
            parameters: {
              max_new_tokens: preparedOptions.maxTokens,
              temperature: preparedOptions.temperature,
              top_p: preparedOptions.topP,
              repetition_penalty: 1 + (preparedOptions.frequencyPenalty || 0),
              do_sample: true,
              return_full_text: false,
              stop: ['user:', 'system:']
            }
          });

          if (!response.generated_text) {
            throw new ValidationError('No chat response generated');
          }

          return {
            text: response.generated_text.trim(),
            finishReason: 'stop',
            model: preparedOptions.model || 'microsoft/DialoGPT-medium'
          };
        });
      }
    );
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    this.validateInput({ text }, ['text']);

    return this.executeWithMiddleware(
      'generateEmbedding',
      { text },
      async () => {
        return this.executeWithRetry(async () => {
          const response = await this.client.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: text
          });

          if (!Array.isArray(response) || response.length === 0) {
            throw new ValidationError('No embedding generated');
          }

          // Hugging Face returns embeddings as nested arrays or flat arrays
          const embedding = Array.isArray(response[0]) ? response[0] : response;

          return {
            embedding: embedding as number[],
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            usage: {
              promptTokens: Math.ceil(text.length / 4), // Rough estimate
              totalTokens: Math.ceil(text.length / 4)
            }
          };
        });
      }
    );
  }

  // Hugging Face doesn't support image generation through their inference API
  async generateImage(): Promise<never> {
    throw new ValidationError('Image generation is not supported by Hugging Face provider');
  }

  /**
   * List available models for text generation
   */
  async listModels(): Promise<string[]> {
    return this.executeWithMiddleware(
      'listModels',
      {},
      async () => {
        // Return a curated list of popular Hugging Face models
        return [
          'microsoft/DialoGPT-medium',
          'microsoft/DialoGPT-large',
          'facebook/blenderbot-400M-distill',
          'microsoft/cognitive_services_openai_gpt-3.5-turbo',
          'gpt2',
          'gpt2-medium',
          'gpt2-large',
          'distilgpt2',
          'EleutherAI/gpt-j-6B',
          'sentence-transformers/all-MiniLM-L6-v2',
          'sentence-transformers/all-mpnet-base-v2'
        ];
      },
      { customCacheTtl: 1000 * 60 * 60 * 24 } // Cache for 24 hours
    );
  }

  /**
   * Get model information from Hugging Face Hub
   */
  async getModel(modelId: string) {
    return this.executeWithMiddleware(
      'getModel',
      { modelId },
      async () => {
        try {
          // Note: This would require additional HF Hub API calls
          // For now, return basic info
          return {
            id: modelId,
            provider: 'huggingface',
            available: true
          };
               } catch {
         throw new ValidationError(`Model ${modelId} not found or not accessible`);
       }
      },
      { customCacheTtl: 1000 * 60 * 60 } // Cache for 1 hour
    );
  }

  /**
   * Summarize text using Hugging Face models
   */
  async summarizeText(text: string, options: { model?: string; maxLength?: number } = {}): Promise<string> {
    this.validateInput({ text }, ['text']);

    return this.executeWithMiddleware(
      'summarizeText',
      { text, ...options },
      async () => {
        return this.executeWithRetry(async () => {
          const response = await this.client.summarization({
            model: options.model || 'facebook/bart-large-cnn',
            inputs: text,
            parameters: {
              max_length: options.maxLength || 150,
              min_length: 30,
              do_sample: false
            }
          });

          if (!response.summary_text) {
            throw new ValidationError('No summary generated');
          }

          return response.summary_text;
        });
      }
    );
  }

  /**
   * Classify text using Hugging Face models
   */
  async classifyText(text: string, options: { model?: string; labels?: string[] } = {}): Promise<Array<{ label: string; score: number }>> {
    this.validateInput({ text }, ['text']);

    return this.executeWithMiddleware(
      'classifyText',
      { text, ...options },
      async () => {
        return this.executeWithRetry(async () => {
          const response = await this.client.zeroShotClassification({
            model: options.model || 'facebook/bart-large-mnli',
            inputs: text,
            parameters: {
              candidate_labels: options.labels || ['positive', 'negative', 'neutral']
            }
          });

          // Handle the response structure from Hugging Face
          const labels = (response as any).labels || [];
          const scores = (response as any).scores || [];

          if (!labels.length || !scores.length) {
            throw new ValidationError('No classification results generated');
          }

          return labels.map((label: string, index: number) => ({
            label,
            score: scores[index]
          }));
        });
      }
    );
  }
} 