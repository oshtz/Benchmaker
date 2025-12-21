import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import { ResponseCell } from './ResponseCell'
import type { RunResult } from '@/types'

interface ComparisonGridProps {
  run: RunResult
}

export function ComparisonGrid({ run }: ComparisonGridProps) {
  const { testSuites } = useTestSuiteStore()
  const testSuite = testSuites.find((s) => s.id === run.testSuiteId)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  if (!testSuite) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Test suite not found
        </CardContent>
      </Card>
    )
  }

  const toggleRow = (testCaseId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(testCaseId)) {
        next.delete(testCaseId)
      } else {
        next.add(testCaseId)
      }
      return next
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500'
    if (score >= 0.6) return 'bg-yellow-500'
    if (score >= 0.4) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getResultForCell = (testCaseId: string, modelId: string) => {
    return run.results.find(
      (r) => r.testCaseId === testCaseId && r.modelId === modelId
    )
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full min-h-0">
      <CardHeader className="pb-2 sm:pb-4 shrink-0">
        <CardTitle className="text-base sm:text-lg md:text-xl">Comparison Grid</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="min-w-max">
            {/* Header Row */}
            <div className="flex border-b border-border/70 bg-background/70 sticky top-0 backdrop-blur">
              <div className="w-40 sm:w-52 md:w-64 shrink-0 p-2 sm:p-3 font-medium border-r border-border/70 text-sm sm:text-base">
                Test Case
              </div>
              {run.models.map((modelId) => (
                <div
                  key={modelId}
                  className="w-40 sm:w-52 md:w-64 shrink-0 p-2 sm:p-3 font-medium border-r border-border/70 text-center text-sm sm:text-base"
                >
                  <span className="truncate block">
                    {modelId.split('/').pop()}
                  </span>
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {testSuite.testCases.map((testCase, index) => (
              <div key={testCase.id} className="border-b border-border/60">
                {/* Summary Row */}
                <div
                  className="flex cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => toggleRow(testCase.id)}
                >
                  <div className="w-40 sm:w-52 md:w-64 shrink-0 p-2 sm:p-3 border-r border-border/60 flex items-center gap-1.5 sm:gap-2">
                    {expandedRows.has(testCase.id) ? (
                      <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    )}
                    <span className="text-xs sm:text-sm font-medium">#{index + 1}</span>
                    <span className="text-xs sm:text-sm truncate flex-1">
                      {testCase.prompt.slice(0, 30)}...
                    </span>
                  </div>
                  {run.models.map((modelId) => {
                    const result = getResultForCell(testCase.id, modelId)
                    return (
                      <div
                        key={modelId}
                        className="w-40 sm:w-52 md:w-64 shrink-0 p-2 sm:p-3 border-r border-border/60 flex items-center justify-center"
                      >
                        {result?.status === 'running' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : result?.status === 'failed' ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : result?.score ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getScoreColor(
                                result.score.score
                              )}`}
                            />
                            <span className="font-mono text-sm">
                              {(result.score.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        ) : result?.status === 'completed' ? (
                          <Badge variant="outline">No score</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Expanded Content */}
                {expandedRows.has(testCase.id) && (
                  <div className="bg-muted/20">
                    {/* Prompt */}
                    <div className="p-3 sm:p-4 border-b border-border/60">
                      <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">
                        Prompt
                      </div>
                      <div className="text-xs sm:text-sm whitespace-pre-wrap">
                        {testCase.prompt}
                      </div>
                      {testCase.expectedOutput && (
                        <div className="mt-2">
                          <div className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">
                            Expected Output
                          </div>
                          <div className="text-xs sm:text-sm font-mono bg-background/70 p-2 rounded-lg border border-border/60">
                            {testCase.expectedOutput}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Responses */}
                    <div className="flex">
                      <div className="w-40 sm:w-52 md:w-64 shrink-0 p-2 sm:p-3 border-r border-border/60 text-xs sm:text-sm font-medium text-muted-foreground">
                        Responses
                      </div>
                      {run.models.map((modelId) => {
                        const result = getResultForCell(testCase.id, modelId)
                        return (
                          <div
                            key={modelId}
                            className="w-40 sm:w-52 md:w-64 shrink-0 p-2 sm:p-3 border-r border-border/60"
                          >
                            <ResponseCell result={result} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
