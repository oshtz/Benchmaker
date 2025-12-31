# Testing Methodology

Internal reference for Benchmaker's evaluation system and how to achieve accurate, reproducible 0-100 scoring.

---

## Quick Reference

| Scoring Method | Scale | Output Range | Reproducibility | Best For |
|----------------|-------|--------------|-----------------|----------|
| Exact Match | 0-1 → 0-100 | 0-100 continuous | Deterministic | Short, precise answers |
| Regex Match | 0-1 → 0-100 | 0 or 100 | Deterministic | Pattern validation |
| Numeric Tolerance | 0-1 → 0-100 | 0-100 continuous | Deterministic | Math/calculations |
| Boolean | 0-1 → 0-100 | 0 or 100 | Deterministic | Contains check |
| LLM Judge | 0-10 → 0-100 | 0-100 continuous | ±5-10% variance | Complex/subjective |
| Code Arena Judge | 0-100 native | 0-100 continuous | ±5-15% variance | Frontend code |

---

## 1. Overview

Benchmaker evaluates LLM responses to produce a **0-100 rating per task per model**. The system supports:

- **Two benchmark modes**: Standard Arena and Code Arena
- **Five scoring methods**: From deterministic (exact match) to AI-powered (LLM judge)
- **Weighted test cases**: Prioritize important tests in aggregate scores
- **Statistical analysis**: Multi-run variance, confidence intervals, model comparison
- **Benchmark mode**: One-click setup for reproducible results (temp=0)

### Core Principles

1. All scores are **normalized to 0-1 internally**, displayed as **0-100**
2. Each test case can use a different scoring method
3. Test case weights affect aggregate scores
4. Full execution context is persisted for reproducibility

---

## 2. Benchmark Modes

### Standard Arena

- **Purpose**: Evaluate models across multiple test cases in a test suite
- **Flow**: Test Suite → Test Cases → Models → Scored Results
- **Scoring**: Any of the 5 scoring methods per test case
- **Aggregation**: Weighted average per model

### Code Arena

- **Purpose**: Compare frontend code generation with live preview
- **Flow**: Prompt → Models → Code Extraction → LLM Judge
- **Scoring**: Code Arena Judge (0-100 with weighted criteria)
- **Output**: Side-by-side comparison with rendered previews

---

## 3. Score Calculation

### Internal Representation

```typescript
interface ScoringResult {
  score: number        // 0-1 normalized (primary score)
  confidence?: number  // 0-1, scorer confidence
  notes?: string       // Human-readable explanation
  rawScore?: number    // Original scale (e.g., 0-10)
  maxScore?: number    // Maximum on original scale
}
```

### Display Conversion

```
Display Score = score × 100
```

Example: `score: 0.85` → **85/100**

### Aggregate Scoring

Three functions for different levels of detail:

**Simple aggregate** - weighted average per model:
```typescript
getAggregateScores(runId, testCases?)
// Returns Map<modelId, weightedAverage>
```

**Detailed aggregate** - full statistics:
```typescript
getDetailedAggregateScores(runId, testCases?)
// Returns Map<modelId, AggregateScore>

interface AggregateScore {
  mean: number              // Weighted mean (0-1)
  stdDev: number            // Standard deviation
  min: number
  max: number
  count: number             // Number of scored results
  totalWeight: number       // Sum of weights
  confidence95: [number, number]  // 95% CI
}
```

**Multi-run statistics** - variance across runs:
```typescript
getMultiRunStats(runIds, testCases?)
// Returns Map<modelId, MultiRunStats>

interface MultiRunStats {
  runIds: string[]
  modelId: string
  scores: number[]          // Score from each run
  mean: number
  stdDev: number
  min: number
  max: number
  confidence95: [number, number]
}
```

### Test Case Weights

Each test case has a `weight` field (default: 1). Higher weight = more impact on aggregate score.

```typescript
interface TestCase {
  weight: number  // Default 1, increase for important tests
  // ...
}

// Calculation:
weightedAverage = Σ(score × weight) / Σ(weight)
```

---

## 4. Scoring Methods

### 4.1 Exact Match

**Location**: `src/scoring/exact-match.ts`

| Condition | Score | Display |
|-----------|-------|---------|
| Exact string match | 1.0 | 100 |
| Case-insensitive match | 0.95 | 95 |
| Expected within response | 0.60-0.95 | 60-95 (varies by extra content) |
| Case-insensitive contains | 0.55-0.90 | 55-90 (varies by extra content) |
| High similarity (>50%) | similarity × 0.7 | 35-70 (continuous) |
| Low similarity (20-50%) | similarity × 0.4 | 8-20 (continuous) |
| No match (<20% similar) | 0 | 0 |

Uses Levenshtein distance for continuous partial matching. Scores adjust based on extra content ratio when expected output is found within a longer response. Best for short, precise answers.

### 4.2 Regex Match

**Location**: `src/scoring/regex-match.ts`

| Condition | Score | Display |
|-----------|-------|---------|
| Pattern matches | 1.0 | 100 |
| No match | 0 | 0 |

Supports `/pattern/flags` or plain patterns. Best for format validation.

