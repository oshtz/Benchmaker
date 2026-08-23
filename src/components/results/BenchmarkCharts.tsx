import { BarChart3, Gauge } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar } from '@/components/dither-kit/bar'
import { BarChart } from '@/components/dither-kit/bar-chart'
import { Grid } from '@/components/dither-kit/grid'
import { Legend } from '@/components/dither-kit/legend'
import { Radar } from '@/components/dither-kit/radar'
import { RadarChart } from '@/components/dither-kit/radar-chart'
import { Tooltip } from '@/components/dither-kit/tooltip'
import { XAxis } from '@/components/dither-kit/x-axis'
import { YAxis } from '@/components/dither-kit/y-axis'
import type { RunResult, TestCase } from '@/types'

interface BenchmarkChartsProps {
  run: RunResult
  testCases: TestCase[]
}

export interface ModelChartRow {
  modelId: string
  displayName: string
  effectiveScore: number
  scoredMean: number | null
  scoredCount: number
  totalExpected: number
  coverage: number
  totalCost: number
  meanLatencyMs: number | null
}

type RadarMetric = { metric: string } & Record<string, string | number>

export interface TradeoffRadarData {
  basis: 'cost' | 'latency'
  models: ModelChartRow[]
  metrics: RadarMetric[]
}

function shortModelName(modelId: string): string {
  return modelId.split('/').pop() || modelId
}

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00'
  if (cost < 0.0001) return '<$0.0001'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

function formatLatency(latencyMs: number | null): string {
  if (!latencyMs) return '-'
  if (latencyMs < 1000) return `${Math.round(latencyMs)}ms`
  return `${(latencyMs / 1000).toFixed(1)}s`
}

function isPositive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0
}

function metricRow(
  metric: string,
  models: ModelChartRow[],
  value: (model: ModelChartRow) => number,
): RadarMetric | null {
  const values = models.map(value)
  if (!values.every(Number.isFinite)) return null

  return Object.assign(
    { metric },
    Object.fromEntries(models.map((model, index) => [model.modelId, values[index]])),
  )
}

export function buildTradeoffRadarData(rows: ModelChartRow[]): TradeoffRadarData | null {
  const costRows = rows.filter((row) => isPositive(row.totalCost))
  const latencyRows = rows.filter((row) => isPositive(row.meanLatencyMs))
  const basis = costRows.length >= 2 ? 'cost' : 'latency'
  const models = (basis === 'cost' ? costRows : latencyRows).slice(0, 3)

  if (models.length < 2) return null

  const metrics = [
    metricRow('Score', models, (model) => model.effectiveScore),
    metricRow('Coverage', models, (model) => model.coverage),
  ].filter((metric): metric is RadarMetric => metric !== null)

  if (models.every((model) => isPositive(model.totalCost))) {
    const cheapest = Math.min(...models.map((model) => model.totalCost))
    const affordability = metricRow(
      'Affordability',
      models,
      (model) => cheapest / model.totalCost,
    )
    if (affordability) metrics.push(affordability)
  }

  if (models.every((model) => isPositive(model.meanLatencyMs))) {
    const fastest = Math.min(...models.map((model) => model.meanLatencyMs as number))
    const speed = metricRow(
      'Speed',
      models,
      (model) => fastest / (model.meanLatencyMs as number),
    )
    if (speed) metrics.push(speed)
  }

  return metrics.length >= 3 ? { basis, models, metrics } : null
}

