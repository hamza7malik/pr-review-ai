import crypto from 'crypto';
import type { PrFile, CodeDuplicationAnalysis, DuplicateBlock } from '../types';
import { logger } from '../utils';

interface CodeBlock {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
  normalizedCode: string;
  hash: string;
}

class DuplicationService {
  private readonly MIN_BLOCK_SIZE = 10;
  private readonly SIMILARITY_THRESHOLD = 0.85;

  /**
   * Analyze code duplication across PR files
   */
  analyzeDuplication(files: PrFile[]): CodeDuplicationAnalysis {
    try {
      logger.info('Starting code duplication analysis');

      // Extract code blocks from all files
      const blocks = this.extractCodeBlocks(files);

      // Find duplicates
      const duplicates = this.findDuplicates(blocks);

      // Calculate metrics
      const totalLines = this.calculateTotalLines(files);
      const duplicatedLines = this.calculateDuplicatedLines(duplicates);
      const percentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;
      const severity = this.calculateSeverity(percentage);

      logger.info(
        `Duplication analysis complete: ${percentage.toFixed(1)}% duplication, ${duplicates.length} blocks`
      );

      return {
        percentage: Math.round(percentage * 10) / 10,
        severity,
        duplicateBlocks: duplicates,
        totalLines,
        duplicatedLines,
      };
    } catch (error) {
      logger.error('Error in duplication analysis', error);
      return {
        percentage: 0,
        severity: 'low',
        duplicateBlocks: [],
        totalLines: 0,
        duplicatedLines: 0,
      };
    }
  }

  /**
   * Extract code blocks from files
   */
  private extractCodeBlocks(files: PrFile[]): CodeBlock[] {
    const blocks: CodeBlock[] = [];

    for (const file of files) {
      if (this.shouldSkipFile(file.filename)) {
        continue;
      }

      if (!file.patch) {
        continue;
      }

      const lines = this.extractAddedLines(file.patch);
      if (lines.length < this.MIN_BLOCK_SIZE) {
        continue;
      }

      for (let i = 0; i <= lines.length - this.MIN_BLOCK_SIZE; i++) {
        const blockLines = lines.slice(i, i + this.MIN_BLOCK_SIZE);
        const code = blockLines.map((l) => l.content).join('\n');
        const normalizedCode = this.normalizeCode(code);

        if (this.isTrivalBlock(normalizedCode)) {
          continue;
        }

        blocks.push({
          file: file.filename,
          startLine: blockLines[0].lineNumber,
          endLine: blockLines[blockLines.length - 1].lineNumber,
          code,
          normalizedCode,
          hash: this.hashCode(normalizedCode),
        });
      }
    }

    return blocks;
  }

