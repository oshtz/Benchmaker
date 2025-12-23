import { getOpenRouterClient, type StreamResult } from './openrouter'
import { useRunStore } from '@/stores/runStore'
import { useModelStore } from '@/stores/modelStore'
import { scoreResponse } from '@/scoring'
import type { TestSuite, TestCaseResult, ChatMessage, ModelParameters, OpenRouterModel } from '@/types'

function calculateCost(
  usage: StreamResult['usage'],
  model: OpenRouterModel | undefined
): number | undefined {
  if (!usage || !model) return undefined

  const promptPrice = parseFloat(model.pricing.prompt) || 0
  const completionPrice = parseFloat(model.pricing.completion) || 0

  const promptCost = usage.prompt_tokens * promptPrice
  const completionCost = usage.completion_tokens * completionPrice

  return promptCost + completionCost
}

export async function executeRun(
  runId: string,
  testSuite: TestSuite,
  apiKey: string,
  signal: AbortSignal
): Promise<void> {
  const client = getOpenRouterClient(apiKey)
  const { addResult, updateResult, setResultScore, completeRun } = useRunStore.getState()
  const { selectedModelIds, parameters, judgeModelId, availableModels } = useModelStore.getState()

  // Create a map for quick model lookup
  const modelMap = new Map(availableModels.map(m => [m.id, m]))

  // Create initial result entries for all test case + model combinations
  for (const testCase of testSuite.testCases) {
    for (const modelId of selectedModelIds) {
      const initialResult: TestCaseResult = {
        testCaseId: testCase.id,
        modelId,
        response: '',
        status: 'idle',
        streamedContent: '',
      }
      addResult(runId, initialResult)
    }
  }

  // Execute all combinations in parallel batches
  const concurrencyLimit = 5 // Limit concurrent requests
  const tasks: Array<() => Promise<void>> = []

  for (const testCase of testSuite.testCases) {
    for (const modelId of selectedModelIds) {
      tasks.push(async () => {
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        const startTime = Date.now()
        updateResult(runId, testCase.id, modelId, { status: 'running' })

        try {
          const messages: ChatMessage[] = []

          // Add system prompt if present
          if (testSuite.systemPrompt) {
            messages.push({
              role: 'system',
              content: testSuite.systemPrompt,
            })
          }

          // Add the test case prompt
          messages.push({
            role: 'user',
            content: testCase.prompt,
          })

          const { content: fullResponse, usage } = await generateResponseWithRetries(
            client,
            modelId,
            messages,
            parameters,
            runId,
            testCase.id,
            signal,
            updateResult
          )

          const latencyMs = Date.now() - startTime
          const model = modelMap.get(modelId)
          const cost = calculateCost(usage, model)

          updateResult(runId, testCase.id, modelId, {
            response: fullResponse,
            status: 'completed',
            latencyMs,
            promptTokens: usage?.prompt_tokens,
            completionTokens: usage?.completion_tokens,
            cost,
          })

          // Score the response
          const score = await scoreResponse(
            testCase,
            fullResponse,
            judgeModelId ? client : undefined,
            judgeModelId || undefined,
            testSuite.judgeSystemPrompt
          )

          setResultScore(runId, testCase.id, modelId, score)
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            updateResult(runId, testCase.id, modelId, { status: 'cancelled' })
            throw error
          }

          updateResult(runId, testCase.id, modelId, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })
    }
  }

  // Execute with concurrency limit
  await executeWithConcurrency(tasks, concurrencyLimit, signal)

  completeRun(runId)
}

const MAX_EMPTY_RESPONSE_RETRIES = 2
const EMPTY_RESPONSE_BACKOFF_MS = 400

interface ResponseWithUsage {
  content: string
  usage?: StreamResult['usage']
}

async function generateResponseWithRetries(
  client: ReturnType<typeof getOpenRouterClient>,
  modelId: string,
  messages: ChatMessage[],
  parameters: ModelParameters,
  runId: string,
  testCaseId: string,
  signal: AbortSignal,
  updateResult: (runId: string, testCaseId: string, modelId: string, updates: Partial<TestCaseResult>) => void
): Promise<ResponseWithUsage> {
  for (let attempt = 0; attempt <= MAX_EMPTY_RESPONSE_RETRIES; attempt++) {
    updateResult(runId, testCaseId, modelId, { streamedContent: '' })

    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    let streamedContent = ''
    const result = await client.createChatCompletionStreamWithUsage(
      {
        model: modelId,
        messages,
        temperature: parameters.temperature,
        top_p: parameters.topP,
        max_tokens: parameters.maxTokens,
        frequency_penalty: parameters.frequencyPenalty,
        presence_penalty: parameters.presencePenalty,
      },
      (chunk) => {
        streamedContent += chunk
        updateResult(runId, testCaseId, modelId, {
          streamedContent,
        })
      }
    )

    if (result.content.trim().length > 0) {
      return result
    }

    const fallbackResult = await fetchNonStreamingResponse(
      client,
      modelId,
      messages,
      parameters,
      signal
    )
    if (fallbackResult.content.trim().length > 0) {
      updateResult(runId, testCaseId, modelId, {
        streamedContent: fallbackResult.content,
      })
      return fallbackResult
    }

    if (attempt < MAX_EMPTY_RESPONSE_RETRIES) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      await delay(EMPTY_RESPONSE_BACKOFF_MS * (attempt + 1))
    }
  }

  return { content: '' }
}

async function fetchNonStreamingResponse(
  client: ReturnType<typeof getOpenRouterClient>,
  modelId: string,
  messages: ChatMessage[],
  parameters: ModelParameters,
  signal: AbortSignal
): Promise<ResponseWithUsage> {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  try {
    const completion = await client.createChatCompletion({
      model: modelId,
      messages,
      temperature: parameters.temperature,
      top_p: parameters.topP,
      max_tokens: parameters.maxTokens,
      frequency_penalty: parameters.frequencyPenalty,
      presence_penalty: parameters.presencePenalty,
    })

    const content = completion.choices?.[0]?.message?.content
    return {
      content: typeof content === 'string' ? content : '',
      usage: completion.usage,
    }
  } catch {
    return { content: '' }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function executeWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number,
  signal: AbortSignal
): Promise<void> {
  const executing = new Set<Promise<void>>()
  const errors: Error[] = []

  for (const task of tasks) {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const promise = task().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      errors.push(error)
    })

    executing.add(promise)
    promise.finally(() => executing.delete(promise))

    if (executing.size >= limit) {
      try {
        await Promise.race(executing)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
      }
    }
  }

  await Promise.all(executing)

  if (errors.length > 0) {
    console.error('Some tasks failed:', errors)
  }
}
