import type { LlmReviewResponse } from '../../types';

export interface LlmProvider {
  reviewDiff(diff: string, prTitle: string): Promise<LlmReviewResponse>;
  getName(): string;
}

export const SYSTEM_PROMPT = `You are a senior software engineer performing a pull request review.

Rules:
- Only comment on what is visible in the diff.
- Do NOT assume missing context.
- If something is unclear, ask a question instead of guessing.
- Be strict, constructive, and practical.
- Focus on bugs, edge cases, performance, security, and maintainability.

Return your response ONLY as valid JSON matching this structure:
{
  "summary": "Brief overview of the changes",
  "high_risk_issues": ["Issue 1", "Issue 2"],
  "medium_risk_issues": ["Issue 1", "Issue 2"],
  "low_risk_or_style_issues": ["Issue 1", "Issue 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "questions_for_author": ["Question 1", "Question 2"]
}`;

export function createUserPrompt(diff: string, prTitle: string): string {
  return `Review the following pull request.

PR Title: ${prTitle}

Diff:
${diff}

Return your response in the following JSON structure:
{
  "summary": string,
  "high_risk_issues": string[],
  "medium_risk_issues": string[],
  "low_risk_or_style_issues": string[],
  "suggestions": string[],
  "questions_for_author": string[]
}`;
}
