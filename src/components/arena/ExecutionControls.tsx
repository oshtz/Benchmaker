import { useState } from 'react'
import { Play, Square, Repeat, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { useSettingsStore } from '@/stores/settingsStore'
import { useModelStore } from '@/stores/modelStore'
import { useRunStore } from '@/stores/runStore'
import { executeRun } from '@/services/execution'
import type { TestSuite } from '@/types'

interface ExecutionControlsProps {
  testSuite: TestSuite
}

export function ExecutionControls({ testSuite }: ExecutionControlsProps) {
  const { apiKey } = useSettingsStore()
  const { selectedModelIds, parameters, judgeModelId } = useModelStore()
  const { createRun } = useRunStore()
  const { toast } = useToast()

  const [isRunning, setIsRunning] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [currentRunIndex, setCurrentRunIndex] = useState(0)
  const [totalRuns, setTotalRuns] = useState(1)

  const canRun = selectedModelIds.length > 0 && testSuite.testCases.length > 0

  const executeSingleRun = async (controller: AbortController): Promise<string> => {
    const run = createRun({
      testSuiteId: testSuite.id,
      testSuiteName: testSuite.name,
      models: selectedModelIds,
      parameters,
      results: [],
      status: 'running',
      startedAt: Date.now(),
      judgeModel: judgeModelId || undefined,
    })

    await executeRun(run.id, testSuite, apiKey!, controller.signal)
    return run.id
  }

  const handleRun = async (numRuns: number = 1) => {
    if (!canRun || !apiKey) {
      toast({
        title: 'Cannot start run',
        description: 'Please select at least one model and ensure test cases exist',
        variant: 'destructive',
      })
      return
    }

    const controller = new AbortController()
    setAbortController(controller)
    setIsRunning(true)
    setTotalRuns(numRuns)
    setCurrentRunIndex(0)

    const completedRunIds: string[] = []
    let cancelled = false

    try {
      for (let i = 0; i < numRuns; i++) {
        if (controller.signal.aborted) {
          cancelled = true
          break
        }

        setCurrentRunIndex(i + 1)
        const runId = await executeSingleRun(controller)
        completedRunIds.push(runId)
      }

      if (!cancelled) {
        if (numRuns === 1) {
          toast({
            title: 'Run completed',
            description: `Benchmarked ${selectedModelIds.length} models on ${testSuite.testCases.length} test cases`,
          })
        } else {
          toast({
            title: `${numRuns} runs completed`,
            description: `Completed ${numRuns} benchmark runs. Use Results tab to analyze multi-run statistics.`,
          })
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast({
          title: 'Runs cancelled',
          description: `Stopped after ${completedRunIds.length} of ${numRuns} runs`,
        })
      } else {
        toast({
          title: 'Run failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        })
      }
    } finally {
      setIsRunning(false)
      setAbortController(null)
      setCurrentRunIndex(0)
      setTotalRuns(1)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const runOptions = [3, 5, 10]

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <Button variant="destructive" onClick={handleStop}>
          <Square className="h-4 w-4 mr-2" />
          Stop {totalRuns > 1 ? `(${currentRunIndex}/${totalRuns})` : ''}
        </Button>
      ) : (
        <div className="flex items-center">
          <Button 
            onClick={() => handleRun(1)} 
            disabled={!canRun}
            className="rounded-r-none"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Benchmark
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default" 
                disabled={!canRun}
                className="rounded-l-none border-l border-primary-foreground/20 px-2"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {runOptions.map((n) => (
                <DropdownMenuItem key={n} onClick={() => handleRun(n)}>
                  <Repeat className="h-4 w-4 mr-2" />
                  Run {n} times
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {selectedModelIds.length === 0 && (
        <span className="text-sm text-muted-foreground">
          Select models to run
        </span>
      )}
    </div>
  )
}
