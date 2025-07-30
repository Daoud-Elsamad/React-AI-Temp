import {
  PromptTemplate,
  PromptVariable,
  PromptTemplateCategory,
  PromptExecution,
  AIProviderType
} from './types';

const PROMPT_TEMPLATES_KEY = 'ai_prompt_templates';
const PROMPT_EXECUTIONS_KEY = 'ai_prompt_executions';

// Built-in prompt templates
const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  // General Templates
  {
    id: 'explain-concept',
    name: 'Explain a Concept',
    description: 'Get a clear, detailed explanation of any concept or topic',
    category: 'general',
    template: 'Please explain {{concept}} in {{detail_level}} detail. {{additional_context}}',
    variables: [
      {
        name: 'concept',
        type: 'text',
        description: 'The concept or topic to explain',
        required: true,
        placeholder: 'e.g., quantum computing, photosynthesis, blockchain'
      },
      {
        name: 'detail_level',
        type: 'select',
        description: 'Level of detail for the explanation',
        required: true,
        options: ['simple', 'moderate', 'comprehensive', 'expert'],
        defaultValue: 'moderate'
      },
      {
        name: 'additional_context',
        type: 'textarea',
        description: 'Any additional context or specific aspects to focus on',
        required: false,
        placeholder: 'Include examples, focus on practical applications, etc.'
      }
    ],
    tags: ['explanation', 'learning', 'education'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true
  },
  {
    id: 'pros-cons-analysis',
    name: 'Pros and Cons Analysis',
    description: 'Analyze the advantages and disadvantages of a decision or topic',
    category: 'analysis',
    template: 'Analyze the pros and cons of {{topic}}. Consider {{perspective}} perspective and include {{factors}}.',
    variables: [
      {
        name: 'topic',
        type: 'text',
        description: 'The topic or decision to analyze',
        required: true,
        placeholder: 'e.g., remote work, electric vehicles, starting a business'
      },
      {
        name: 'perspective',
        type: 'select',
        description: 'Perspective to consider',
        required: true,
        options: ['personal', 'business', 'environmental', 'economic', 'social'],
        defaultValue: 'personal'
      },
      {
        name: 'factors',
        type: 'text',
        description: 'Specific factors to consider',
        required: false,
        placeholder: 'cost, time, environmental impact, etc.'
      }
    ],
    tags: ['analysis', 'decision-making', 'comparison'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true
  },

  // Code Templates
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Get a thorough review of your code with suggestions for improvement',
    category: 'code',
    template: 'Please review this {{language}} code and provide feedback on:\n- Code quality and best practices\n- Performance optimizations\n- Security considerations\n- Maintainability\n\n```{{language}}\n{{code}}\n```\n\nFocus on: {{focus_areas}}',
    variables: [
      {
        name: 'language',
        type: 'select',
        description: 'Programming language',
        required: true,
        options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby'],
        defaultValue: 'JavaScript'
      },
      {
        name: 'code',
        type: 'textarea',
        description: 'The code to review',
        required: true,
        placeholder: 'Paste your code here...'
      },
      {
        name: 'focus_areas',
        type: 'text',
        description: 'Specific areas to focus on',
        required: false,
        placeholder: 'performance, security, readability, etc.'
      }
    ],
    tags: ['code-review', 'programming', 'quality-assurance'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true
  },
  {
    id: 'debug-code',
    name: 'Debug Code',
    description: 'Help identify and fix bugs in your code',
    category: 'code',
    template: 'I\'m having trouble with this {{language}} code. The issue is: {{problem_description}}\n\n```{{language}}\n{{code}}\n```\n\nError message (if any): {{error_message}}\n\nPlease help me debug this and provide a corrected version.',
    variables: [
      {
        name: 'language',
        type: 'select',
        description: 'Programming language',
        required: true,
        options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby'],
        defaultValue: 'JavaScript'
      },
      {
        name: 'code',
        type: 'textarea',
        description: 'The problematic code',
        required: true,
        placeholder: 'Paste your code here...'
      },
      {
        name: 'problem_description',
        type: 'textarea',
        description: 'Describe what the code should do vs what it\'s actually doing',
        required: true,
        placeholder: 'Expected: ... Actual: ...'
      },
      {
        name: 'error_message',
        type: 'textarea',
        description: 'Any error messages you\'re seeing',
        required: false,
        placeholder: 'Copy the error message here...'
      }
    ],
    tags: ['debugging', 'programming', 'troubleshooting'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true
  },

  // Creative Templates
  {
    id: 'story-generator',
    name: 'Story Generator',
    description: 'Generate creative stories with customizable elements',
    category: 'creative',
    template: 'Write a {{story_length}} {{genre}} story about {{main_character}} who {{situation}}. The setting is {{setting}} and the tone should be {{tone}}. {{additional_elements}}',
    variables: [
      {
        name: 'story_length',
        type: 'select',
        description: 'Length of the story',
        required: true,
        options: ['short', 'medium-length', 'long'],
        defaultValue: 'short'
      },
      {
        name: 'genre',
        type: 'select',
        description: 'Story genre',
        required: true,
        options: ['fantasy', 'sci-fi', 'mystery', 'romance', 'horror', 'adventure', 'comedy', 'drama'],
        defaultValue: 'adventure'
      },
      {
        name: 'main_character',
        type: 'text',
        description: 'Main character description',
        required: true,
        placeholder: 'e.g., a young wizard, detective, space explorer'
      },
      {
        name: 'situation',
        type: 'text',
        description: 'Initial situation or conflict',
        required: true,
        placeholder: 'e.g., discovers a hidden treasure map, receives a mysterious letter'
      },
      {
        name: 'setting',
        type: 'text',
        description: 'Where and when the story takes place',
        required: true,
        placeholder: 'e.g., medieval castle, future Mars colony, modern city'
      },
      {
        name: 'tone',
        type: 'select',
        description: 'Story tone',
        required: true,
        options: ['light-hearted', 'serious', 'mysterious', 'humorous', 'dramatic', 'suspenseful'],
        defaultValue: 'light-hearted'
      },
      {
        name: 'additional_elements',
        type: 'textarea',
        description: 'Additional elements to include',
        required: false,
        placeholder: 'Include a talking animal, unexpected plot twist, etc.'
      }
    ],
    tags: ['creative-writing', 'storytelling', 'fiction'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true
  },

  // Business Templates
  {
    id: 'business-plan',
    name: 'Business Plan Section',
    description: 'Generate specific sections of a business plan',
    category: 'business',
    template: 'Create a {{section}} section for a business plan for {{business_type}} called "{{business_name}}". {{target_audience}} {{additional_requirements}}',
    variables: [
      {
        name: 'section',
        type: 'select',
        description: 'Business plan section',
        required: true,
        options: ['executive summary', 'market analysis', 'marketing strategy', 'financial projections', 'competitive analysis', 'operations plan'],
        defaultValue: 'executive summary'
      },
      {
        name: 'business_type',
        type: 'text',
        description: 'Type of business',
        required: true,
        placeholder: 'e.g., restaurant, tech startup, consulting firm'
      },
      {
        name: 'business_name',
        type: 'text',
        description: 'Business name',
        required: true,
        placeholder: 'Enter your business name'
      },
      {
        name: 'target_audience',
        type: 'text',
        description: 'Target audience description',
        required: false,
        placeholder: 'Target customers: young professionals, small businesses, etc.'
      },
      {
        name: 'additional_requirements',
        type: 'textarea',
        description: 'Additional requirements or focus areas',
        required: false,
        placeholder: 'Include specific metrics, focus on sustainability, etc.'
      }
    ],
    tags: ['business-planning', 'entrepreneurship', 'strategy'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true
  },
  {
    id: 'email-template',
    name: 'Professional Email',
    description: 'Generate professional emails for various business purposes',
    category: 'business',
    template: 'Write a {{email_type}} email {{recipient}}. The subject should be about {{subject}}. {{tone_instruction}} {{additional_context}}',
    variables: [
      {
        name: 'email_type',
        type: 'select',
        description: 'Type of email',
        required: true,
        options: ['follow-up', 'introduction', 'proposal', 'meeting request', 'thank you', 'apology', 'inquiry'],
        defaultValue: 'follow-up'
      },
      {
        name: 'recipient',
        type: 'text',
        description: 'Who you\'re writing to',
        required: true,
        placeholder: 'to a potential client, to my team, to a vendor'
      },
      {
        name: 'subject',
        type: 'text',
        description: 'Main subject or topic',
        required: true,
        placeholder: 'project update, meeting scheduling, partnership opportunity'
      },
      {
        name: 'tone_instruction',
        type: 'select',
        description: 'Email tone',
        required: true,
        options: ['formal and professional', 'friendly but professional', 'casual', 'urgent', 'apologetic'],
        defaultValue: 'friendly but professional'
      },
      {
        name: 'additional_context',
        type: 'textarea',
        description: 'Additional context or specific points to include',
        required: false,
        placeholder: 'Include specific dates, reference previous conversation, etc.'
      }
    ],
    tags: ['email', 'communication', 'professional'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true
  }
];

export class PromptTemplateService {
  private storage = localStorage;

  constructor() {
    this.initializeBuiltInTemplates();
  }

  private async initializeBuiltInTemplates(): Promise<void> {
    const existingTemplates = await this.getAllTemplates();
    const builtInIds = new Set(BUILT_IN_TEMPLATES.map(t => t.id));
    const existingBuiltInIds = new Set(
      existingTemplates.filter(t => t.isBuiltIn).map(t => t.id)
    );

    // Add new built-in templates
    for (const template of BUILT_IN_TEMPLATES) {
      if (!existingBuiltInIds.has(template.id)) {
        await this.saveTemplate(template);
      }
    }

    // Remove obsolete built-in templates
    for (const template of existingTemplates) {
      if (template.isBuiltIn && !builtInIds.has(template.id)) {
        await this.deleteTemplate(template.id);
      }
    }
  }

  async getAllTemplates(): Promise<PromptTemplate[]> {
    try {
      const stored = this.storage.getItem(PROMPT_TEMPLATES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading prompt templates:', error);
      return [];
    }
  }

  async getTemplatesByCategory(category: PromptTemplate['category']): Promise<PromptTemplate[]> {
    const templates = await this.getAllTemplates();
    return templates.filter(t => t.category === category);
  }

  async getTemplate(id: string): Promise<PromptTemplate | null> {
    const templates = await this.getAllTemplates();
    return templates.find(t => t.id === id) || null;
  }

  async saveTemplate(template: PromptTemplate): Promise<void> {
    const templates = await this.getAllTemplates();
    const index = templates.findIndex(t => t.id === template.id);

    if (index >= 0) {
      templates[index] = { ...template, updatedAt: Date.now() };
    } else {
      templates.push(template);
    }

    this.storage.setItem(PROMPT_TEMPLATES_KEY, JSON.stringify(templates));
  }

  async createTemplate(
    name: string,
    description: string,
    category: PromptTemplate['category'],
    template: string,
    variables: PromptVariable[],
    tags: string[] = []
  ): Promise<string> {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: PromptTemplate = {
      id,
      name,
      description,
      category,
      template,
      variables,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      isBuiltIn: false
    };

    await this.saveTemplate(newTemplate);
    return id;
  }

  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<void> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    if (template.isBuiltIn) {
      throw new Error('Cannot modify built-in templates');
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: Date.now()
    };

    await this.saveTemplate(updatedTemplate);
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    if (template.isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }

    const templates = await this.getAllTemplates();
    const filtered = templates.filter(t => t.id !== id);
    this.storage.setItem(PROMPT_TEMPLATES_KEY, JSON.stringify(filtered));
  }

  async searchTemplates(query: string): Promise<PromptTemplate[]> {
    const templates = await this.getAllTemplates();
    const searchTerm = query.toLowerCase();

    return templates.filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      template.template.toLowerCase().includes(searchTerm)
    );
  }

  async getTemplateCategories(): Promise<PromptTemplateCategory[]> {
    const templates = await this.getAllTemplates();
    const categories: Record<string, PromptTemplateCategory> = {};

    // Initialize categories
    const categoryInfo = {
      general: { name: 'General', description: 'General purpose templates', icon: '💬' },
      code: { name: 'Code', description: 'Programming and development templates', icon: '💻' },
      creative: { name: 'Creative', description: 'Creative writing and content generation', icon: '🎨' },
      business: { name: 'Business', description: 'Business and professional templates', icon: '💼' },
      analysis: { name: 'Analysis', description: 'Analysis and research templates', icon: '📊' },
      custom: { name: 'Custom', description: 'User-created templates', icon: '⚙️' }
    };

    Object.entries(categoryInfo).forEach(([id, info]) => {
      categories[id] = {
        id,
        ...info,
        templates: []
      };
    });

    // Group templates by category
    templates.forEach(template => {
      if (categories[template.category]) {
        categories[template.category].templates.push(template);
      }
    });

    return Object.values(categories);
  }

  generatePrompt(template: PromptTemplate, variables: Record<string, any>): string {
    let prompt = template.template;

    // Replace variables in the template
    template.variables.forEach(variable => {
      const value = variables[variable.name];
      const placeholder = `{{${variable.name}}}`;

      if (value !== undefined && value !== null) {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
      } else if (variable.required) {
        throw new Error(`Required variable '${variable.name}' is missing`);
      } else {
        // Remove placeholder for optional variables
        prompt = prompt.replace(new RegExp(placeholder, 'g'), '');
      }
    });

    // Clean up any remaining whitespace
    prompt = prompt.replace(/\s+/g, ' ').trim();

    return prompt;
  }

  async executeTemplate(
    template: PromptTemplate,
    variables: Record<string, any>,
    provider?: AIProviderType,
    model?: string
  ): Promise<PromptExecution> {
    const generatedPrompt = this.generatePrompt(template, variables);
    
    const execution: PromptExecution = {
      templateId: template.id,
      variables,
      generatedPrompt,
      timestamp: Date.now(),
      provider,
      model
    };

    // Increment usage count
    await this.incrementUsageCount(template.id);

    // Save execution history
    await this.saveExecution(execution);

    return execution;
  }

  private async incrementUsageCount(templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
      await this.saveTemplate(template);
    }
  }

  private async saveExecution(execution: PromptExecution): Promise<void> {
    try {
      const stored = this.storage.getItem(PROMPT_EXECUTIONS_KEY);
      const executions: PromptExecution[] = stored ? JSON.parse(stored) : [];
      
      executions.push(execution);
      
      // Keep only last 100 executions to prevent storage bloat
      if (executions.length > 100) {
        executions.splice(0, executions.length - 100);
      }

      this.storage.setItem(PROMPT_EXECUTIONS_KEY, JSON.stringify(executions));
    } catch (error) {
      console.error('Error saving prompt execution:', error);
    }
  }

  async getExecutionHistory(templateId?: string): Promise<PromptExecution[]> {
    try {
      const stored = this.storage.getItem(PROMPT_EXECUTIONS_KEY);
      const executions: PromptExecution[] = stored ? JSON.parse(stored) : [];

      if (templateId) {
        return executions.filter(e => e.templateId === templateId);
      }

      return executions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error loading execution history:', error);
      return [];
    }
  }

  async validateVariables(template: PromptTemplate, variables: Record<string, any>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    template.variables.forEach(variable => {
      const value = variables[variable.name];

      // Check required fields
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`${variable.name} is required`);
        return;
      }

      if (value !== undefined && value !== null && value !== '') {
        // Validate by type
        switch (variable.type) {
          case 'number': {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              errors.push(`${variable.name} must be a number`);
            } else if (variable.validation?.min !== undefined && numValue < variable.validation.min) {
              errors.push(`${variable.name} must be at least ${variable.validation.min}`);
            } else if (variable.validation?.max !== undefined && numValue > variable.validation.max) {
              errors.push(`${variable.name} must be at most ${variable.validation.max}`);
            }
            break;
          }

          case 'select':
            if (variable.options && !variable.options.includes(value)) {
              errors.push(`${variable.name} must be one of: ${variable.options.join(', ')}`);
            }
            break;

          case 'text':
          case 'textarea': {
            const strValue = String(value);
            if (variable.validation?.min !== undefined && strValue.length < variable.validation.min) {
              errors.push(`${variable.name} must be at least ${variable.validation.min} characters`);
            } else if (variable.validation?.max !== undefined && strValue.length > variable.validation.max) {
              errors.push(`${variable.name} must be at most ${variable.validation.max} characters`);
            } else if (variable.validation?.pattern) {
              const regex = new RegExp(variable.validation.pattern);
              if (!regex.test(strValue)) {
                errors.push(variable.validation.message || `${variable.name} format is invalid`);
              }
            }
            break;
          }
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const promptTemplateService = new PromptTemplateService(); 