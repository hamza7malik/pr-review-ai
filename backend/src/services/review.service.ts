import { GitHubService } from './github.service';
import { llmService } from '.';
import { duplicationService } from './duplication.service';
import type { PrReviewResponse } from '../types';
import { parsePrUrl, chunkDiff, logger } from '../utils';

class ReviewService {
  async reviewPullRequest(prUrl: string, userToken?: string): Promise<PrReviewResponse> {
    try {
      logger.info(`Starting review for PR: ${prUrl}`);

      const { owner, repo, pullNumber } = parsePrUrl(prUrl);

      const githubService = new GitHubService(userToken);

      const [metadata, files] = await Promise.all([
        githubService.getPrMetadata(owner, repo, pullNumber),
        githubService.getPrFiles(owner, repo, pullNumber),
      ]);

      logger.info(`Fetched ${files.length} files from PR`);

      if (files.length === 0) {
        return {
          summary: 'This PR contains no file changes.',
          high_risk_issues: [],
          medium_risk_issues: [],
          low_risk_or_style_issues: [],
          suggestions: [],
          questions_for_author: [],
          duplicationAnalysis: {
            percentage: 0,
            severity: 'low',
            duplicateBlocks: [],
            totalLines: 0,
            duplicatedLines: 0,
          },
        };
      }

      const [duplicationAnalysis, diff] = await Promise.all([
        Promise.resolve(duplicationService.analyzeDuplication(files)),
        Promise.resolve(chunkDiff(files)),
      ]);

      const review = await llmService.reviewDiff(diff, metadata.title);

      logger.info('Review completed successfully');

      return {
        ...review,
        duplicationAnalysis,
      };
    } catch (error) {
      logger.error('Review service error', error);
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
