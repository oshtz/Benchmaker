import { useState } from 'react'
import { Plus, FolderOpen, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { JudgePromptEditor } from './JudgePromptEditor'
import { SystemPromptEditor } from './SystemPromptEditor'
import { TestCaseList } from './TestCaseList'
import { TestSuiteSelector } from './TestSuiteSelector'
import { TestCaseGeneratorDialog } from './TestCaseGeneratorDialog'
import { BenchmarkGeneratorDialog } from './BenchmarkGeneratorDialog'

export function PromptManager() {
  const { testSuites, activeTestSuiteId, createTestSuite } = useTestSuiteStore()
  const { apiKey } = useSettingsStore()
  const activeTestSuite = testSuites.find((s) => s.id === activeTestSuiteId)

  const [newSuiteName, setNewSuiteName] = useState('')
  const [newSuiteDescription, setNewSuiteDescription] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreateSuite = () => {
    if (!newSuiteName.trim()) return
    createTestSuite(newSuiteName.trim(), newSuiteDescription.trim() || undefined)
    setNewSuiteName('')
    setNewSuiteDescription('')
    setDialogOpen(false)
  }

  if (testSuites.length === 0) {
    return (
      <>
        <EmptyState
          icon={FolderOpen}
          title="Build your first benchmark suite"
          description="Define prompts, constraints, and evaluation rules to compare models."
          steps={[
            {
              number: 1,
              title: 'Create a test suite',
              description: 'Group related test cases with a shared system prompt',
            },
            {
              number: 2,
              title: 'Add test cases',
              description: 'Define prompts and expected outputs to evaluate',
            },
            {
              number: 3,
              title: 'Run in the Arena',
              description: 'Select models, configure parameters, and execute',
            },
          ]}
          action={
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <BenchmarkGeneratorDialog
                trigger={
                  <Button size="lg" disabled={!apiKey}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                }
              />
              <span className="text-muted-foreground text-sm">or</span>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create manually
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Test Suite</DialogTitle>
                    <DialogDescription>
                      A test suite contains a system prompt and multiple test cases
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="suite-name">Name</Label>
                      <Input
                        id="suite-name"
                        placeholder="e.g., Logic Puzzles Benchmark"
                        value={newSuiteName}
                        onChange={(e) => setNewSuiteName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suite-description">Description (optional)</Label>
                      <Input
                        id="suite-description"
                        placeholder="e.g., Tests reasoning and logic capabilities"
                        value={newSuiteDescription}
                        onChange={(e) => setNewSuiteDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSuite} disabled={!newSuiteName.trim()}>
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          }
        />
      </>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 sm:gap-6">
      <div className="surface-strong rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="min-w-0">
          <TestSuiteSelector />
        </div>
        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center shrink-0">
          {activeTestSuite && <TestCaseGeneratorDialog testSuite={activeTestSuite} />}
          <BenchmarkGeneratorDialog />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Suite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Test Suite</DialogTitle>
                <DialogDescription>
                  A test suite contains a system prompt and multiple test cases
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="suite-name">Name</Label>
                  <Input
                    id="suite-name"
                    placeholder="e.g., Logic Puzzles Benchmark"
                    value={newSuiteName}
                    onChange={(e) => setNewSuiteName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suite-description">Description (optional)</Label>
                  <Input
                    id="suite-description"
                    placeholder="e.g., Tests reasoning and logic capabilities"
                    value={newSuiteDescription}
                    onChange={(e) => setNewSuiteDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSuite} disabled={!newSuiteName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {activeTestSuite && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch flex-1 min-h-0">
          <div className="flex flex-col gap-4 sm:gap-6 min-h-0">
            <SystemPromptEditor testSuite={activeTestSuite} />
            <JudgePromptEditor testSuite={activeTestSuite} />
          </div>
          <div className="min-h-0 min-w-0 flex">
            <div className="flex-1 min-h-0">
              <TestCaseList testSuite={activeTestSuite} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