  /**
   * Find duplicate blocks using hash-based detection and fuzzy matching
   */
  private findDuplicates(blocks: CodeBlock[]): DuplicateBlock[] {
    const duplicates: DuplicateBlock[] = [];
    const seen = new Set<string>();
    const hashMap = new Map<string, CodeBlock[]>();
    for (const block of blocks) {
      if (!hashMap.has(block.hash)) {
        hashMap.set(block.hash, []);
      }
      hashMap.get(block.hash)!.push(block);
    }

    for (const [, matchingBlocks] of hashMap) {
      if (matchingBlocks.length > 1) {
        for (let i = 0; i < matchingBlocks.length; i++) {
          for (let j = i + 1; j < matchingBlocks.length; j++) {
            if (matchingBlocks[i].file === matchingBlocks[j].file) {
              continue;
            }

            const key = this.createDuplicateKey(matchingBlocks[i], matchingBlocks[j]);
            if (!seen.has(key)) {
              duplicates.push({
                file1: matchingBlocks[i].file,
                file2: matchingBlocks[j].file,
                lines1: {
                  start: matchingBlocks[i].startLine,
                  end: matchingBlocks[i].endLine,
                },
                lines2: {
                  start: matchingBlocks[j].startLine,
                  end: matchingBlocks[j].endLine,
                },
                code: matchingBlocks[i].code,
                similarity: 1.0,
              });
              seen.add(key);
            }
          }
        }
      }
    }

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (blocks[i].file === blocks[j].file) {
          continue;
        }

        const similarity = this.calculateSimilarity(
          blocks[i].normalizedCode,
          blocks[j].normalizedCode
        );

        if (similarity >= this.SIMILARITY_THRESHOLD && similarity < 1.0) {
          const key = this.createDuplicateKey(blocks[i], blocks[j]);
          if (!seen.has(key)) {
            duplicates.push({
              file1: blocks[i].file,
              file2: blocks[j].file,
              lines1: { start: blocks[i].startLine, end: blocks[i].endLine },
              lines2: { start: blocks[j].startLine, end: blocks[j].endLine },
              code: blocks[i].code,
              similarity,
            });
            seen.add(key);
          }
        }
      }
    }

    const merged = this.mergeOverlappingDuplicates(duplicates);
    const clustered = this.clusterDuplicatesByPattern(merged);

    return clustered.sort((a, b) => {
      const sizeA = a.clusterSize || 1;
      const sizeB = b.clusterSize || 1;
      if (sizeA !== sizeB) return sizeB - sizeA;
      return b.similarity - a.similarity;
    });
  }

  /**
   * Extract added lines from git patch
   */
  private extractAddedLines(patch: string): Array<{ lineNumber: number; content: string }> {
    const lines: Array<{ lineNumber: number; content: string }> = [];
    const patchLines = patch.split('\n');
    let currentLine = 0;

    for (const line of patchLines) {
      if (line.startsWith('@@')) {
        const match = line.match(/\+(\d+)/);
        if (match) {
          currentLine = parseInt(match[1], 10);
        }
        continue;
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        lines.push({
          lineNumber: currentLine,
          content: line.substring(1),
        });
        currentLine++;
      } else if (!line.startsWith('-')) {
        currentLine++;
      }
    }

    return lines;
  }

  /**
   * Normalize code for comparison (remove whitespace, comments, variable names)
   */
  private normalizeCode(code: string): string {
    return code
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/"([^"\\]|\\.)*"/g, '""')
      .replace(/'([^'\\]|\\.)*'/g, "''")
      .replace(/`([^`\\]|\\.)*`/g, '``')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Check if block is trivial (imports, simple declarations, etc.)
   */
  private isTrivalBlock(normalizedCode: string): boolean {
    const trivialPatterns = [
      /^import\s/,
      /^export\s/,
      /^const\s+\w+\s*=\s*require/,
      /^\s*}\s*$/,
      /^\s*{\s*$/,
      /^\s*\)\s*$/,
      /^\s*\(\s*$/,
    ];

    if (normalizedCode.length < 30) {
      return true;
    }

    const classNameRatio = (normalizedCode.match(/classname|class=/gi) || []).length;
    if (classNameRatio > 2 && normalizedCode.length < 100) {
      return true;
    }

    return trivialPatterns.some((pattern) => pattern.test(normalizedCode));
  }

  /**
   * Merge overlapping duplicate blocks into larger consolidated blocks
   */
  private mergeOverlappingDuplicates(duplicates: DuplicateBlock[]): DuplicateBlock[] {
    if (duplicates.length === 0) return [];

    const groups = new Map<string, DuplicateBlock[]>();
    for (const dup of duplicates) {
      const key = [dup.file1, dup.file2].sort().join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(dup);
    }

    const merged: DuplicateBlock[] = [];

    for (const [, groupDuplicates] of groups) {
      const sorted = groupDuplicates.sort((a, b) => a.lines1.start - b.lines1.start);

      let current = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        const overlap1 = next.lines1.start <= current.lines1.end + 2;
        const overlap2 = next.lines2.start <= current.lines2.end + 2;

        if (overlap1 && overlap2) {
          current = {
            ...current,
            lines1: {
              start: Math.min(current.lines1.start, next.lines1.start),
              end: Math.max(current.lines1.end, next.lines1.end),
            },
            lines2: {
              start: Math.min(current.lines2.start, next.lines2.start),
              end: Math.max(current.lines2.end, next.lines2.end),
            },
            similarity: Math.max(current.similarity, next.similarity),
          };
        } else {
          merged.push(current);
          current = next;
        }
      }
      merged.push(current);
    }

    return merged;
  }

  /**
   * Cluster duplicates by pattern similarity using Union-Find algorithm.
   * Groups duplicates transitively: if A is similar to B and B is similar to C, all three cluster together.
   */
  private clusterDuplicatesByPattern(duplicates: DuplicateBlock[]): DuplicateBlock[] {
    if (duplicates.length === 0) return [];

    const CLUSTER_SIMILARITY_THRESHOLD = 0.9;
    const parent: number[] = Array.from({ length: duplicates.length }, (_, i) => i);

    const find = (x: number): number => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]);
      }
      return parent[x];
    };

    const union = (x: number, y: number) => {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) {
        parent[rootX] = rootY;
      }
    };

    for (let i = 0; i < duplicates.length; i++) {
      for (let j = i + 1; j < duplicates.length; j++) {
        const similarity = this.calculateSimilarity(duplicates[i].code, duplicates[j].code);

        if (similarity >= CLUSTER_SIMILARITY_THRESHOLD) {
          union(i, j);
        }
      }
    }

    const clusterMap = new Map<number, DuplicateBlock[]>();
    for (let i = 0; i < duplicates.length; i++) {
      const root = find(i);
      if (!clusterMap.has(root)) {
        clusterMap.set(root, []);
      }
      clusterMap.get(root)!.push(duplicates[i]);
    }

    const clusters = Array.from(clusterMap.values());

    const clustered: DuplicateBlock[] = [];

    for (const cluster of clusters) {
      if (cluster.length === 1) {
        clustered.push(cluster[0]);
        continue;
      }

      const fileLocations = new Map<string, { start: number; end: number }[]>();

      for (const inst of cluster) {
        if (!fileLocations.has(inst.file1)) {
          fileLocations.set(inst.file1, []);
        }
        fileLocations.get(inst.file1)!.push(inst.lines1);

        if (!fileLocations.has(inst.file2)) {
          fileLocations.set(inst.file2, []);
        }
        fileLocations.get(inst.file2)!.push(inst.lines2);
      }

      const allFiles: Array<{ file: string; lines: { start: number; end: number } }> = [];
      for (const [file, ranges] of fileLocations) {
        const sortedRanges = ranges.sort((a, b) => a.start - b.start);
        const mergedRanges: Array<{ start: number; end: number }> = [];

        let current = sortedRanges[0];
        for (let i = 1; i < sortedRanges.length; i++) {
          const next = sortedRanges[i];
          if (next.start <= current.end + 2) {
            current = {
              start: Math.min(current.start, next.start),
              end: Math.max(current.end, next.end),
            };
          } else {
            mergedRanges.push(current);
            current = next;
          }
        }
        mergedRanges.push(current);

        for (const range of mergedRanges) {
          allFiles.push({ file, lines: range });
        }
      }

      const representative = cluster.reduce((best, current) =>
        current.similarity > best.similarity ? current : best
      );

      const patternHash = this.hashCode(representative.code);

      clustered.push({
        ...representative,
        clusterSize: fileLocations.size,
        allFiles: allFiles,
        patternHash: patternHash,
      });
    }

    return clustered;
  }

  /**
   * Calculate similarity between two code strings (Jaccard similarity)
   */
  private calculateSimilarity(code1: string, code2: string): number {
    const tokens1 = new Set(code1.split(/\s+/));
    const tokens2 = new Set(code2.split(/\s+/));

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Create hash for code block
   */
  private hashCode(code: string): string {
    return crypto.createHash('md5').update(code).digest('hex');
  }

  /**
   * Create unique key for duplicate pair
   */
  private createDuplicateKey(block1: CodeBlock, block2: CodeBlock): string {
    const key1 = `${block1.file}:${block1.startLine}-${block1.endLine}`;
    const key2 = `${block2.file}:${block2.startLine}-${block2.endLine}`;
    return [key1, key2].sort().join('|');
  }

  /**
   * Calculate total lines in PR
   */
  private calculateTotalLines(files: PrFile[]): number {
    return files.reduce((sum, file) => {
      if (this.shouldSkipFile(file.filename)) {
        return sum;
      }
      return sum + file.additions;
    }, 0);
  }

  /**
   * Calculate total duplicated lines
   */
  private calculateDuplicatedLines(duplicates: DuplicateBlock[]): number {
    const uniqueLines = new Set<string>();

    for (const dup of duplicates) {
      for (let i = dup.lines1.start; i <= dup.lines1.end; i++) {
        uniqueLines.add(`${dup.file1}:${i}`);
      }
      for (let i = dup.lines2.start; i <= dup.lines2.end; i++) {
        uniqueLines.add(`${dup.file2}:${i}`);
      }
    }

    return uniqueLines.size;
  }

  /**
   * Calculate severity based on duplication percentage
   */
  private calculateSeverity(percentage: number): 'low' | 'medium' | 'high' {
    if (percentage >= 30) return 'high';
    if (percentage >= 15) return 'medium';
    return 'low';
  }

  /**
   * Check if file should be skipped for duplication analysis
   */
  private shouldSkipFile(filename: string): boolean {
    const skipPatterns = [
      /\.json$/,
      /\.md$/,
      /\.txt$/,
      /\.yaml$/,
      /\.yml$/,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /\.min\.js$/,
      /\.test\./,
      /\.spec\./,
      /\/__tests__\//,
      /\/node_modules\//,
      /\/dist\//,
      /\/build\//,
    ];

    return skipPatterns.some((pattern) => pattern.test(filename));
  }
}

export const duplicationService = new DuplicationService();