### 4.3 Numeric Tolerance

**Location**: `src/scoring/numeric-tolerance.ts`

| Condition | Score | Display |
|-----------|-------|---------|
| Within 1% tolerance | 1.0 | 100 |
| Within 25% | Continuous decay | 0-100 (smooth curve) |
| Outside 25% | 0 | 0 |

Uses continuous scoring with smooth exponential decay: `score = 1 - (error/0.25)^0.5`. This provides scores like: 0% error = 100, 1% = 80, 6.25% = 50, 25% = 0.

Extracts all numbers from response (including scientific notation). Best for math problems.

### 4.4 Boolean Match

**Location**: `src/scoring/index.ts`

| Condition | Score | Display |
|-----------|-------|---------|
| Expected substring found | 1.0 | 100 |
| Not found | 0 | 0 |
| No expected output | 1.0 | 100 (auto-pass) |

Case-insensitive substring check. Best for simple contains/doesn't contain.

### 4.5 LLM Judge

**Location**: `src/scoring/llm-judge.ts`
**Temperature**: 0.1

| Score | Meaning |
|-------|---------|
| 10 | Perfect, fully correct and complete |
| 8-9 | Excellent with minor issues |
| 6-7 | Good but missing elements |
| 4-5 | Partially correct, significant issues |
| 2-3 | Mostly incorrect |
| 0-1 | Completely wrong |

Conversion: `displayScore = (rawScore / 10) × 100`

Best for complex, subjective, or open-ended tasks.

### 4.6 Code Arena Judge

**Location**: `src/scoring/code-arena-judge.ts`
**Temperature**: 0.3

| Criterion | Weight |
|-----------|--------|
| Visual Accuracy | 40% |
| Code Quality | 30% |
| Functionality | 20% |
| Responsiveness | 10% |

Scores directly on 0-100 scale. Best for frontend code generation.

---

## 5. Reproducibility

### Benchmark Mode

Toggle in the Parameter Panel to enable reproducible benchmarking:

- Temperature locked to **0**
- Frequency penalty locked to **0**
- Presence penalty locked to **0**

```typescript
// Programmatically
modelStore.toggleBenchmarkMode()

// Get effective parameters (respects benchmark mode)
const params = modelStore.getEffectiveParameters()
```

### Default Parameters

```typescript
{
  temperature: 0.7,
  topP: 1,
  maxTokens: 2048,
  frequencyPenalty: 0,
  presencePenalty: 0,
  benchmarkMode: false,
}
```

### Persisted Per Run

| Variable | Storage |
|----------|---------|
| Model IDs | `RunResult.models` |
| Parameters | `RunResult.parameters` |
| System Prompt | `TestSuite.systemPrompt` |
| Judge Prompt | `TestSuite.judgeSystemPrompt` |
| Judge Model | `RunResult.judgeModel` |
| Timestamps | `RunResult.startedAt/completedAt` |

### Sources of Variance

| Source | Impact | Mitigation |
|--------|--------|------------|
| Model temperature > 0 | High | Enable Benchmark Mode |
| LLM judge | Medium (±5-10%) | Run multiple times |
| API-side sampling | Low | Cannot control |
| Code Arena judge | Medium (±5-15%) | Run multiple times |

---

## 6. Statistical Comparison

Compare two models across multiple runs:

```typescript
compareModels(runIds, modelA, modelB, testCases?)
// Returns ModelComparison | null

interface ModelComparison {
  modelA: string
  modelB: string
  meanA: number
  meanB: number
  scoreDiff: number       // meanA - meanB
  pooledStdErr: number
  tStatistic: number
  pValue: number          // Two-tailed
  isSignificant: boolean  // p < 0.05
  effectSize: number      // Cohen's d
}
```

### Interpretation

