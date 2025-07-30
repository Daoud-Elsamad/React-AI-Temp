import {
  AIModel,
  ModelComparison,
  ModelComparisonResult,
  AIProviderType,
  ProviderCapabilities
} from './types';
import { aiService } from './aiService';

const MODEL_PREFERENCES_KEY = 'ai_model_preferences';
const MODEL_COMPARISONS_KEY = 'ai_model_comparisons';

// Predefined model information
const PREDEFINED_MODELS: AIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddings: false,
      streaming: true
    },
    contextLength: 8192,
    costPer1kTokens: {
      input: 0.03,
      output: 0.06
    },
    description: 'Most capable model, best for complex reasoning tasks',
    version: 'gpt-4-0613',
    isAvailable: true,
    performance: {
      speed: 'medium',
      quality: 'excellent',
      reasoning: 'excellent'
    }
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddings: false,
      streaming: true
    },
    contextLength: 128000,
    costPer1kTokens: {
      input: 0.01,
      output: 0.03
    },
    description: 'Latest GPT-4 with extended context and improved efficiency',
    version: 'gpt-4-turbo-preview',
    isAvailable: true,
    performance: {
      speed: 'fast',
      quality: 'excellent',
      reasoning: 'excellent'
    }
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddings: false,
      streaming: true
    },
    contextLength: 4096,
    costPer1kTokens: {
      input: 0.001,
      output: 0.002
    },
    description: 'Fast and cost-effective for most conversational tasks',
    version: 'gpt-3.5-turbo-0613',
    isAvailable: true,
    performance: {
      speed: 'fast',
      quality: 'good',
      reasoning: 'good'
    }
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'openai',
    capabilities: {
      textGeneration: false,
      chatCompletion: false,
      imageGeneration: true,
      embeddings: false,
      streaming: false
    },
    contextLength: 0,
    description: 'Advanced image generation model',
    version: 'dall-e-3',
    isAvailable: true,
    performance: {
      speed: 'medium',
      quality: 'excellent',
      reasoning: 'basic'
    }
  },

  // Hugging Face Models
  {
    id: 'microsoft/DialoGPT-medium',
    name: 'DialoGPT Medium',
    provider: 'huggingface',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddings: false,
      streaming: false
    },
    contextLength: 1024,
    description: 'Conversational AI model fine-tuned for dialogue',
    isAvailable: true,
    performance: {
      speed: 'fast',
      quality: 'good',
      reasoning: 'basic'
    }
  },
  {
    id: 'microsoft/DialoGPT-large',
    name: 'DialoGPT Large',
    provider: 'huggingface',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddings: false,
      streaming: false
    },
    contextLength: 1024,
    description: 'Larger version of DialoGPT with better conversation quality',
    isAvailable: true,
    performance: {
      speed: 'medium',
      quality: 'good',
      reasoning: 'good'
    }
  },
  {
    id: 'facebook/blenderbot-400M-distill',
    name: 'BlenderBot 400M',
    provider: 'huggingface',
    capabilities: {
      textGeneration: true,
      chatCompletion: true,
      imageGeneration: false,
      embeddings: false,
      streaming: false
    },
    contextLength: 512,
    description: 'Open-domain chatbot with knowledge and personality',
    isAvailable: true,
    performance: {
      speed: 'fast',
      quality: 'basic',
      reasoning: 'basic'
    }
  }
];

interface ModelPreferences {
  defaultModel: string;
  providerPreference: AIProviderType;
  taskPreferences: {
    chat: string;
    textGeneration: string;
    imageGeneration: string;
    codeGeneration: string;
    analysis: string;
  };
  customSettings: Record<string, any>;
}

export class ModelService {
  private storage = localStorage;
  private availableModels: AIModel[] = [];

  constructor() {
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    // Start with predefined models
    this.availableModels = [...PREDEFINED_MODELS];

    // Fetch dynamic models from providers
    try {
      await this.refreshAvailableModels();
    } catch (error) {
      console.warn('Failed to refresh models from providers:', error);
    }
  }

  async refreshAvailableModels(): Promise<void> {
    const providers = aiService.getAvailableProviders();
    
    for (const providerInfo of providers) {
      const providerType = providerInfo.id;
      try {
        // Check if provider supports listing models
        if (providerType === 'openai' || providerType === 'huggingface') {
          // For now, we'll use the predefined models since listModels is not in the interface
          // This could be extended when the providers implement model listing
          console.log(`Refreshing models for provider: ${providerType}`);
        }
      } catch (error) {
        console.warn(`Failed to fetch models from ${providerType}:`, error);
      }
    }

    // Mark unavailable models based on available providers
    const availableProviderTypes = providers.map(p => p.id);
    this.availableModels.forEach(model => {
      if (!availableProviderTypes.includes(model.provider)) {
        model.isAvailable = false;
      }
    });
  }



  getAllModels(): AIModel[] {
    return this.availableModels.filter(model => model.isAvailable);
  }

  getModelsByProvider(provider: AIProviderType): AIModel[] {
    return this.availableModels.filter(model => 
      model.provider === provider && model.isAvailable
    );
  }

