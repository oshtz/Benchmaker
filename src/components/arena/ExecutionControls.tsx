import { useState } from 'react'
import { Play, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const { createRun, updateRunStatus } = useRunStore()
  const { toast } = useToast()

  const [isRunning, setIsRunning] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const canRun = selectedModelIds.length > 0 && testSuite.testCases.length > 0

  const handleRun = async () => {
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

    try {
      await executeRun(run.id, testSuite, apiKey, controller.signal)
      toast({
        title: 'Run completed',
        description: `Benchmarked ${selectedModelIds.length} models on ${testSuite.testCases.length} test cases`,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateRunStatus(run.id, 'cancelled')
        toast({
          title: 'Run cancelled',
          description: 'The benchmark run was stopped',
        })
      } else {
        updateRunStatus(run.id, 'failed')
        toast({
          title: 'Run failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        })
      }
    } finally {
      setIsRunning(false)
      setAbortController(null)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <Button variant="destructive" onClick={handleStop}>
          <Square className="h-4 w-4 mr-2" />
          Stop
        </Button>
      ) : (
        <Button onClick={handleRun} disabled={!canRun}>
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run Benchmark
        </Button>
      )}

      {selectedModelIds.length === 0 && (
        <span className="text-sm text-muted-foreground">
          Select models to run
        </span>
      )}
    </div>
  )
}
