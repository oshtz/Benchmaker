import { create } from 'zustand'
import type { RunResult, TestCaseResult, ExecutionStatus, ScoringResult } from '@/types'

interface RunState {
  runs: RunResult[]
  currentRunId: string | null

  // Run Actions
  createRun: (run: Omit<RunResult, 'id'>) => RunResult
  updateRunStatus: (runId: string, status: ExecutionStatus) => void
  completeRun: (runId: string) => void
  deleteRun: (runId: string) => void
  clearAllRuns: () => void
  setCurrentRun: (runId: string | null) => void

  // Result Actions
  addResult: (runId: string, result: TestCaseResult) => void
  updateResult: (runId: string, testCaseId: string, modelId: string, updates: Partial<TestCaseResult>) => void
  updateStreamedContent: (runId: string, testCaseId: string, modelId: string, content: string) => void
  setResultScore: (runId: string, testCaseId: string, modelId: string, score: ScoringResult) => void

  // Getters
  getCurrentRun: () => RunResult | null
  getRunById: (runId: string) => RunResult | null
  getResultsForTestCase: (runId: string, testCaseId: string) => TestCaseResult[]
  getResultsForModel: (runId: string, modelId: string) => TestCaseResult[]
  getAggregateScores: (runId: string) => Map<string, number>
  getAggregateCosts: (runId: string) => Map<string, number>
  getTotalCost: (runId: string) => number
}

function generateId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useRunStore = create<RunState>()((set, get) => ({
  runs: [],
  currentRunId: null,

  createRun: (runData) => {
    const newRun: RunResult = {
      id: generateId(),
      ...runData,
    }
    set((state) => ({
      runs: [newRun, ...state.runs],
      currentRunId: newRun.id,
    }))
    return newRun
  },

  updateRunStatus: (runId, status) => {
    set((state) => ({
      runs: state.runs.map((run) => (run.id === runId ? { ...run, status } : run)),
    }))
  },

  completeRun: (runId) => {
    set((state) => ({
      runs: state.runs.map((run) =>
        run.id === runId
          ? { ...run, status: 'completed' as ExecutionStatus, completedAt: Date.now() }
          : run
      ),
    }))
  },

  deleteRun: (runId) => {
    set((state) => ({
      runs: state.runs.filter((run) => run.id !== runId),
      currentRunId: state.currentRunId === runId ? null : state.currentRunId,
    }))
  },

  clearAllRuns: () => {
    set({ runs: [], currentRunId: null })
  },

  setCurrentRun: (runId) => set({ currentRunId: runId }),

  addResult: (runId, result) => {
    set((state) => ({
      runs: state.runs.map((run) =>
        run.id === runId ? { ...run, results: [...run.results, result] } : run
      ),
    }))
  },

  updateResult: (runId, testCaseId, modelId, updates) => {
    set((state) => ({
      runs: state.runs.map((run) =>
        run.id === runId
          ? {
              ...run,
              results: run.results.map((r) =>
                r.testCaseId === testCaseId && r.modelId === modelId
                  ? { ...r, ...updates }
                  : r
              ),
            }
          : run
      ),
    }))
  },

  updateStreamedContent: (runId, testCaseId, modelId, content) => {
    set((state) => ({
      runs: state.runs.map((run) =>
        run.id === runId
          ? {
              ...run,
              results: run.results.map((r) =>
                r.testCaseId === testCaseId && r.modelId === modelId
                  ? { ...r, streamedContent: content }
                  : r
              ),
            }
          : run
      ),
    }))
  },

  setResultScore: (runId, testCaseId, modelId, score) => {
    set((state) => ({
      runs: state.runs.map((run) =>
        run.id === runId
          ? {
              ...run,
              results: run.results.map((r) =>
                r.testCaseId === testCaseId && r.modelId === modelId
                  ? { ...r, score }
                  : r
              ),
            }
          : run
      ),
    }))
  },

  getCurrentRun: () => {
    const state = get()
    return state.runs.find((r) => r.id === state.currentRunId) || null
  },

  getRunById: (runId) => {
    return get().runs.find((r) => r.id === runId) || null
  },

  getResultsForTestCase: (runId, testCaseId) => {
    const run = get().runs.find((r) => r.id === runId)
    return run?.results.filter((r) => r.testCaseId === testCaseId) || []
  },

  getResultsForModel: (runId, modelId) => {
    const run = get().runs.find((r) => r.id === runId)
    return run?.results.filter((r) => r.modelId === modelId) || []
  },

  getAggregateScores: (runId) => {
    const run = get().runs.find((r) => r.id === runId)
    const scores = new Map<string, number>()

    if (!run) return scores

    const modelScores = new Map<string, { total: number; count: number }>()

    for (const result of run.results) {
      if (result.score) {
        const existing = modelScores.get(result.modelId) || { total: 0, count: 0 }
        modelScores.set(result.modelId, {
          total: existing.total + result.score.score,
          count: existing.count + 1,
        })
      }
    }

    for (const [modelId, { total, count }] of modelScores) {
      scores.set(modelId, count > 0 ? total / count : 0)
    }

    return scores
  },

  getAggregateCosts: (runId) => {
    const run = get().runs.find((r) => r.id === runId)
    const costs = new Map<string, number>()

    if (!run) return costs

    for (const result of run.results) {
      if (result.cost !== undefined) {
        const existing = costs.get(result.modelId) || 0
        costs.set(result.modelId, existing + result.cost)
      }
    }

    return costs
  },

  getTotalCost: (runId) => {
    const run = get().runs.find((r) => r.id === runId)
    if (!run) return 0

    return run.results.reduce((total, result) => {
      return total + (result.cost || 0)
    }, 0)
  },
}))