  getModelsByCapability(capability: keyof ProviderCapabilities): AIModel[] {
    return this.availableModels.filter(model => 
      model.capabilities[capability] && model.isAvailable
    );
  }

  getModel(id: string): AIModel | null {
    return this.availableModels.find(model => model.id === id) || null;
  }

  getRecommendedModel(task: 'chat' | 'code' | 'analysis' | 'creative' | 'fast'): AIModel | null {
    const availableModels = this.getAllModels();
    
    switch (task) {
      case 'chat':
        return availableModels.find(m => 
          m.capabilities.chatCompletion && m.performance?.quality === 'excellent'
        ) || availableModels.find(m => m.capabilities.chatCompletion) || null;

      case 'code':
        return availableModels.find(m => 
          m.id.includes('gpt-4') || m.id.includes('claude')
        ) || availableModels.find(m => m.capabilities.chatCompletion) || null;

      case 'analysis':
        return availableModels.find(m => 
          m.performance?.reasoning === 'excellent' && m.contextLength > 8000
        ) || availableModels.find(m => m.capabilities.chatCompletion) || null;

      case 'creative':
        return availableModels.find(m => 
          m.capabilities.textGeneration && m.performance?.quality === 'excellent'
        ) || availableModels.find(m => m.capabilities.textGeneration) || null;

      case 'fast':
        return availableModels.find(m => 
          m.performance?.speed === 'fast' && m.capabilities.chatCompletion
        ) || availableModels.find(m => m.capabilities.chatCompletion) || null;

      default:
        return availableModels[0] || null;
    }
  }

