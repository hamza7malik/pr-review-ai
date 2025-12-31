# Code Duplication Analysis

## Overview

The code duplication analysis feature detects and reports duplicated code patterns across pull request files. It uses a sophisticated multi-stage algorithm combining exact hash-based matching, fuzzy similarity detection, and semantic pattern clustering to identify code that could benefit from refactoring.

## Architecture

### Core Components

1. **DuplicationService** (`backend/src/services/duplication.service.ts`)

   - Main service handling duplication detection
   - Implements sliding window algorithm for code block extraction
   - Performs hash-based and similarity-based matching
   - Clusters similar patterns using Union-Find algorithm

2. **Type Definitions** (`backend/src/types/review.ts`)

   ```typescript
   interface DuplicateBlock {
     file1: string;
     file2: string;
     lines1: { start: number; end: number };
     lines2: { start: number; end: number };
     code: string;
     similarity: number;
     clusterSize?: number; // Number of files affected by pattern
     allFiles?: Array<{
       // All locations of clustered pattern
       file: string;
       lines: { start: number; end: number };
     }>;
     patternHash?: string; // Unique identifier for pattern
   }

   interface CodeDuplicationAnalysis {
     percentage: number; // Overall duplication percentage
     severity: "low" | "medium" | "high";
     duplicateBlocks: DuplicateBlock[];
     totalLines: number;
     duplicatedLines: number;
   }
   ```

3. **Frontend Component** (`frontend/src/components/review/DuplicateBlocksList.tsx`)
   - Displays duplicate code findings with visual hierarchy
   - Shows clustered patterns vs individual duplicates
   - Provides refactoring suggestions for 100% matches

## Algorithm Pipeline

### 1. Code Block Extraction

The service extracts code blocks using a sliding window approach:

```
MIN_BLOCK_SIZE = 10 lines (configurable)

For each file:
  ├─ Skip non-code files (JSON, MD, lock files)
  ├─ Parse git patch to extract added lines
  ├─ Create sliding windows of MIN_BLOCK_SIZE
  └─ Filter trivial blocks (imports, comments, className-heavy JSX)
```

**Filtered Patterns:**

- Import/export statements
- Pure whitespace or brackets
- Blocks < 30 characters after normalization
- JSX with excessive Tailwind className attributes

### 2. Code Normalization

Before comparison, code is normalized to focus on structure:

```typescript
normalize(code):
  ├─ Remove comments (// and /* */)
  ├─ Replace string literals with placeholders
  ├─ Normalize whitespace (all whitespace → single space)
  ├─ Convert to lowercase
  └─ Trim
```

**Example:**

```javascript
// Before normalization
const errorMessage =
  err instanceof Error ? err.message : "An error occurred during login";

// After normalization
const errormessage = err instanceof error ? err.message : "";
```

### 3. Duplicate Detection

Two-pass detection strategy:

#### Pass 1: Exact Duplicates (Hash-Based)

```
For each code block:
  ├─ Calculate MD5 hash of normalized code
  ├─ Group blocks by hash
  └─ Match blocks with identical hashes
```

**Complexity:** O(n) with HashMap lookup

#### Pass 2: Fuzzy Matching (Jaccard Similarity)

```
SIMILARITY_THRESHOLD = 0.85 (85%)

For each pair of blocks:
  ├─ Calculate Jaccard similarity on tokens
  ├─ Tokenize: split on whitespace
  ├─ Similarity = |intersection| / |union|
  └─ Flag if similarity ≥ threshold
```

**Complexity:** O(n²) - optimized by skipping same-file comparisons

**Jaccard Similarity Formula:**

```
J(A, B) = |A ∩ B| / |A ∪ B|

Example:
Code A: "const error = message"    → tokens: {const, error, =, message}
Code B: "const errorMsg = message" → tokens: {const, errormsg, =, message}

Intersection: {const, =, message}  → 3 tokens
Union: {const, error, errormsg, =, message} → 5 tokens
Similarity: 3/5 = 0.60 (60%)
```

### 4. Overlap Merging

Consolidates adjacent/overlapping duplicates within same file pairs:

```
For each file pair:
  ├─ Group duplicates by (file1, file2)
  ├─ Sort by start line
  ├─ Merge if blocks overlap or within 2 lines
  └─ Extend line ranges and keep highest similarity
```

**Before Merge:**

```
useLogin.ts (20-33) ↔ useSignup.ts (28-42)
useLogin.ts (21-34) ↔ useSignup.ts (29-43)
useLogin.ts (22-35) ↔ useSignup.ts (30-44)
```

**After Merge:**

```
useLogin.ts (20-35) ↔ useSignup.ts (28-44)
```

### 5. Pattern Clustering

Groups duplicates using **Union-Find (Disjoint Set Union)** for transitive closure:

