import { GoogleGenerativeAI } from '@google/generative-ai';
import { LlmProvider, SYSTEM_PROMPT, createUserPrompt } from './base';
import type { LlmReviewResponse } from '../../types';
import { logger } from '../../utils';

export class GeminiProvider implements LlmProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  getName(): string {
    return 'Gemini';
  }

  async reviewDiff(diff: string, prTitle: string): Promise<LlmReviewResponse> {
    try {
      logger.info(`Sending diff to Gemini (${this.model}) for review`);

      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `${SYSTEM_PROMPT}\n\n${createUserPrompt(diff, prTitle)}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const content = response.text();

      if (!content) {
        throw new Error('No response from Gemini');
      }

      const parsed = JSON.parse(content) as LlmReviewResponse;

      logger.info('Successfully received and parsed Gemini review');

      return this.normalizeResponse(parsed);
    } catch (error) {
      logger.error('Failed to get Gemini review', error);

      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message: string }).message;
        if (message.includes('quota')) {
          throw new Error('Gemini API quota exceeded. Please try again later.');
        }
        if (message.includes('API key')) {
          throw new Error('Invalid Gemini API key configuration.');
        }
      }

      throw new Error('Failed to generate review using Gemini');
    }
  }

  private normalizeResponse(parsed: LlmReviewResponse): LlmReviewResponse {
    return {
      summary: parsed.summary || '',
      high_risk_issues: parsed.high_risk_issues || [],
      medium_risk_issues: parsed.medium_risk_issues || [],
      low_risk_or_style_issues: parsed.low_risk_or_style_issues || [],
      suggestions: parsed.suggestions || [],
      questions_for_author: parsed.questions_for_author || [],
    };
  }
}