function getModelRows(run: RunResult, testCases: TestCase[]): ModelChartRow[] {
  const weightMap = new Map(testCases.map((testCase) => [testCase.id, testCase.weight || 1]))
  const fallbackTestCaseIds = new Set(run.results.map((result) => result.testCaseId))
  const totalExpected = testCases.length || fallbackTestCaseIds.size
  const totalExpectedWeight = testCases.length
    ? testCases.reduce((sum, testCase) => sum + (testCase.weight || 1), 0)
    : totalExpected

  return run.models
    .map((modelId) => {
      const modelResults = run.results.filter((result) => result.modelId === modelId)
      let weightedScore = 0
      let scoredWeight = 0
      let totalCost = 0
      const latencies: number[] = []

      for (const result of modelResults) {
        if (result.score) {
          const weight = weightMap.get(result.testCaseId) || 1
          weightedScore += result.score.score * weight
          scoredWeight += weight
        }

        totalCost += result.cost || 0
        if (result.latencyMs) latencies.push(result.latencyMs)
      }

      const scoredCount = modelResults.filter((result) => result.score).length
      const scoredMean = scoredWeight > 0 ? weightedScore / scoredWeight : null
      const effectiveScore = totalExpectedWeight > 0 ? weightedScore / totalExpectedWeight : 0
      const meanLatencyMs = latencies.length > 0
        ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length
        : null

      return {
        modelId,
        displayName: shortModelName(modelId),
        effectiveScore,
        scoredMean,
        scoredCount,
        totalExpected,
        coverage: totalExpected > 0 ? scoredCount / totalExpected : 0,
        totalCost,
        meanLatencyMs,
      }
    })
    .filter((row) => row.scoredCount > 0)
    .sort((left, right) => right.effectiveScore - left.effectiveScore || right.coverage - left.coverage)
}

function ScoreLeaderboard({ rows }: { rows: ModelChartRow[] }) {
  const config = {
    effectiveScore: { label: 'Effective score', color: 'green' as const },
    coverage: { label: 'Coverage', color: 'blue' as const },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Model Score Leaderboard
        </CardTitle>
        <CardDescription>
          Effective score and result coverage for each model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <BarChart
            data={rows}
            config={config}
            bloom="low"
            margins={{ top: 28, right: 12, bottom: 32, left: 42 }}
          >
            <Grid />
            <XAxis dataKey="displayName" maxTicks={6} />
            <YAxis tickFormatter={(value) => formatPercent(value, 0)} />
            <Legend align="right" />
            <Tooltip labelKey="displayName" valueFormatter={(value) => formatPercent(value)} />
            <Bar dataKey="effectiveScore" variant="gradient" />
            <Bar dataKey="coverage" variant="dotted" />
          </BarChart>
        </div>
      </CardContent>
    </Card>
  )
}

function TradeoffChart({ rows }: { rows: ModelChartRow[] }) {
  const radar = buildTradeoffRadarData(rows)
  if (!radar) return null

  const colors = ['green', 'blue', 'purple'] as const
  const variants = ['gradient', 'dotted', 'hatched'] as const
  const config = Object.fromEntries(
    radar.models.map((model, index) => [
      model.modelId,
      { label: model.displayName, color: colors[index] },
    ]),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Model Tradeoffs
        </CardTitle>
        <CardDescription>
          Top scored models compared by quality and {radar.basis === 'cost' ? 'affordability' : 'speed'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-64">
          <RadarChart
            data={radar.metrics}
            config={config}
            nameKey="metric"
            bloom="low"
            margins={{ top: 30, right: 24, bottom: 16, left: 24 }}
          >
            <Legend isClickable align="center" />
            <Tooltip valueFormatter={(value) => formatPercent(value)} />
            {radar.models.map((model, index) => (
              <Radar
                key={model.modelId}
                dataKey={model.modelId}
                variant={variants[index]}
              />
            ))}
          </RadarChart>
        </div>
        <div className="divide-y rounded-lg border bg-muted/20 px-3">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>Model</span>
            <span>Score</span>
            <span>Cost</span>
            <span>Latency</span>
          </div>
          {radar.models.map((model) => (
            <div key={model.modelId} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-2 text-xs">
              <span className="truncate font-medium" title={model.modelId}>{model.displayName}</span>
              <span className="tabular-nums">{formatPercent(model.effectiveScore)}</span>
              <span className="tabular-nums text-muted-foreground">{formatCost(model.totalCost)}</span>
              <span className="tabular-nums text-muted-foreground">{formatLatency(model.meanLatencyMs)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function BenchmarkCharts({ run, testCases }: BenchmarkChartsProps) {
  const rows = getModelRows(run, testCases)

  if (rows.length < 2) return null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ScoreLeaderboard rows={rows} />
      <TradeoffChart rows={rows} />
    </div>
  )
}