```
CLUSTER_SIMILARITY_THRESHOLD = 0.90 (90%)

Union-Find Algorithm:
  ├─ Initialize: each duplicate in own set
  ├─ Compare all pairs for similarity ≥ 90%
  ├─ Union similar duplicates
  └─ Group by root parent (transitive clustering)

If A similar to B AND B similar to C:
  → Cluster {A, B, C} together
```

**Why Union-Find?**

- Ensures transitive closure (if A~B and B~C, then A~C)
- O(α(n)) amortized time per operation (nearly constant)
- Prevents fragmented clusters

**Example:**

```
Pattern #1: useLogin ↔ useSignup (100% similar)
Pattern #2: useSignup ↔ useGoogleSignin (95% similar)
Pattern #3: useGoogleSignin ↔ useLogout (92% similar)

Without clustering: 3 separate findings
With clustering: 1 finding → "Pattern in 4 files"
```

### 6. Sorting & Ranking

Final results sorted by impact:

```
Primary sort: Cluster size (descending)
  └─ Patterns affecting more files appear first

Secondary sort: Similarity (descending)
  └─ Among same cluster size, exact matches first
```

## Configuration

### Adjustable Thresholds

```typescript
class DuplicationService {
  private readonly MIN_BLOCK_SIZE = 10; // Minimum lines per block
  private readonly SIMILARITY_THRESHOLD = 0.85; // 85% for fuzzy matches
  private readonly CLUSTER_THRESHOLD = 0.9; // 90% for clustering
}
```

**Tuning Guidelines:**

| Threshold      | Lower Value                    | Higher Value                          |
| -------------- | ------------------------------ | ------------------------------------- |
| MIN_BLOCK_SIZE | More sensitive, more noise     | Less sensitive, miss small duplicates |
| SIMILARITY     | More duplicates found          | Only very similar code flagged        |
| CLUSTER        | Larger clusters, less granular | Smaller clusters, more granular       |

### Severity Calculation

```typescript
percentage >= 30%  → 'high'
percentage >= 15%  → 'medium'
percentage < 15%   → 'low'
```

## Performance Characteristics

### Time Complexity

| Stage          | Complexity          | Notes                            |
| -------------- | ------------------- | -------------------------------- |
| Extraction     | O(n × m)            | n = files, m = lines per file    |
| Exact matching | O(n)                | HashMap-based                    |
| Fuzzy matching | O(n²)               | Pairwise comparison              |
| Merging        | O(k log k)          | k = duplicates, sorting          |
| Clustering     | O(n² × α(n))        | Union-Find with path compression |
| **Total**      | **O(n² + k log k)** | Dominated by fuzzy matching      |

### Space Complexity

- **Code blocks:** O(n × m) - all sliding windows stored
- **Hash map:** O(n) - exact duplicate lookup
- **Duplicates:** O(k) - detected duplicates
- **Union-Find:** O(n) - parent array
- **Total:** O(n × m + k)

### Optimizations

1. **Same-file skipping:** Ignores overlapping windows in same file
2. **Early filtering:** Removes trivial blocks before comparison
3. **Hash-based shortcuts:** Exact matches skip fuzzy calculation
4. **Path compression:** Union-Find optimization for O(α(n)) operations

## Example Output

### Scenario: Auth Hooks Duplication

**Input PR:**

```
src/hooks/useLogin.ts      (33 lines, error handling pattern)
src/hooks/useSignup.ts     (46 lines, error handling pattern)
src/hooks/useGoogleSignin.ts (35 lines, error handling pattern)
src/hooks/useLogout.ts     (37 lines, error handling pattern)
```

**Detection Process:**

1. **Extraction:** 40 code blocks across 4 files
2. **Exact matches:** 2 patterns (100% similar in 3 files each)
3. **Fuzzy matches:** 4 near-duplicates (95% similar)
4. **Clustering:** Merge into 1 cluster + 3 pairwise duplicates

**Output:**

```json
{
  "percentage": 6.2,
  "severity": "low",
  "totalLines": 1247,
  "duplicatedLines": 77,
  "duplicateBlocks": [
    {
      "file1": "src/hooks/useLogin.ts",
      "file2": "src/hooks/useSignup.ts",
      "lines1": { "start": 20, "end": 35 },
      "lines2": { "start": 28, "end": 44 },
      "similarity": 1.0,
      "clusterSize": 4,
      "allFiles": [
        {
          "file": "src/hooks/useLogin.ts",
          "lines": { "start": 20, "end": 35 }
        },
        {
          "file": "src/hooks/useSignup.ts",
          "lines": { "start": 28, "end": 44 }
        },
        {
          "file": "src/hooks/useGoogleSignin.ts",
          "lines": { "start": 20, "end": 35 }
        },
        {
          "file": "src/hooks/useLogout.ts",
          "lines": { "start": 23, "end": 35 }
        }
      ],
      "code": "...",
      "patternHash": "a7f3c8d9e2b1f4a6"
    }
  ]
}
```

