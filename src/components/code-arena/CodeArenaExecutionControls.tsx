import { Play, Square, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCodeArenaStore } from '@/stores/codeArenaStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { executeCodeArenaRun } from '@/services/codeArenaExecution'
import { useToast } from '@/components/ui/use-toast'

export function CodeArenaExecutionControls() {
  const { toast } = useToast()
  const { apiKey } = useSettingsStore()
  const {
    prompt,
    systemPrompt,
    selectedModelIds,
    parameters,
    judgeEnabled,
    judgeModelId,
    executionStatus,
    abortController,
    setExecutionStatus,
    setAbortController,
    initializeOutputs,
    clearOutputs,
  } = useCodeArenaStore()

  const isRunning = executionStatus === 'running'
  const canRun = prompt.trim().length > 0 && selectedModelIds.length > 0 && apiKey

  const handleRun = async () => {
    if (!canRun || isRunning) return

    // Initialize outputs for all selected models
    initializeOutputs(selectedModelIds)

    // Create abort controller
    const controller = new AbortController()
    setAbortController(controller)
    setExecutionStatus('running')

    try {
      await executeCodeArenaRun(
        prompt,
        systemPrompt,
        selectedModelIds,
        parameters,
        apiKey,
        controller.signal,
        judgeEnabled ? judgeModelId : null
      )
      setExecutionStatus('completed')
      toast({
        title: 'Code Arena Complete',
        description: `Generated code from ${selectedModelIds.length} model(s)`,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setExecutionStatus('cancelled')
        toast({
          title: 'Execution Cancelled',
          description: 'Code generation was stopped',
          variant: 'default',
        })
      } else {
        setExecutionStatus('failed')
        toast({
          title: 'Execution Failed',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive',
        })
      }
    } finally {
      setAbortController(null)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleReset = () => {
    if (isRunning) {
      handleStop()
    }
    clearOutputs()
    setExecutionStatus('idle')
  }

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleStop}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={handleRun}
          disabled={!canRun}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Run
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        disabled={isRunning}
        className="gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>

      {/* Status indicator */}
      {executionStatus !== 'idle' && (
        <span className="text-xs text-muted-foreground ml-2">
          {executionStatus === 'running' && 'Generating...'}
          {executionStatus === 'completed' && 'Completed'}
          {executionStatus === 'failed' && 'Failed'}
          {executionStatus === 'cancelled' && 'Cancelled'}
        </span>
      )}
    </div>
  )
}
