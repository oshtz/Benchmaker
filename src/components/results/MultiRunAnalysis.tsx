import { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bar } from '@/components/dither-kit/bar'
import { BarChart } from '@/components/dither-kit/bar-chart'
import { Grid } from '@/components/dither-kit/grid'
import { Tooltip } from '@/components/dither-kit/tooltip'
import { XAxis } from '@/components/dither-kit/x-axis'
import { YAxis } from '@/components/dither-kit/y-axis'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useRunStore, type ModelComparison } from '@/stores/runStore'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import type { MultiRunStats, RunResult } from '@/types'

interface MultiRunAnalysisProps {
  currentRun: RunResult
}

function formatScore(score: number) {
  return `${(score * 100).toFixed(1)}%`
}

function formatCI(ci: [number, number]) {
  return `[${(ci[0] * 100).toFixed(1)}, ${(ci[1] * 100).toFixed(1)}]`
}

function MultiRunIntervalChart({
  models,
  stats,
}: {
  models: string[]
  stats: Map<string, MultiRunStats>
}) {
  const rows = models
    .map((modelId) => {
      const modelStats = stats.get(modelId)
      return modelStats ? { modelId, stats: modelStats } : null
    })
    .filter((row): row is { modelId: string; stats: MultiRunStats } => row !== null)

  if (rows.length < 2) return null

  const data = rows.map(({ modelId, stats: modelStats }) => ({
    modelId,
    displayName: modelId.split('/').pop() || modelId,
    mean: modelStats.mean,
  }))
  const config = {
    mean: { label: 'Mean score', color: 'purple' as const },
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-xs font-medium">Mean score by model</h4>
        <span className="text-[10px] text-muted-foreground">0-100%</span>
      </div>
      <div className="h-64">
        <BarChart
          data={data}
          config={config}
          bloom="aura"
          margins={{ top: 10, right: 12, bottom: 30, left: 42 }}
        >
          <Grid />
          <XAxis dataKey="displayName" maxTicks={6} />
          <YAxis tickFormatter={(value) => formatScore(value)} />
          <Tooltip labelKey="displayName" valueFormatter={(value) => formatScore(value)} />
          <Bar dataKey="mean" variant="hatched" />
        </BarChart>
      </div>
    </div>
  )
}

export function MultiRunAnalysis({ currentRun }: MultiRunAnalysisProps) {
  const { getRunsForTestSuite, getMultiRunStats, compareModels } = useRunStore()
  const { testSuites } = useTestSuiteStore()
  const [isOpen, setIsOpen] = useState(false)

  const testSuite = testSuites.find((s) => s.id === currentRun.testSuiteId)
  const relatedRuns = getRunsForTestSuite(currentRun.testSuiteId)
  const runIds = relatedRuns.map((r) => r.id)
  const multiRunStats = getMultiRunStats(runIds, testSuite?.testCases)

  // Get all unique models across runs
  const allModels = Array.from(multiRunStats.keys())

  // Sort by mean score descending
  const sortedModels = allModels.sort((a, b) => {
    const statsA = multiRunStats.get(a)
    const statsB = multiRunStats.get(b)
    return (statsB?.mean || 0) - (statsA?.mean || 0)
  })

  // Calculate model comparisons for top 2 models
  const topComparison: ModelComparison | null = useMemo(() => {
    if (sortedModels.length < 2) return null
    return compareModels(runIds, sortedModels[0], sortedModels[1], testSuite?.testCases) || null
  }, [runIds, sortedModels, testSuite?.testCases, compareModels])

  // Only show if there are multiple completed runs
  if (relatedRuns.length < 2) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Multi-Run Analysis
                <Badge variant="secondary" className="ml-2">
                  {relatedRuns.length} runs
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm">
                {isOpen ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <MultiRunIntervalChart models={sortedModels} stats={multiRunStats} />

              {/* Model Statistics Table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Model</th>
                      <th className="text-right p-2 font-medium">Mean</th>
                      <th className="text-right p-2 font-medium">Std Dev</th>
                      <th className="text-right p-2 font-medium">95% CI</th>
                      <th className="text-right p-2 font-medium">Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedModels.map((modelId, index) => {
                      const stats = multiRunStats.get(modelId)
                      if (!stats) return null

                      return (
                        <tr 
                          key={modelId} 
                          className={index === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}
                        >
                          <td className="p-2 font-mono text-xs truncate max-w-[200px]" title={modelId}>
                            {index === 0 && <TrendingUp className="h-3 w-3 inline mr-1 text-emerald-600" />}
                            {modelId.split('/').pop()}
                          </td>
                          <td className="text-right p-2 font-semibold">
                            {formatScore(stats.mean)}
                          </td>
                          <td className="text-right p-2 text-muted-foreground">
                            ±{(stats.stdDev * 100).toFixed(1)}%
                          </td>
                          <td className="text-right p-2 text-muted-foreground text-xs">
                            {formatCI(stats.confidence95)}
                          </td>
                          <td className="text-right p-2 text-muted-foreground text-xs">
                            {formatScore(stats.min)} - {formatScore(stats.max)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Statistical Comparison */}
              {topComparison && (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Statistical Comparison: Top 2 Models
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Score Difference:</span>
                      <span className="ml-2 font-semibold">
                        {(topComparison.scoreDiff * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">p-value:</span>
                      <span className="ml-2 font-semibold">
                        {topComparison.pValue.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effect Size (Cohen's d):</span>
                      <span className="ml-2 font-semibold">
                        {topComparison.effectSize.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Significant:</span>
                      <Badge 
                        variant={topComparison.isSignificant ? 'success' : 'secondary'}
                        className="ml-2"
                      >
                        {topComparison.isSignificant ? 'Yes (p < 0.05)' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  {topComparison.isSignificant && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {sortedModels[0].split('/').pop()} significantly outperforms{' '}
                      {sortedModels[1].split('/').pop()} with a{' '}
                      {Math.abs(topComparison.effectSize) > 0.8
                        ? 'large'
                        : Math.abs(topComparison.effectSize) > 0.5
                        ? 'medium'
                        : 'small'}{' '}
                      effect size.
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Based on {relatedRuns.length} completed runs of "{currentRun.testSuiteName}".
                Run more benchmarks for higher statistical confidence.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