  async compareModels(
    models: string[],
    testPrompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      iterations?: number;
    }
  ): Promise<ModelComparison> {
    const modelObjects = models.map(id => this.getModel(id)).filter(Boolean) as AIModel[];
    const results: ModelComparisonResult[] = [];
    const { maxTokens = 100, temperature = 0.7, iterations = 1 } = options || {};

    for (const model of modelObjects) {
      try {
        const startTime = Date.now();
        
        // Run multiple iterations for better accuracy
        const iterationResults = [];
        for (let i = 0; i < iterations; i++) {
          const response = await aiService.generateText(testPrompt, {
            model: model.id,
            maxTokens,
            temperature,
            provider: model.provider
          });
          
          iterationResults.push({
            response: response.text,
            tokens: response.usage?.totalTokens || this.estimateTokens(response.text),
            responseTime: Date.now() - startTime
          });
        }

        // Calculate averages
        const avgResponseTime = iterationResults.reduce((sum, r) => sum + r.responseTime, 0) / iterations;
        const avgTokens = iterationResults.reduce((sum, r) => sum + r.tokens, 0) / iterations;
        const bestResponse = iterationResults[0].response; // Use first response for display

        const cost = this.calculateCost(model, this.estimateTokens(testPrompt), avgTokens);

        results.push({
          modelId: model.id,
          response: bestResponse,
          metrics: {
            responseTime: avgResponseTime,
            tokenCount: avgTokens,
            cost,
            quality: await this.assessResponseQuality(bestResponse, testPrompt)
          }
        });
      } catch (error) {
        console.error(`Failed to test model ${model.id}:`, error);
        results.push({
          modelId: model.id,
          response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metrics: {
            responseTime: 0,
            tokenCount: 0,
            cost: 0,
            quality: 0
          }
        });
      }
    }

    const comparison: ModelComparison = {
      models: modelObjects,
      testPrompt,
      results,
      createdAt: Date.now()
    };

    await this.saveComparison(comparison);
    return comparison;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    if (!model.costPer1kTokens) return 0;
    
    const inputCost = (inputTokens / 1000) * model.costPer1kTokens.input;
    const outputCost = (outputTokens / 1000) * model.costPer1kTokens.output;
    
    return inputCost + outputCost;
  }

  private async assessResponseQuality(response: string, prompt: string): Promise<number> {
    // Simple quality assessment based on response characteristics
    let score = 5; // Base score out of 10

    // Length appropriateness
    if (response.length > 50 && response.length < 1000) score += 1;
    if (response.length > 100 && response.length < 500) score += 1;

    // Coherence indicators
    if (response.includes('.') || response.includes('!') || response.includes('?')) score += 1;
    
    // Relevance (simple keyword matching)
    const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const responseWords = response.toLowerCase();
    const relevantWords = promptWords.filter(word => responseWords.includes(word));
    score += Math.min(2, relevantWords.length / promptWords.length * 4);

    // Error indicators
    if (response.toLowerCase().includes('error') || response.toLowerCase().includes('sorry')) {
      score -= 3;
    }

    return Math.max(0, Math.min(10, score));
  }

  async getModelPreferences(): Promise<ModelPreferences> {
    try {
      const stored = this.storage.getItem(MODEL_PREFERENCES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading model preferences:', error);
    }

    // Default preferences
    const defaultModel = this.getRecommendedModel('chat')?.id || 'gpt-3.5-turbo';
    return {
      defaultModel,
      providerPreference: 'openai',
      taskPreferences: {
        chat: defaultModel,
        textGeneration: defaultModel,
        imageGeneration: 'dall-e-3',
        codeGeneration: this.getRecommendedModel('code')?.id || defaultModel,
        analysis: this.getRecommendedModel('analysis')?.id || defaultModel
      },
      customSettings: {}
    };
  }

  async saveModelPreferences(preferences: Partial<ModelPreferences>): Promise<void> {
    try {
      const current = await this.getModelPreferences();
      const updated = { ...current, ...preferences };
      this.storage.setItem(MODEL_PREFERENCES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving model preferences:', error);
      throw new Error('Failed to save model preferences');
    }
  }

  async getComparisons(): Promise<ModelComparison[]> {
    try {
      const stored = this.storage.getItem(MODEL_COMPARISONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading model comparisons:', error);
      return [];
    }
  }

  private async saveComparison(comparison: ModelComparison): Promise<void> {
    try {
      const comparisons = await this.getComparisons();
      comparisons.push(comparison);
      
      // Keep only last 20 comparisons
      if (comparisons.length > 20) {
        comparisons.splice(0, comparisons.length - 20);
      }

      this.storage.setItem(MODEL_COMPARISONS_KEY, JSON.stringify(comparisons));
    } catch (error) {
      console.error('Error saving model comparison:', error);
    }
  }

  getModelStats(): {
    totalModels: number;
    availableModels: number;
    providerDistribution: Record<AIProviderType, number>;
    capabilityDistribution: Record<keyof ProviderCapabilities, number>;
  } {
    const available = this.getAllModels();
    
    const providerDistribution: Record<AIProviderType, number> = {
      openai: 0,
      huggingface: 0
    };

    const capabilityDistribution: Record<keyof ProviderCapabilities, number> = {
      textGeneration: 0,
      chatCompletion: 0,
      imageGeneration: 0,
      embeddings: 0,
      streaming: 0
    };

    available.forEach(model => {
      providerDistribution[model.provider]++;
      
      Object.entries(model.capabilities).forEach(([capability, hasCapability]) => {
        if (hasCapability) {
          capabilityDistribution[capability as keyof ProviderCapabilities]++;
        }
      });
    });

    return {
      totalModels: this.availableModels.length,
      availableModels: available.length,
      providerDistribution,
      capabilityDistribution
    };
  }

  async setDefaultModel(modelId: string): Promise<void> {
    const model = this.getModel(modelId);
    if (!model || !model.isAvailable) {
      throw new Error(`Model ${modelId} is not available`);
    }

    const preferences = await this.getModelPreferences();
    preferences.defaultModel = modelId;
    await this.saveModelPreferences(preferences);
  }

  async getOptimalModel(
    requirements: {
      task?: 'chat' | 'code' | 'analysis' | 'creative';
      maxCost?: number;
      minQuality?: 'basic' | 'good' | 'excellent';
      maxResponseTime?: number;
      requiredCapabilities?: (keyof ProviderCapabilities)[];
    }
  ): Promise<AIModel | null> {
    let candidates = this.getAllModels();

    // Filter by required capabilities
    if (requirements.requiredCapabilities) {
      candidates = candidates.filter(model =>
        requirements.requiredCapabilities!.every(capability =>
          model.capabilities[capability]
        )
      );
    }

    // Filter by quality
    if (requirements.minQuality) {
      const qualityOrder = { basic: 0, good: 1, excellent: 2 };
      const minQualityLevel = qualityOrder[requirements.minQuality];
      candidates = candidates.filter(model =>
        model.performance && 
        qualityOrder[model.performance.quality] >= minQualityLevel
      );
    }

    // Filter by cost (if we have cost data)
    if (requirements.maxCost) {
      candidates = candidates.filter(model => {
        if (!model.costPer1kTokens) return true; // Include models without cost data
        // Estimate cost for typical usage (1000 tokens)
        const estimatedCost = model.costPer1kTokens.input + model.costPer1kTokens.output;
        return estimatedCost <= requirements.maxCost!;
      });
    }

    if (candidates.length === 0) return null;

    // Sort by preference for the task
    if (requirements.task) {
      const taskRecommendation = this.getRecommendedModel(requirements.task);
      if (taskRecommendation && candidates.includes(taskRecommendation)) {
        return taskRecommendation;
      }
    }

    // Return the best available model
    return candidates.sort((a, b) => {
      // Prioritize excellent quality
      const aQuality = a.performance?.quality === 'excellent' ? 2 : a.performance?.quality === 'good' ? 1 : 0;
      const bQuality = b.performance?.quality === 'excellent' ? 2 : b.performance?.quality === 'good' ? 1 : 0;
      
      if (aQuality !== bQuality) return bQuality - aQuality;
      
      // Then prioritize fast speed
      const aSpeed = a.performance?.speed === 'fast' ? 2 : a.performance?.speed === 'medium' ? 1 : 0;
      const bSpeed = b.performance?.speed === 'fast' ? 2 : b.performance?.speed === 'medium' ? 1 : 0;
      
      return bSpeed - aSpeed;
    })[0];
  }
}

export const modelService = new ModelService(); 