**UI Display:**

```
Pattern Found in 4 Files | 100% Match
────────────────────────────────────────
This pattern appears in:
  • useLogin.ts (lines 20-35)
  • useSignup.ts (lines 28-44)
  • useGoogleSignin.ts (lines 20-35)
  • useLogout.ts (lines 23-35)

💡 Refactoring Suggestion
This pattern appears in 4 files. Consider extracting
it into a shared utility or hook.
```

## Integration Points

### Backend Service

```typescript
import { duplicationService } from "./services/duplication.service";

const analysis = duplicationService.analyzeDuplication(prFiles);
// Returns CodeDuplicationAnalysis with all findings
```

### Review Service Integration

The duplication analysis runs in parallel with the LLM review:

```typescript
const [review, duplication] = await Promise.all([
  openai.chat.completions.create(...),
  duplicationService.analyzeDuplication(files)
]);
```

### Frontend Display

```typescript
import { DuplicateBlocksList } from "@/components/review/DuplicateBlocksList";

<DuplicateBlocksList blocks={duplication.duplicateBlocks} />;
```

## Limitations & Future Improvements

### Current Limitations

1. **Token-based similarity:** Doesn't understand semantic equivalence

   - `error` vs `err` treated as different
   - Variable name changes reduce similarity score

2. **Language-agnostic:** No AST parsing

   - Can't detect structurally identical code with different syntax
   - Misses refactoring opportunities across languages

3. **No refactoring suggestions:** Manual interpretation required

   - Doesn't generate actual refactored code
   - No "extract to function" automation

4. **Fixed thresholds:** Not adaptive to project context
   - 85% threshold may be too strict/lenient for different codebases
   - No learning from user feedback

### Potential Enhancements

#### Phase 2: AST-Based Detection

```typescript
// Parse code into Abstract Syntax Tree
const ast1 = parse(code1);
const ast2 = parse(code2);

// Compare structure ignoring variable names
const structuralSimilarity = compareAST(ast1, ast2);
```

**Benefits:**

- Semantic understanding (recognizes equivalent structures)
- Variable/function name normalization
- Language-specific intelligence

#### Phase 3: AI-Powered Suggestions

```typescript
// Generate refactoring code using LLM
const suggestion = await openai.chat.completions.create({
  messages: [
    {
      role: "system",
      content: "Generate a utility function to eliminate this duplication",
    },
    {
      role: "user",
      content: duplicateCode,
    },
  ],
});
```

**Benefits:**

- Actual code suggestions
- Context-aware naming
- Best practice recommendations

#### Phase 4: Adaptive Thresholds

```typescript
// Learn from project history
const optimalThreshold = analyzeProjectHistory(repo);
duplicationService.setSimilarityThreshold(optimalThreshold);
```

**Benefits:**

- Project-specific tuning
- Reduces false positives/negatives
- Improves over time

## Testing

### Unit Tests

```typescript
describe("DuplicationService", () => {
  it("should detect exact duplicates", () => {
    const files = [
      { filename: "a.ts", patch: "...", additions: 10 },
      { filename: "b.ts", patch: "...", additions: 10 },
    ];
    const result = duplicationService.analyzeDuplication(files);
    expect(result.duplicateBlocks).toHaveLength(1);
    expect(result.duplicateBlocks[0].similarity).toBe(1.0);
  });

  it("should cluster similar patterns", () => {
    // Test Union-Find clustering
  });

  it("should skip trivial code blocks", () => {
    // Test import/export filtering
  });

  it("should normalize code correctly", () => {
    // Test normalization edge cases
  });
});
```

### Integration Tests

```typescript
describe("Review API with Duplication", () => {
  it("should return duplication analysis in review", async () => {
    const response = await request(app)
      .post("/api/review")
      .send({ owner: "test", repo: "test", pull_number: 1 });

    expect(response.body.duplication).toBeDefined();
    expect(response.body.duplication.percentage).toBeGreaterThanOrEqual(0);
  });
});
```

## Debugging

Enable detailed logging:

```typescript
// In duplication.service.ts
logger.setLevel("debug");

// Logs show:
// - Blocks extracted per file
// - Hash matches found
// - Fuzzy match scores
// - Cluster formations
// - Final duplicate count
```

## References

### Academic Background

- **Jaccard Similarity:** [Wikipedia](https://en.wikipedia.org/wiki/Jaccard_index)
- **Union-Find Algorithm:** [Tarjan & van Leeuwen, 1984]
- **Code Clone Detection:** [Roy & Cordy, 2007 - Survey on Code Clone Detection]

### Implementation Inspirations

- **SonarQube:** Duplication detection methodology
- **PMD CPD:** Token-based duplication detection
- **Simian:** Similarity analyzer design

---

**Last Updated:** December 31, 2025  
**Version:** 1.0.0
