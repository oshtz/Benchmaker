// Test Suite and Test Case Types
export interface TestCase {
  id: string
  prompt: string
  expectedOutput?: string
  scoringMethod: ScoringMethod
  weight: number
  metadata: {
    category?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    tags: string[]
  }
}

export interface TestSuite {
  id: string
  name: string
  description?: string
  systemPrompt: string
  judgeSystemPrompt?: string
  testCases: TestCase[]
  createdAt: number
  updatedAt: number
}

// Scoring Types
export type ScoringMethod =
  | 'exact-match'
  | 'regex-match'
  | 'numeric-tolerance'
  | 'boolean'
  | 'llm-judge'

export interface ScoringResult {
  score: number // 0-1 normalized
  confidence?: number
  notes?: string
  rawScore?: number
  maxScore?: number
}

export interface ScoringConfig {
  method: ScoringMethod
  // For regex matching
  pattern?: string
  flags?: string
  // For numeric tolerance
  tolerance?: number
  // For LLM judge
  judgeModel?: string
  rubric?: string
}

// Model Types
export interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
  top_provider?: {
    context_length: number
    max_completion_tokens?: number
  }
}

export interface ModelParameters {
  temperature: number
  topP: number
  maxTokens: number
  frequencyPenalty: number
  presencePenalty: number
}

// Execution Types
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface TestCaseResult {
  testCaseId: string
  modelId: string
  response: string
  tokenCount?: number
  latencyMs?: number
  status: ExecutionStatus
  error?: string
  score?: ScoringResult
  streamedContent?: string
}

export interface RunResult {
  id: string
  testSuiteId: string
  testSuiteName: string
  models: string[]
  parameters: ModelParameters
  results: TestCaseResult[]
  status: ExecutionStatus
  startedAt: number
  completedAt?: number
  judgeModel?: string
}

// Settings Types
export interface Settings {
  apiKey: string
  defaultTemperature: number
  defaultTopP: number
  defaultMaxTokens: number
  theme: 'light' | 'dark' | 'system'
}

export interface BenchmakerDb {
  version: number
  updatedAt: number
  testSuites: TestSuite[]
  runs: RunResult[]
  activeTestSuiteId: string | null
  currentRunId: string | null
}

// OpenRouter API Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
}

export interface ChatCompletionResponse {
  id: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
