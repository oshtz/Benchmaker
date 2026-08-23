import { expect, it } from 'vitest'
import { codeArenaFileName } from './codeArenaExport'
import type { CodeArenaRun } from '@/types'

it('builds stable sanitized Code Arena filenames', () => {
  const run = { id: '1', type: 'code-arena', prompt: '', systemPrompt: '', models: [], parameters: { temperature: 0, topP: 1, maxTokens: 1, frequencyPenalty: 0, presencePenalty: 0 }, outputs: [], status: 'completed', startedAt: Date.UTC(2026, 7, 23) } satisfies CodeArenaRun
  expect(codeArenaFileName(run, 'Model / Alpha', 'png')).toBe('benchmaker-code-arena-2026-08-23-model-alpha.png')
})
