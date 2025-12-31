import type { LlmReviewResponse } from '../types';
import { llmProviderFactory } from './llm/factory';

class LlmService {
  async reviewDiff(diff: string, prTitle: string): Promise<LlmReviewResponse> {
    const provider = llmProviderFactory.createProvider();
    return provider.reviewDiff(diff, prTitle);
  }
}

export const llmService = new LlmService();
