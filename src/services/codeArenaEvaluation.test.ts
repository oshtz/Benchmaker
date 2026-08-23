import { describe, expect, it } from 'vitest'
import { aggregateRubric, runDeterministicChecks } from './codeArenaEvaluation'

describe('Code Arena evaluation', () => {
  it('aggregates the versioned rubric weights', () => {
    expect(aggregateRubric({ visualInstructionAdherence: 100, functionalityRuntime: 50, responsiveness: 80, codeQuality: 60, accessibility: 70 }).total).toBe(78)
  })

  it('keeps deterministic checks separate from judge availability', () => {
    const result = runDeterministicChecks({ modelId: 'model/a', rawResponse: '', extractedCode: '<main><button aria-label="Save">Save</button><style>@media(max-width:600px){main{width:100%}}</style></main>', status: 'completed', judgeStatus: 'unavailable' })
    expect(result.rubricScores.responsiveness).toBe(100)
    expect(result.rubricScores.visualInstructionAdherence).toBe(0)
  })
})
