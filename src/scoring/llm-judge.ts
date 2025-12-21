import type { ScoringResult } from '@/types'
import type { OpenRouterClient } from '@/services/openrouter'

const BASE_JUDGE_SYSTEM_PROMPT = `You are an expert evaluator assessing the quality of AI model responses. Your task is to score responses objectively based on accuracy, completeness, and adherence to the task requirements.

SCORING GUIDELINES:
- Score from 0 to 10, where:
  - 10: Perfect response, fully correct and complete
  - 8-9: Excellent response with minor issues
  - 6-7: Good response but missing some elements or has small errors
  - 4-5: Partially correct but significant issues
  - 2-3: Mostly incorrect but shows some understanding
  - 0-1: Completely wrong or irrelevant

RESPONSE FORMAT:
You MUST respond with a JSON object containing:
- "score": A number from 0 to 10
- "reasoning": A brief explanation of your scoring decision

Example response:
{"score": 8, "reasoning": "The response correctly identifies the main concept but lacks one minor detail."}

If additional benchmark instructions specify a different output format, follow that format exactly.`

export async function scoreLLMJudge(
  prompt: string,
  response: string,
  expectedOutput: string | undefined,
  client: OpenRouterClient,
  judgeModelId: string,
  judgeSystemPrompt?: string
): Promise<ScoringResult> {
  try {
    if (!response || !response.trim()) {
      return {
        score: 0,
        confidence: 1,
        notes: 'Empty response',
        rawScore: 0,
        maxScore: 10,
      }
    }

    const judgePrompt = buildJudgePrompt(prompt, response, expectedOutput)
    const systemPrompt = buildJudgeSystemPrompt(judgeSystemPrompt)

    const completion = await client.createChatCompletion({
      model: judgeModelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: judgePrompt },
      ],
      temperature: 0.1, // Low temperature for consistent scoring
      max_tokens: 500,
    })

    const judgeResponse = completion.choices[0]?.message?.content || ''

    return parseJudgeResponse(judgeResponse)
  } catch (error) {
    return {
      score: 0,
      confidence: 0,
      notes: `Judge evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

function buildJudgeSystemPrompt(customPrompt?: string): string {
  if (!customPrompt || !customPrompt.trim()) {
    return BASE_JUDGE_SYSTEM_PROMPT
  }

  return `${BASE_JUDGE_SYSTEM_PROMPT}

## Additional Benchmark Instructions
${customPrompt.trim()}`
}

function buildJudgePrompt(
  originalPrompt: string,
  response: string,
  expectedOutput?: string
): string {
  let prompt = `## Original Task/Question
${originalPrompt}

## Model Response
${response}
`

  if (expectedOutput) {
    prompt += `
## Expected/Reference Answer
${expectedOutput}
`
  }

  prompt += `
## Your Task
Evaluate the model's response and provide a score from 0-10 with reasoning.
Respond ONLY with a valid JSON object.`

  return prompt
}

function parseJudgeResponse(response: string): ScoringResult {
  try {
    const trimmedResponse = response.trim()
    if (!trimmedResponse) {
      return {
        score: 0,
        confidence: 0,
        notes: 'Empty judge response',
      }
    }

    const structured = parseStructuredJudgeResponse(response)
    if (structured) {
      return structured
    }

    const jsonCandidate = extractJsonCandidate(response)
    if (jsonCandidate) {
      const parsed = safeParseJson(jsonCandidate)
      const normalized = normalizeParsedJudgeScore(parsed)
      if (normalized) {
        return normalized
      }
    }

    const extracted = extractScoreFromText(response)
    if (extracted) {
      return buildScoreResult(extracted.score, extracted.reasoning, 0.7)
    }

    return {
      score: 0,
      confidence: 0,
      notes: 'Could not parse judge response',
    }
  } catch (error) {
    return {
      score: 0,
      confidence: 0,
      notes: `Failed to parse judge response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

function safeParseJson(raw: string): Record<string, unknown> | null {
  try {
    const trimmed = raw.trim()
    if (!trimmed) return null
    return JSON.parse(trimmed)
  } catch {
    try {
      const cleaned = raw
        .trim()
        .replace(/^\uFEFF/, '')
        .replace(/,\s*([}\]])/g, '$1')
      if (!cleaned) return null
      return JSON.parse(cleaned)
    } catch {
      return null
    }
  }
}

