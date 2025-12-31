import OpenAI from 'openai';
import { LlmProvider, SYSTEM_PROMPT, createUserPrompt } from './base';
import type { LlmReviewResponse } from '../../types';
import { logger } from '../../utils';

export class OpenAiProvider implements LlmProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  getName(): string {
    return 'OpenAI';
  }

  async reviewDiff(diff: string, prTitle: string): Promise<LlmReviewResponse> {
    try {
      logger.info(`Sending diff to OpenAI (${this.model}) for review`);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: createUserPrompt(diff, prTitle) },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content) as LlmReviewResponse;

      logger.info('Successfully received and parsed OpenAI review');

      return this.normalizeResponse(parsed);
    } catch (error) {
      logger.error('Failed to get OpenAI review', error);

      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message: string }).message;
        if (message.includes('rate_limit')) {
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        }
        if (message.includes('invalid_api_key')) {
          throw new Error('Invalid OpenAI API key configuration.');
        }
      }

      throw new Error('Failed to generate review using OpenAI');
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
