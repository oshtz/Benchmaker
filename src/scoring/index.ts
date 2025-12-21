import type { TestCase, ScoringResult } from '@/types'
import type { OpenRouterClient } from '@/services/openrouter'
import { scoreExactMatch } from './exact-match'
import { scoreRegexMatch } from './regex-match'
import { scoreNumericTolerance } from './numeric-tolerance'
import { scoreLLMJudge } from './llm-judge'

export async function scoreResponse(
  testCase: TestCase,
  response: string,
  client?: OpenRouterClient,
  judgeModelId?: string,
  judgeSystemPrompt?: string
): Promise<ScoringResult> {
  switch (testCase.scoringMethod) {
    case 'exact-match':
      return scoreExactMatch(response, testCase.expectedOutput || '')

    case 'regex-match':
      return scoreRegexMatch(response, testCase.expectedOutput || '')

    case 'numeric-tolerance':
      return scoreNumericTolerance(response, testCase.expectedOutput || '')

    case 'boolean':
      return scoreBooleanMatch(response, testCase.expectedOutput || '')

    case 'llm-judge':
      if (client && judgeModelId) {
        return scoreLLMJudge(
          testCase.prompt,
          response,
          testCase.expectedOutput,
          client,
          judgeModelId,
          judgeSystemPrompt
        )
      }
      // Fallback to boolean if no judge configured
      return scoreBooleanMatch(response, testCase.expectedOutput || '')

    default:
      return {
        score: 0,
        notes: 'Unknown scoring method',
      }
  }
}

function scoreBooleanMatch(response: string, expected: string): ScoringResult {
  if (!expected) {
    return {
      score: 1,
      notes: 'No expected output - auto pass',
    }
  }

  const normalizedResponse = response.toLowerCase().trim()
  const normalizedExpected = expected.toLowerCase().trim()

  // Check if the expected output appears in the response
  const contains = normalizedResponse.includes(normalizedExpected)

  return {
    score: contains ? 1 : 0,
    notes: contains
      ? 'Expected output found in response'
      : 'Expected output not found in response',
  }
}

export { scoreExactMatch } from './exact-match'
export { scoreRegexMatch } from './regex-match'
export { scoreNumericTolerance } from './numeric-tolerance'
export { scoreLLMJudge } from './llm-judge'
