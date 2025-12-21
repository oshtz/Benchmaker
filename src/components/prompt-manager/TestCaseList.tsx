import { useState } from 'react'
import { Plus, Trash2, Edit, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import { TestCaseEditor } from './TestCaseEditor'
import type { TestSuite, TestCase } from '@/types'

interface TestCaseListProps {
  testSuite: TestSuite
}

export function TestCaseList({ testSuite }: TestCaseListProps) {
  const { deleteTestCase } = useTestSuiteStore()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const getExpectedLabel = (method: TestCase['scoringMethod']) => {
    switch (method) {
      case 'regex-match':
        return 'Regex Pattern'
      case 'numeric-tolerance':
        return 'Expected Number'
      case 'boolean':
        return 'Expected Text'
      case 'llm-judge':
        return 'Reference Answer'
      default:
        return 'Expected Output'
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDelete = (testCaseId: string) => {
    deleteTestCase(testSuite.id, testCaseId)
  }

  const getScoringBadgeVariant = (method: string) => {
    switch (method) {
      case 'exact-match':
        return 'default'
      case 'regex-match':
        return 'secondary'
      case 'llm-judge':
        return 'outline'
      default:
        return 'default'
    }
  }

  const getScoringBadgeLabel = (method: string) => {
    switch (method) {
      case 'exact-match':
        return 'Exact'
      case 'regex-match':
        return 'Regex'
      case 'llm-judge':
        return 'Judge'
      case 'numeric-tolerance':
        return 'Numeric'
      case 'boolean':
        return 'Bool'
      default:
        return method
    }
  }

  return (
    <>
      <Card className="h-full flex flex-col min-w-0 min-h-0 overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Test Cases</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {testSuite.testCases.length} test case
                {testSuite.testCases.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsCreating(true)} className="shrink-0">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden min-w-0 min-h-0">
          <div className="h-full overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
            {testSuite.testCases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No test cases yet. Click "Add" to create one.
              </div>
            ) : (
              <div className="space-y-2 min-w-0">
                {testSuite.testCases.map((testCase, index) => (
                  <div
                    key={testCase.id}
                    className="border border-border/70 rounded-xl overflow-hidden bg-background/50 min-w-0"
                  >
                    <div
                      className="group flex items-center gap-2 p-3 bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors min-w-0"
                      onClick={() => toggleExpanded(testCase.id)}
                    >
                      {expandedIds.has(testCase.id) ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <span className="text-sm font-medium shrink-0">
                        #{index + 1}
                      </span>
                      <span className="text-sm truncate flex-1 min-w-0">
                        {testCase.prompt.slice(0, 50)}
                        {testCase.prompt.length > 50 ? '...' : ''}
                      </span>
                      <Badge variant={getScoringBadgeVariant(testCase.scoringMethod)} className="shrink-0 text-xs">
                        {getScoringBadgeLabel(testCase.scoringMethod)}
                      </Badge>
                      <div className="flex items-center shrink-0 gap-0.5">
                        <button
                          className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent/60 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTestCase(testCase)
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(testCase.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {expandedIds.has(testCase.id) && (
                      <div className="p-3 border-t border-border/60 bg-background/70 space-y-2">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Prompt:
                          </span>
                          <p className="text-sm whitespace-pre-wrap">
                            {testCase.prompt}
                          </p>
                        </div>
                        {testCase.expectedOutput && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {getExpectedLabel(testCase.scoringMethod)}:
                            </span>
                            <p className="text-sm whitespace-pre-wrap font-mono bg-muted p-2 rounded">
                              {testCase.expectedOutput}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {testCase.metadata.category && (
                            <Badge variant="outline">
                              {testCase.metadata.category}
                            </Badge>
                          )}
                          {testCase.metadata.difficulty && (
                            <Badge variant="outline">
                              {testCase.metadata.difficulty}
                            </Badge>
                          )}
                          {testCase.metadata.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TestCaseEditor
        testSuiteId={testSuite.id}
        testCase={editingTestCase}
        open={isCreating || !!editingTestCase}
        onClose={() => {
          setIsCreating(false)
          setEditingTestCase(null)
        }}
      />
    </>
  )
}
