import {
  PromptTest,
  PromptTestCase,
  PromptTestResult,
  TestCaseResult,
  EvaluationCriteria,
  CriteriaResult
} from './types';
import { aiService } from './aiService';
import { modelService } from './modelService';

const PROMPT_TESTS_KEY = 'ai_prompt_tests';
const TEST_RESULTS_KEY = 'ai_test_results';

export class PromptEngineeringService {
  private storage = localStorage;

  async getAllTests(): Promise<PromptTest[]> {
    try {
      const stored = this.storage.getItem(PROMPT_TESTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading prompt tests:', error);
      return [];
    }
  }

  async getTest(id: string): Promise<PromptTest | null> {
    const tests = await this.getAllTests();
    return tests.find(t => t.id === id) || null;
  }

  async saveTest(test: PromptTest): Promise<void> {
    const tests = await this.getAllTests();
    const index = tests.findIndex(t => t.id === test.id);

    if (index >= 0) {
      tests[index] = test;
    } else {
      tests.push(test);
    }

    this.storage.setItem(PROMPT_TESTS_KEY, JSON.stringify(tests));
  }

  async createTest(
    name: string,
    prompt: string,
    testCases: Omit<PromptTestCase, 'id'>[],
    models: string[]
  ): Promise<string> {
    const id = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const test: PromptTest = {
      id,
      name,
      prompt,
      testCases: testCases.map((tc, index) => ({
        ...tc,
        id: `case-${index}-${Date.now()}`
      })),
      models,
      createdAt: Date.now()
    };

    await this.saveTest(test);
    return id;
  }

  async updateTest(id: string, updates: Partial<PromptTest>): Promise<void> {
    const test = await this.getTest(id);
    if (!test) {
      throw new Error(`Test ${id} not found`);
    }

    const updatedTest = { ...test, ...updates };
    await this.saveTest(updatedTest);
  }

  async deleteTest(id: string): Promise<void> {
    const tests = await this.getAllTests();
    const filtered = tests.filter(t => t.id !== id);
    this.storage.setItem(PROMPT_TESTS_KEY, JSON.stringify(filtered));

    // Also delete associated results
    await this.deleteTestResults(id);
  }

  async runTest(testId: string, options?: {
    models?: string[];
    iterations?: number;
    concurrent?: boolean;
  }): Promise<PromptTestResult[]> {
    const test = await this.getTest(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const { models = test.models, iterations = 1, concurrent = false } = options || {};
    const results: PromptTestResult[] = [];

    if (concurrent) {
      // Run all models concurrently
      const promises = models.map(modelId => this.runTestForModel(test, modelId, iterations));
      const modelResults = await Promise.allSettled(promises);
      
      modelResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to run test for model ${models[index]}:`, result.reason);
        }
      });
    } else {
      // Run models sequentially
      for (const modelId of models) {
        try {
          const result = await this.runTestForModel(test, modelId, iterations);
          results.push(result);
        } catch (error) {
          console.error(`Failed to run test for model ${modelId}:`, error);
        }
      }
    }

    // Update test with last run time
    await this.updateTest(testId, { lastRunAt: Date.now(), results });

    // Save results
    await this.saveTestResults(testId, results);

    return results;
  }

  private async runTestForModel(
    test: PromptTest,
    modelId: string,
    iterations: number
  ): Promise<PromptTestResult> {
    const model = modelService.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const testCaseResults: TestCaseResult[] = [];
    let totalCost = 0;
    let totalTime = 0;
    let totalTokens = 0;

    for (const testCase of test.testCases) {
      const caseResults: TestCaseResult[] = [];

      // Run multiple iterations for this test case
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        try {
          // Replace variables in the prompt
          const finalPrompt = this.interpolatePrompt(test.prompt, testCase.input);
          
          const response = await aiService.generateText(finalPrompt, {
            model: modelId,
            maxTokens: 500,
            temperature: 0.7
          });

          const responseTime = Date.now() - startTime;
          const tokens = response.usage?.totalTokens || this.estimateTokens(response.text);
          const cost = this.calculateCost(model, this.estimateTokens(finalPrompt), tokens);

          // Evaluate response against criteria
          const criteriaResults = await this.evaluateResponse(
            response.text,
            testCase.expectedOutput || '',
            testCase.evaluationCriteria
          );

          const overallScore = this.calculateOverallScore(criteriaResults);
          const passed = overallScore >= 0.7; // 70% threshold

          caseResults.push({
            testCaseId: testCase.id,
            response: response.text,
            score: overallScore,
            passed,
            criteriaResults,
            metadata: {
              responseTime,
              tokens,
              cost
            }
          });

          totalCost += cost;
          totalTime += responseTime;
          totalTokens += tokens;

        } catch (error) {
          console.error(`Error running test case ${testCase.id}:`, error);
          caseResults.push({
            testCaseId: testCase.id,
            response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            score: 0,
            passed: false,
            criteriaResults: [],
            metadata: {
              responseTime: 0,
              tokens: 0,
              cost: 0
            }
          });
        }
      }

      // Use the best result from iterations
      const bestResult = caseResults.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      testCaseResults.push(bestResult);
    }

    const overallScore = testCaseResults.reduce((sum, result) => sum + result.score, 0) / testCaseResults.length;

    return {
      testId: test.id,
      modelId,
      testCaseResults,
      overallScore,
      executedAt: Date.now(),
      metadata: {
        totalCost,
        totalTime,
        averageTokens: totalTokens / testCaseResults.length
      }
    };
  }

  private interpolatePrompt(prompt: string, input: string): string {
    // Simple variable interpolation - replace {input} with the test input
    return prompt.replace(/\{input\}/g, input);
  }

  private async evaluateResponse(
    response: string,
    expectedOutput: string,
    criteria: EvaluationCriteria[]
  ): Promise<CriteriaResult[]> {
    const results: CriteriaResult[] = [];

    for (const criterion of criteria) {
      let score = 0;
      let passed = false;
      let message = '';

      switch (criterion.type) {
        case 'exact_match':
          passed = response.trim().toLowerCase() === expectedOutput.trim().toLowerCase();
          score = passed ? 1 : 0;
          message = passed ? 'Exact match found' : 'No exact match';
          break;

        case 'contains':
          passed = response.toLowerCase().includes(expectedOutput.toLowerCase());
          score = passed ? 1 : 0;
          message = passed ? 'Expected text found' : 'Expected text not found';
          break;

        case 'similarity':
          score = this.calculateTextSimilarity(response, expectedOutput);
          passed = score >= (criterion.threshold || 0.8);
          message = `Similarity score: ${(score * 100).toFixed(1)}%`;
          break;

        case 'length':
          const actualLength = response.length;
          const expectedLength = parseInt(expectedOutput) || 100;
          const lengthDiff = Math.abs(actualLength - expectedLength) / expectedLength;
          score = Math.max(0, 1 - lengthDiff);
          passed = score >= (criterion.threshold || 0.8);
          message = `Length: ${actualLength} chars (expected ~${expectedLength})`;
          break;

        case 'custom':
          if (criterion.customFunction) {
            try {
              score = criterion.customFunction(response, expectedOutput);
              passed = score >= (criterion.threshold || 0.7);
              message = `Custom evaluation score: ${(score * 100).toFixed(1)}%`;
            } catch (error) {
              score = 0;
              passed = false;
              message = `Custom function error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
          break;

        default:
          console.warn(`Unknown evaluation criteria type: ${criterion.type}`);
      }

      results.push({
        criteriaType: criterion.type,
        score: score * criterion.weight,
        passed,
        message
      });
    }

    return results;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity using word sets
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private calculateOverallScore(criteriaResults: CriteriaResult[]): number {
    if (criteriaResults.length === 0) return 0;
    
    const totalScore = criteriaResults.reduce((sum, result) => sum + result.score, 0);
    const totalWeight = criteriaResults.length; // Assuming equal weights for simplicity
    
    return totalScore / totalWeight;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: any, inputTokens: number, outputTokens: number): number {
    if (!model.costPer1kTokens) return 0;
    
    const inputCost = (inputTokens / 1000) * model.costPer1kTokens.input;
    const outputCost = (outputTokens / 1000) * model.costPer1kTokens.output;
    
    return inputCost + outputCost;
  }

  async optimizePrompt(
    basePrompt: string,
    testCases: PromptTestCase[],
    models: string[],
    options?: {
      maxIterations?: number;
      improvementThreshold?: number;
      variations?: string[];
    }
  ): Promise<{
    optimizedPrompt: string;
    improvementScore: number;
    iterations: Array<{
      prompt: string;
      score: number;
      results: PromptTestResult[];
    }>;
  }> {
    const { maxIterations = 5, improvementThreshold = 0.1, variations = [] } = options || {};
    
    let bestScore = 0;
    let bestPrompt = basePrompt;
    const iterations: Array<{ prompt: string; score: number; results: PromptTestResult[] }> = [];

    // Test base prompt
    const baseTestId = await this.createTest('optimization_base', basePrompt, testCases, models);
    const baseResults = await this.runTest(baseTestId);
    const baseScore = this.calculateAverageScore(baseResults);
    
    bestScore = baseScore;
    iterations.push({ prompt: basePrompt, score: baseScore, results: baseResults });

    // Generate and test variations
    const promptVariations = this.generatePromptVariations(basePrompt, variations);
    
    for (let i = 0; i < Math.min(maxIterations, promptVariations.length); i++) {
      const variationPrompt = promptVariations[i];
      
      try {
        const testId = await this.createTest(`optimization_${i}`, variationPrompt, testCases, models);
        const results = await this.runTest(testId);
        const score = this.calculateAverageScore(results);
        
        iterations.push({ prompt: variationPrompt, score, results });
        
        if (score > bestScore + improvementThreshold) {
          bestScore = score;
          bestPrompt = variationPrompt;
        }
        
        // Clean up temporary test
        await this.deleteTest(testId);
        
      } catch (error) {
        console.error(`Error testing prompt variation ${i}:`, error);
      }
    }

    // Clean up base test
    await this.deleteTest(baseTestId);

    return {
      optimizedPrompt: bestPrompt,
      improvementScore: bestScore - baseScore,
      iterations
    };
  }

  private generatePromptVariations(basePrompt: string, customVariations: string[]): string[] {
    const variations: string[] = [...customVariations];
    
    // Generate automatic variations
    const templates = [
      `${basePrompt}\n\nPlease provide a detailed response.`,
      `${basePrompt}\n\nThink step by step and explain your reasoning.`,
      `You are an expert assistant. ${basePrompt}`,
      `${basePrompt}\n\nBe concise and direct in your response.`,
      `${basePrompt}\n\nProvide examples where relevant.`,
      `Context: You should be helpful and accurate.\n\n${basePrompt}`,
      `${basePrompt}\n\nIf you're unsure, explain what information you would need.`
    ];
    
    variations.push(...templates);
    
    return variations.filter((v, index, self) => self.indexOf(v) === index); // Remove duplicates
  }

  private calculateAverageScore(results: PromptTestResult[]): number {
    if (results.length === 0) return 0;
    
    const totalScore = results.reduce((sum, result) => sum + result.overallScore, 0);
    return totalScore / results.length;
  }

  async getTestResults(testId: string): Promise<PromptTestResult[]> {
    try {
      const stored = this.storage.getItem(TEST_RESULTS_KEY);
      const allResults: Record<string, PromptTestResult[]> = stored ? JSON.parse(stored) : {};
      return allResults[testId] || [];
    } catch (error) {
      console.error('Error loading test results:', error);
      return [];
    }
  }

  private async saveTestResults(testId: string, results: PromptTestResult[]): Promise<void> {
    try {
      const stored = this.storage.getItem(TEST_RESULTS_KEY);
      const allResults: Record<string, PromptTestResult[]> = stored ? JSON.parse(stored) : {};
      allResults[testId] = results;
      
      // Keep only last 50 test results to prevent storage bloat
      const entries = Object.entries(allResults);
      if (entries.length > 50) {
        const sortedEntries = entries.sort((a, b) => {
          const aLatest = Math.max(...a[1].map(r => r.executedAt));
          const bLatest = Math.max(...b[1].map(r => r.executedAt));
          return bLatest - aLatest;
        });
        
        const trimmedResults: Record<string, PromptTestResult[]> = {};
        sortedEntries.slice(0, 50).forEach(([id, results]) => {
          trimmedResults[id] = results;
        });
        
        this.storage.setItem(TEST_RESULTS_KEY, JSON.stringify(trimmedResults));
      } else {
        this.storage.setItem(TEST_RESULTS_KEY, JSON.stringify(allResults));
      }
    } catch (error) {
      console.error('Error saving test results:', error);
    }
  }

  private async deleteTestResults(testId: string): Promise<void> {
    try {
      const stored = this.storage.getItem(TEST_RESULTS_KEY);
      const allResults: Record<string, PromptTestResult[]> = stored ? JSON.parse(stored) : {};
      delete allResults[testId];
      this.storage.setItem(TEST_RESULTS_KEY, JSON.stringify(allResults));
    } catch (error) {
      console.error('Error deleting test results:', error);
    }
  }

  async comparePrompts(
    prompts: string[],
    testCases: PromptTestCase[],
    models: string[]
  ): Promise<{
    comparison: Array<{
      prompt: string;
      score: number;
      results: PromptTestResult[];
    }>;
    winner: {
      prompt: string;
      score: number;
    };
  }> {
    const comparison: Array<{ prompt: string; score: number; results: PromptTestResult[] }> = [];
    
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      
      try {
        const testId = await this.createTest(`comparison_${i}`, prompt, testCases, models);
        const results = await this.runTest(testId);
        const score = this.calculateAverageScore(results);
        
        comparison.push({ prompt, score, results });
        
        // Clean up temporary test
        await this.deleteTest(testId);
        
      } catch (error) {
        console.error(`Error testing prompt ${i}:`, error);
        comparison.push({
          prompt,
          score: 0,
          results: []
        });
      }
    }
    
    const winner = comparison.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    return { comparison, winner };
  }

  async getTestStatistics(): Promise<{
    totalTests: number;
    totalRuns: number;
    averageScore: number;
    modelPerformance: Record<string, number>;
    recentActivity: Array<{ date: string; testsRun: number }>;
  }> {
    const tests = await this.getAllTests();
    let totalRuns = 0;
    let totalScore = 0;
    const modelScores: Record<string, number[]> = {};
    const dailyActivity: Record<string, number> = {};
    
    for (const test of tests) {
      if (test.results) {
        totalRuns += test.results.length;
        
        test.results.forEach(result => {
          totalScore += result.overallScore;
          
          if (!modelScores[result.modelId]) {
            modelScores[result.modelId] = [];
          }
          modelScores[result.modelId].push(result.overallScore);
          
          const date = new Date(result.executedAt).toDateString();
          dailyActivity[date] = (dailyActivity[date] || 0) + 1;
        });
      }
    }
    
    const modelPerformance: Record<string, number> = {};
    Object.entries(modelScores).forEach(([modelId, scores]) => {
      modelPerformance[modelId] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });
    
    const recentActivity = Object.entries(dailyActivity)
      .map(([date, testsRun]) => ({ date, testsRun }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7); // Last 7 days
    
    return {
      totalTests: tests.length,
      totalRuns,
      averageScore: totalRuns > 0 ? totalScore / totalRuns : 0,
      modelPerformance,
      recentActivity
    };
  }
}

export const promptEngineeringService = new PromptEngineeringService(); 