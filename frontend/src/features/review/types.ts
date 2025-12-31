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
}

export interface CodeDuplicationAnalysis {
  percentage: number;
  severity: "low" | "medium" | "high";
  duplicateBlocks: DuplicateBlock[];
  totalLines: number;
  duplicatedLines: number;
}

export interface PrReviewResponse {
  summary: string;
  high_risk_issues: string[];
  medium_risk_issues: string[];
  low_risk_or_style_issues: string[];
  suggestions: string[];
  questions_for_author: string[];
  duplicationAnalysis: CodeDuplicationAnalysis;
}

export interface ReviewState {
  prUrl: string;
  setPrUrl: (url: string) => void;
  clearPrUrl: () => void;
}
