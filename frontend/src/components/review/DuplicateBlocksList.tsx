import { Copy, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DuplicateBlock {
  file1: string;
  file2: string;
  lines1: { start: number; end: number };
  lines2: { start: number; end: number };
  code: string;
  similarity: number;
  clusterSize?: number;
  allFiles?: Array<{ file: string; lines: { start: number; end: number } }>;
  patternHash?: string;
}

interface DuplicateBlocksListProps {
  blocks: DuplicateBlock[];
}

export function DuplicateBlocksList({ blocks }: DuplicateBlocksListProps) {
  if (blocks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No duplicate code blocks found.
      </div>
    );
  }

  const formatFileName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const getSimilarityBadge = (similarity: number) => {
    const percentage = Math.round(similarity * 100);
    if (percentage === 100) {
      return <Badge variant="destructive">100% Match</Badge>;
    }
    if (percentage >= 90) {
      return <Badge variant="destructive">{percentage}% Similar</Badge>;
    }
    return <Badge variant="secondary">{percentage}% Similar</Badge>;
  };

  return (
    <div className="space-y-4">
      {blocks.slice(0, 10).map((block, index) => {
        const isCluster = block.clusterSize && block.clusterSize > 2;

        return (
          <div
            key={index}
            className="border rounded-lg p-3 sm:p-4 space-y-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {isCluster
                    ? `Pattern Found in ${block.clusterSize} Files`
                    : `Duplicate #${index + 1}`}
                </span>
              </div>
              {getSimilarityBadge(block.similarity)}
            </div>

            {isCluster && block.allFiles ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  This pattern appears in the following files:
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-sm">
                  {block.allFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-2 sm:p-3 rounded"
                    >
                      <FileCode className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-blue-700 dark:text-blue-400 truncate text-xs sm:text-sm">
                          {formatFileName(file.file)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate break-all">
                          {file.file}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-1">
                          Lines {file.lines.start}-{file.lines.end}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 p-2 sm:p-3 rounded">
                  <FileCode className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-blue-700 dark:text-blue-400 truncate text-xs sm:text-sm">
                      {formatFileName(block.file1)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate break-all">
                      {block.file1}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-1">
                      Lines {block.lines1.start}-{block.lines1.end}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-purple-50 dark:bg-purple-950 p-2 sm:p-3 rounded">
                  <FileCode className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-purple-700 dark:text-purple-400 truncate text-xs sm:text-sm">
                      {formatFileName(block.file2)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate break-all">
                      {block.file2}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-1">
                      Lines {block.lines2.start}-{block.lines2.end}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-2 sm:p-3 rounded text-[10px] sm:text-xs overflow-x-auto max-h-40 overflow-y-auto">
                <code className="break-all whitespace-pre-wrap sm:whitespace-pre">
                  {block.code}
                </code>
              </pre>
              <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                <Badge
                  variant="outline"
                  className="text-[10px] sm:text-xs bg-slate-800 text-white border-slate-700"
                >
                  {block.lines1.end - block.lines1.start + 1} lines
                </Badge>
              </div>
            </div>

            {block.similarity === 1.0 && (
              <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 p-2 sm:p-3 rounded flex items-start gap-2">
                <span className="text-base sm:text-lg flex-shrink-0">💡</span>
                <div className="min-w-0">
                  <div className="font-medium">Refactoring Suggestion</div>
                  <div className="text-amber-600 dark:text-amber-500">
                    {isCluster
                      ? `This pattern appears in ${block.clusterSize} files. Consider extracting it into a shared utility or hook.`
                      : `Consider extracting this code into a shared function or utility to reduce duplication.`}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {blocks.length > 10 && (
        <div className="text-center text-xs sm:text-sm text-muted-foreground pt-2 border-t">
          Showing 10 of {blocks.length} duplicate blocks. Consider refactoring
          to reduce duplication.
        </div>
      )}
    </div>
  );
}