function parseStructuredJudgeResponse(response: string): ScoringResult | null {
  const constraintMatch = response.match(
    /constraint\s+satisfaction\s*:\s*\[?\s*(yes|no)\s*\]?/i
  )
  const semanticMatch = response.match(
    /semantic\s+score\s*:\s*\[?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*10)?\s*\]?/i
  )
  const personaMatch = response.match(
    /persona\s+score\s*:\s*\[?\s*(\d+(?:\.\d+)?)\s*(?:\/\s*10)?\s*\]?/i
  )
  const reasoningMatch = response.match(
    /final\s+rational(?:e)?\s*:\s*([^\n\r]+)/i
  )

  if (!constraintMatch || !semanticMatch || !personaMatch) {
    return null
  }

  const constraintSatisfied = constraintMatch[1].toLowerCase() === 'yes'
  const semanticScore = clampScore(parseFloat(semanticMatch[1]))
  const personaScore = clampScore(parseFloat(personaMatch[1]))
  const averageScore = (semanticScore + personaScore) / 2
  const finalScore = constraintSatisfied ? averageScore : 0

  return {
    score: Math.min(Math.max(finalScore / 10, 0), 1),
    confidence: 0.85,
    notes: buildStructuredNotes(
      constraintSatisfied,
      semanticScore,
      personaScore,
      reasoningMatch?.[1]
    ),
    rawScore: finalScore,
    maxScore: 10,
  }
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0
  return Math.min(Math.max(score, 0), 10)
}

function extractJsonCandidate(response: string): string | null {
  const fenceMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  const firstBrace = response.indexOf('{')
  if (firstBrace === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = firstBrace; i < response.length; i++) {
    const char = response[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\' && inString) {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') depth -= 1

    if (depth === 0) {
      return response.slice(firstBrace, i + 1)
    }
  }

  return null
}

function normalizeScoreValue(score: unknown): number | null {
  if (typeof score === 'number' && Number.isFinite(score)) {
    return score
  }

  if (typeof score === 'string' && score.trim()) {
    const parsed = parseFloat(score)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return null
}

function extractScoreFromText(
  response: string
): { score: number; reasoning?: string } | null {
  const scoreMatch = response.match(
    /(?:score|rating)\s*[:=\-]?\s*(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/i
  )
  const fallbackMatch = response.match(
    /^\s*(\d+(?:\.\d+)?)(?:\s*\/\s*10)?\s*$/i
  )
  const match = scoreMatch ?? fallbackMatch

  if (!match) return null

  const score = parseFloat(match[1])
  if (Number.isNaN(score)) return null

  const reasoningMatch = response.match(
    /(?:reasoning|rationale|explanation)\s*[:=\-]?\s*([^\n\r]+)/i
  )

  return {
    score,
    reasoning: reasoningMatch?.[1]?.trim(),
  }
}

function normalizeParsedJudgeScore(
  parsed: Record<string, unknown> | null
): ScoringResult | null {
  if (!parsed) return null

  const scoreValue = normalizeScoreValue(parsed.score)
  if (scoreValue === null) {
    return null
  }

  const rawScore = clampScore(scoreValue)
  const reasoning = extractReasoning(parsed)

  return {
    score: Math.min(Math.max(rawScore / 10, 0), 1),
    confidence: 0.9,
    notes: reasoning || 'Judge evaluation complete',
    rawScore,
    maxScore: 10,
  }
}

function extractReasoning(parsed: Record<string, unknown>): string | undefined {
  const candidates = [parsed.reasoning, parsed.rationale, parsed.explanation]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function buildScoreResult(
  rawScore: number,
  reasoning: string | undefined,
  confidence: number
): ScoringResult {
  const clamped = clampScore(rawScore)
  const normalizedScore = Math.min(Math.max(clamped / 10, 0), 1)

  return {
    score: normalizedScore,
    confidence,
    notes: reasoning || `Extracted score from text: ${clamped}/10`,
    rawScore: clamped,
    maxScore: 10,
  }
}

function buildStructuredNotes(
  constraintSatisfied: boolean,
  semanticScore: number,
  personaScore: number,
  reasoning?: string
): string {
  const parts = [
    `Constraint: ${constraintSatisfied ? 'Yes' : 'No'}`,
    `Semantic: ${semanticScore}/10`,
    `Persona: ${personaScore}/10`,
  ]

  if (reasoning && reasoning.trim()) {
    parts.push(`Reason: ${reasoning.trim()}`)
  }

  return parts.join(' | ')
}
