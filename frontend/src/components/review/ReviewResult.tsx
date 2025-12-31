import { useState } from "react";
import type { PrReviewResponse } from "@/features/review";
import { ReviewSection, IssueList } from ".";
import { DuplicationIndicator } from "./DuplicationIndicator";
import { DuplicateBlocksList } from "./DuplicateBlocksList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";
import {
  FileText,
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  HelpCircle,
  Copy,
} from "lucide-react";

interface ReviewResultProps {
  review: PrReviewResponse;
}

export function ReviewResult({ review }: ReviewResultProps) {
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Code Duplication Analysis */}
      {review.duplicationAnalysis && (
        <>
          <DuplicationIndicator
            percentage={review.duplicationAnalysis.percentage}
            severity={review.duplicationAnalysis.severity}
            duplicatedLines={review.duplicationAnalysis.duplicatedLines}
            totalLines={review.duplicationAnalysis.totalLines}
            duplicateBlocksCount={
              review.duplicationAnalysis.duplicateBlocks.length
            }
            onViewDetails={() => setIsDuplicateModalOpen(true)}
          />

          {/* Duplicate Blocks Modal */}
          <Dialog
            open={isDuplicateModalOpen}
            onOpenChange={setIsDuplicateModalOpen}
          >
            <DialogContent className="max-w-5xl w-[calc(100%-2rem)]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg pr-6">
                  <Copy className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Duplicate Code Blocks</span>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {review.duplicationAnalysis.duplicateBlocks.length} duplicate
                  or highly similar code block
                  {review.duplicationAnalysis.duplicateBlocks.length !== 1
                    ? "s"
                    : ""}{" "}
                  found in this PR
                </DialogDescription>
              </DialogHeader>
              <DuplicateBlocksList
                blocks={review.duplicationAnalysis.duplicateBlocks}
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      <ReviewSection title="Summary" icon={<FileText className="h-5 w-5" />}>
        <p className="text-sm leading-relaxed">{review.summary}</p>
      </ReviewSection>

      <ReviewSection
        title="High Risk Issues"
        icon={<AlertCircle className="h-5 w-5 text-red-600" />}
      >
        <IssueList items={review.high_risk_issues} variant="high" />
      </ReviewSection>

      <ReviewSection
        title="Medium Risk Issues"
        icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
      >
        <IssueList items={review.medium_risk_issues} variant="medium" />
      </ReviewSection>

      <ReviewSection
        title="Low Risk / Style Issues"
        icon={<Info className="h-5 w-5 text-blue-600" />}
      >
        <IssueList items={review.low_risk_or_style_issues} variant="low" />
      </ReviewSection>

      <ReviewSection
        title="Suggestions"
        icon={<Lightbulb className="h-5 w-5 text-green-600" />}
      >
        {review.suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No suggestions at this time.
          </p>
        ) : (
          <ul className="space-y-2">
            {review.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span className="text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>

      <ReviewSection
        title="Questions for Author"
        icon={<HelpCircle className="h-5 w-5 text-purple-600" />}
      >
        {review.questions_for_author.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No questions at this time.
          </p>
        ) : (
          <ul className="space-y-2">
            {review.questions_for_author.map((question, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">?</span>
                <span className="text-sm">{question}</span>
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>
    </div>
  );
}
