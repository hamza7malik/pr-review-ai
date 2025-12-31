export interface PrReviewRequest {
  prUrl: string;
}

export interface DuplicateBlock {
  file1: string;
  file2: string;
  lines1: { start: number; end: number };
  lines2: { start: number; end: number };
  code: string;
  similarity: number;
  clusterSize?: number;
  allFiles?: Array<{ file: string; lines: { start: number; end: number } }>; // All affected locations
  patternHash?: string;
}

export interface CodeDuplicationAnalysis {
  percentage: number;
  severity: 'low' | 'medium' | 'high';
  duplicateBlocks: DuplicateBlock[];
  totalLines: number;
  duplicatedLines: number;
}

export interface LlmReviewResponse {
  summary: string;
  high_risk_issues: string[];
  medium_risk_issues: string[];
  low_risk_or_style_issues: string[];
  suggestions: string[];
  questions_for_author: string[];
}

export interface PrReviewResponse extends LlmReviewResponse {
  duplicationAnalysis: CodeDuplicationAnalysis;
}

export interface PrMetadata {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  author: string;
  baseRef: string;
  headRef: string;
}

export interface PrFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}
