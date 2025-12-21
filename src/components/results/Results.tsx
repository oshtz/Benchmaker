import { useState } from 'react'
import { History, Trash2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRunStore } from '@/stores/runStore'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { ComparisonGrid } from './ComparisonGrid'
import { ReportSummary } from './ReportSummary'

export function Results() {
  const { runs, currentRunId, setCurrentRun, deleteRun } = useRunStore()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { testSuites } = useTestSuiteStore()
  const { apiKey } = useSettingsStore()

  const currentRun = runs.find((r) => r.id === currentRunId)

  const hasApiKey = Boolean(apiKey)
  const hasTestSuites = testSuites.length > 0
  const hasTestCases = testSuites.some((s) => s.testCases.length > 0)

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No Benchmark Results Yet"
        description="Complete the setup steps and run your first benchmark to see results."
        steps={[
          {
            number: 1,
            title: 'Set your API key',
            description: 'Configure your OpenRouter API key in the header',
            completed: hasApiKey,
          },
          {
            number: 2,
            title: 'Create a test suite',
            description: 'Define prompts and test cases in the Prompts tab',
            completed: hasTestSuites && hasTestCases,
          },
          {
            number: 3,
            title: 'Run a benchmark',
            description: 'Select models in the Arena tab and execute',
            completed: false,
          },
        ]}
        action={
          hasApiKey && hasTestSuites && hasTestCases ? (
            <Button size="lg" variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Go to Arena
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-6">
      <div className="surface-strong rounded-3xl p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div>
          <h2 className="headline">Results</h2>
          <p className="text-sm text-muted-foreground">
            Review runs, inspect model responses, and compare scores.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={currentRunId || ''} onValueChange={setCurrentRun}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a run" />
            </SelectTrigger>
            <SelectContent>
              {runs.map((run) => (
                <SelectItem key={run.id} value={run.id}>
                  <div className="flex flex-col">
                    <span>{run.testSuiteName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()} - {run.models.length}{' '}
                      models
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentRunId && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {currentRun && (
        <div className="flex-1 min-h-0 flex flex-col gap-6">
          <div className="shrink-0">
            <ReportSummary run={currentRun} />
          </div>
          <div className="flex-1 min-h-0">
            <ComparisonGrid run={currentRun} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Benchmark Run"
        description="Are you sure you want to delete this benchmark run? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (currentRunId) {
            deleteRun(currentRunId)
          }
          setDeleteDialogOpen(false)
        }}
      />
    </div>
  )
}
