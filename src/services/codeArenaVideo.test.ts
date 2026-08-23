import { describe, expect, it } from 'vitest'
import type { CodeArenaRun } from '@/types'
import { buildCodeArenaVideoTimeline, CODE_ARENA_VIDEO_PRESETS, defaultCodeArenaVideoSelection } from './codeArenaVideo'

const run: CodeArenaRun = {
  id: 'run-1',
  type: 'code-arena',
  prompt: 'Build a dashboard',
  systemPrompt: '',
  models: ['model/a', 'model/b', 'model/c'],
  parameters: { temperature: 0, topP: 1, maxTokens: 1000, frequencyPenalty: 0, presencePenalty: 0 },
  status: 'completed',
  startedAt: 1,
  outputs: [
    { modelId: 'model/a', rawResponse: '', extractedCode: '<html></html>', status: 'completed', captures: [{ viewport: 'desktop', width: 1440, height: 900, createdAt: 1 }, { viewport: 'mobile', width: 390, height: 844, createdAt: 1 }], rubricScores: { visualInstructionAdherence: 90, functionalityRuntime: 90, responsiveness: 90, codeQuality: 90, accessibility: 90, total: 90 } },
    { modelId: 'model/b', rawResponse: '', extractedCode: '<html></html>', status: 'completed', captures: [{ viewport: 'desktop', width: 1440, height: 900, createdAt: 1 }, { viewport: 'mobile', width: 390, height: 844, createdAt: 1 }], rubricScores: { visualInstructionAdherence: 95, functionalityRuntime: 95, responsiveness: 95, codeQuality: 95, accessibility: 95, total: 95 } },
    { modelId: 'model/c', rawResponse: '', extractedCode: '', status: 'failed' },
  ],
}

describe('Code Arena video timeline', () => {
  it('defaults to the highest-scoring captured outputs', () => {
    expect(defaultCodeArenaVideoSelection(run)).toEqual(['model/b', 'model/a'])
  })

  it('builds a deterministic intro, model-card, leaderboard sequence', () => {
    expect(buildCodeArenaVideoTimeline(run, ['model/b', 'model/a'])).toEqual([
      { kind: 'intro', durationMs: 1500 },
      { kind: 'model', modelId: 'model/b', durationMs: 2750 },
      { kind: 'model', modelId: 'model/a', durationMs: 2750 },
      { kind: 'leaderboard', durationMs: 2500 },
    ])
  })

  it('retains the established share-image aspect presets', () => {
    expect(CODE_ARENA_VIDEO_PRESETS).toEqual({
      wide: { width: 1600, height: 900 },
      square: { width: 1080, height: 1080 },
      portrait: { width: 1080, height: 1350 },
      story: { width: 1080, height: 1920 },
    })
  })
})