- **pValue < 0.05**: Statistically significant difference
- **Effect size (Cohen's d)**:
  - |d| < 0.2: Negligible
  - |d| 0.2-0.5: Small
  - |d| 0.5-0.8: Medium
  - |d| > 0.8: Large

Requires at least 2 runs per model.

---

## 7. Judge Calibration

Test LLM judges against known reference samples:

```typescript
import { calibrateJudge, interpretCalibrationResult } from '@/scoring/judge-calibration'

const result = await calibrateJudge(client, judgeModelId)
const interpretation = interpretCalibrationResult(result)
```

### Calibration Result

```typescript
interface CalibrationResult {
  judgeModelId: string
  timestamp: number
  samples: CalibrationSampleResult[]
  summary: {
    totalSamples: number
    passedSamples: number
    passRate: number           // % within tolerance
    meanAbsoluteError: number
    maxError: number
    bias: number               // Positive = overscoring
    correlation: number        // Pearson correlation
  }
}
```

### Quality Ratings

| Rating | Pass Rate | MAE | Correlation |
|--------|-----------|-----|-------------|
| Excellent | ≥90% | ≤10% | ≥0.9 |
| Good | ≥75% | ≤15% | ≥0.8 |
| Fair | ≥50% | ≤25% | ≥0.6 |
| Poor | <50% | >25% | <0.6 |

Default calibration includes 8 reference samples covering factual, empty, irrelevant, and explanation-type responses.

---

## 8. Execution Pipeline

### Standard Arena

```
1. Create result entries for all (test case × model) combinations
2. Execute in parallel (concurrency limit: 5)
3. For each task:
   a. Build messages (system prompt + user prompt)
   b. Stream response with retry logic
   c. Record latency, tokens, cost
   d. Score using configured method
4. Aggregate scores per model
```

### Retry Logic

- Max retries: 2 for empty responses
- Backoff: 400ms × (attempt + 1)
- Fallback: Non-streaming request if streaming fails
- **Request timeout**: 2 minutes per request (prevents hung API calls from blocking execution)

### Cost Calculation

```
Cost = (prompt_tokens × prompt_price) + (completion_tokens × completion_price)
```

---

## 9. Best Practices

### For Accurate Results

1. **Enable Benchmark Mode** for reproducible model responses
2. **Use deterministic scoring** (exact, regex, numeric, boolean) when possible
3. **Set test case weights** for important tests
4. **Run 3-5 times** for LLM-judged tests
5. **Calibrate your judge** before relying on LLM judge scores
6. **Use statistical comparison** to verify differences are significant

### Multi-Run Protocol

**Using the UI:**
1. In the Arena tab, click the dropdown arrow next to "Run Benchmark"
2. Select "Run 3 times", "Run 5 times", or "Run 10 times"
3. The system will execute the benchmark sequentially, showing progress
4. In the Results tab, the "Multi-Run Analysis" panel will automatically appear
5. View mean scores, standard deviations, confidence intervals, and statistical comparisons

**Programmatic API:**
```typescript
// Run benchmark 3-5 times, collect run IDs
const runIds = [run1.id, run2.id, run3.id]

// Get multi-run statistics
const stats = runStore.getMultiRunStats(runIds, testSuite.testCases)

// Report results
const modelStats = stats.get('gpt-4')
console.log(`gpt-4: ${(modelStats.mean * 100).toFixed(1)} ± ${(modelStats.stdDev * 100).toFixed(1)}`)
// Output: "gpt-4: 85.2 ± 3.1"
```

### Score Reporting Format

```
Model X: 85.2 ± 3.1 (95% CI: [82.1, 88.3])
         ↑     ↑            ↑
       mean  stdDev    confidence interval
```

### Confidence Guidelines

| Scoring Method | Confidence | Runs Needed |
|----------------|------------|-------------|
| Exact Match | High | 1 |
| Regex Match | High | 1 |
| Numeric Tolerance | High | 1 |
| Boolean | High | 1 |
| LLM Judge | Medium | 3-5 |
| Code Arena Judge | Medium | 3-5 |

---

## 10. Limitations

### Inherent Constraints

1. **LLM Judge Variance**: Even at temp=0.1, ~±5-10% variance exists
2. **API Non-Determinism**: Some providers vary even at temp=0
3. **Code Truncation in Quick Judge**: Codes >5000 chars are truncated (warning shown in results)

### Future Improvements

- Inter-rater reliability (multiple judges)
- Elo-style rankings
- Export/reporting

---

## Code Reference

| Component | Location |
|-----------|----------|
| **Scoring** |
| Exact match | `src/scoring/exact-match.ts` |
| Regex match | `src/scoring/regex-match.ts` |
| Numeric tolerance | `src/scoring/numeric-tolerance.ts` |
| Boolean match | `src/scoring/index.ts` |
| LLM judge | `src/scoring/llm-judge.ts` |
| Code arena judge | `src/scoring/code-arena-judge.ts` |
| Judge calibration | `src/scoring/judge-calibration.ts` |
| **State** |
| Aggregate scores | `src/stores/runStore.ts` → `getAggregateScores()` |
| Detailed stats | `src/stores/runStore.ts` → `getDetailedAggregateScores()` |
| Multi-run stats | `src/stores/runStore.ts` → `getMultiRunStats()` |
| Model comparison | `src/stores/runStore.ts` → `compareModels()` |
| Benchmark mode | `src/stores/modelStore.ts` → `toggleBenchmarkMode()` |
| **Execution** |
| Standard arena | `src/services/execution.ts` |
| Code arena | `src/services/codeArenaExecution.ts` |
| **UI** |
| Parameter panel | `src/components/arena/ParameterPanel.tsx` |

---

## Summary

Benchmaker produces accurate 0-100 scores per task per model with:

| Capability | Usage |
|------------|-------|
| Deterministic scoring | Use exact/regex/numeric/boolean |
| Weighted aggregation | Pass `testCases` to aggregate functions |
| Benchmark mode | Toggle in Parameter Panel |
| Multi-run statistics | `getMultiRunStats(runIds, testCases)` |
| Confidence intervals | `getDetailedAggregateScores(runId, testCases)` |
| Statistical comparison | `compareModels(runIds, modelA, modelB)` |
| Judge calibration | `calibrateJudge(client, judgeModelId)` |

**For reliable results**: Enable Benchmark Mode, use deterministic scoring where possible, run LLM-judged tests 3-5 times, and verify differences with `compareModels()`.
