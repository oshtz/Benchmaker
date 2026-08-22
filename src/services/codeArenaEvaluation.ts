import type { CodeArenaOutput, CodeArenaRubricScores, CodeArenaRuntimeReport } from '@/types'
import type { OpenRouterClient } from './openrouter'

export const CODE_ARENA_RUBRIC_VERSION = 'code-arena-rubric-v1'

export function aggregateRubric(scores: Omit<CodeArenaRubricScores, 'total'>): CodeArenaRubricScores {
  const clamp = (value: number) => Math.max(0, Math.min(100, value))
  const normalized = {
    visualInstructionAdherence: clamp(scores.visualInstructionAdherence),
    functionalityRuntime: clamp(scores.functionalityRuntime),
    responsiveness: clamp(scores.responsiveness),
    codeQuality: clamp(scores.codeQuality),
    accessibility: clamp(scores.accessibility),
  }
  return { ...normalized, total: normalized.visualInstructionAdherence * 0.4 + normalized.functionalityRuntime * 0.2 + normalized.responsiveness * 0.15 + normalized.codeQuality * 0.15 + normalized.accessibility * 0.1 }
}

export function runDeterministicChecks(output: CodeArenaOutput): { rubricScores: CodeArenaRubricScores; runtimeReport: CodeArenaRuntimeReport } {
  const code = output.extractedCode
  const runtimeReport = output.runtimeReport ?? { consoleMessages: [], runtimeErrors: [], requestFailures: [], blockedRequests: [] }
  const semantic = /<(main|nav|header|footer|section|article)\b/i.test(code)
  const responsive = /@media|clamp\(|min\(|max\(|vw|dvw|%/i.test(code)
  const labeledImages = !/<img\b(?![^>]*\balt=)/i.test(code)
  const labeledButtons = !/<button\b[^>]*>\s*(<svg[^>]*>.*?<\/svg>)?\s*<\/button>/is.test(code) || /aria-label=/i.test(code)
  const hasScript = /<script\b/i.test(code)
  const runtimeOk = runtimeReport.runtimeErrors.length === 0 && runtimeReport.requestFailures.length === 0
  return {
    runtimeReport,
    rubricScores: aggregateRubric({
      visualInstructionAdherence: 0,
      functionalityRuntime: hasScript ? (runtimeOk ? 100 : 35) : 75,
      responsiveness: responsive ? 100 : 45,
      codeQuality: semantic ? 90 : 60,
      accessibility: (labeledImages ? 50 : 15) + (labeledButtons ? 50 : 15),
    }),
  }
}

export async function judgeCapturedOutput({ prompt, code, desktopCapture, mobileCapture, client, judgeModelId, signal }: { prompt: string; code: string; desktopCapture: string; mobileCapture: string; client: OpenRouterClient; judgeModelId: string; signal?: AbortSignal }): Promise<{ scores: CodeArenaRubricScores; confidence: number; notes: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
  const response = await client.createChatCompletion({
    model: judgeModelId,
    temperature: 0,
    max_tokens: 700,
    messages: [{ role: 'user', content: [
      { type: 'text', text: `Evaluate this generated frontend against the request. Return each dimension from 0-100. Do not infer working behavior contradicted by visible evidence or the supplied HTML.\n\nRequest: ${prompt}\n\nHTML excerpt:\n${code.slice(0, 12000)}` },
      { type: 'image_url', image_url: { url: desktopCapture } },
      { type: 'image_url', image_url: { url: mobileCapture } },
    ] }],
    response_format: { type: 'json_schema', json_schema: { name: 'code_arena_rubric', strict: true, schema: { type: 'object', additionalProperties: false, properties: { visualInstructionAdherence: { type: 'number' }, functionalityRuntime: { type: 'number' }, responsiveness: { type: 'number' }, codeQuality: { type: 'number' }, accessibility: { type: 'number' }, confidence: { type: 'number' }, notes: { type: 'string' } }, required: ['visualInstructionAdherence', 'functionalityRuntime', 'responsiveness', 'codeQuality', 'accessibility', 'confidence', 'notes'] } } },
  }, { signal })
  const content = response.choices[0]?.message.content
  if (typeof content !== 'string') throw new Error('Judge returned an unsupported response.')
  const parsed = JSON.parse(content) as Omit<CodeArenaRubricScores, 'total'> & { confidence: number; notes: string }
  return { scores: aggregateRubric(parsed), confidence: Math.max(0, Math.min(1, parsed.confidence)), notes: parsed.notes, usage: response.usage }
}
