import { useMemo, useState } from 'react'
import {
  Trophy,
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  Clock,
  Award,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Medal,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Area } from '@/components/dither-kit/area'
import { AreaChart } from '@/components/dither-kit/area-chart'
import { DitherAvatar } from '@/components/dither-kit/avatar'
import { DitherGradient } from '@/components/dither-kit/gradient'
import { Grid } from '@/components/dither-kit/grid'
import { Pie } from '@/components/dither-kit/pie'
import { PieChart } from '@/components/dither-kit/pie-chart'
import { Sparkline } from '@/components/dither-kit/sparkline'
import { Tooltip } from '@/components/dither-kit/tooltip'
import { XAxis } from '@/components/dither-kit/x-axis'
import { YAxis } from '@/components/dither-kit/y-axis'
import { ditherHueForName } from '@/lib/dither'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRunStore } from '@/stores/runStore'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import { computeAnalytics, type AnalyticsData, type InterestingFact } from '@/services/analytics'

function FactIcon({ type }: { type: InterestingFact['type'] }) {
  switch (type) {
    case 'improvement':
      return <TrendingUp className="h-5 w-5 text-emerald-500" />
    case 'streak':
      return <Flame className="h-5 w-5 text-orange-500" />
    case 'record':
      return <Trophy className="h-5 w-5 text-yellow-500" />
    case 'comparison':
      return <Target className="h-5 w-5 text-blue-500" />
    case 'insight':
      return <Sparkles className="h-5 w-5 text-purple-500" />
    default:
      return <Activity className="h-5 w-5 text-gray-500" />
  }
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return <Medal className="h-5 w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />
    default:
      return <span className="text-sm text-muted-foreground font-medium">#{rank}</span>
  }
}

function OverallStats({ analytics }: { analytics: AnalyticsData }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Total Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.totalRuns}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Completed benchmarks
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            Total Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.totalTests}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Individual evaluations
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Models Tested
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.totalModels}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Unique models evaluated
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Award className="h-4 w-4" />
            Average Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-emerald-600">
            {(analytics.avgScoreOverall * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across all models
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function InterestingFacts({ facts }: { facts: InterestingFact[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayedFacts = showAll ? facts : facts.slice(0, 4)

  if (facts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Interesting Facts
        </CardTitle>
        <CardDescription>
          Insights and highlights from your benchmark data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {displayedFacts.map((fact, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="mt-0.5">
                <FactIcon type={fact.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{fact.title}</span>
                  {fact.value && (
                    <Badge variant="secondary" className="text-xs">
                      {fact.value}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fact.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        {facts.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {facts.length - 4} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function Leaderboard({ analytics }: { analytics: AnalyticsData }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('overall')
  
  const categories = useMemo(() => {
    const cats = ['overall', ...Array.from(analytics.categoryLeaderboards.keys())]
    return cats
  }, [analytics.categoryLeaderboards])

  const leaderboard = useMemo(() => {
    if (selectedCategory === 'overall') {
      return analytics.overallLeaderboard
    }
    return analytics.categoryLeaderboards.get(selectedCategory) || []
  }, [selectedCategory, analytics])

  const modelTrends = useMemo(() => {
    const trends = new Map<string, number[]>()
    for (const entry of analytics.overallLeaderboard) {
      trends.set(
        entry.modelId,
        analytics.timeSeriesData
          .map((point) => point.modelScores.get(entry.modelId))
          .filter((value): value is number => typeof value === 'number'),
      )
    }
    return trends
  }, [analytics.overallLeaderboard, analytics.timeSeriesData])

  if (analytics.overallLeaderboard.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Model Leaderboard
            </CardTitle>
            <CardDescription>
              Rankings based on average benchmark scores
            </CardDescription>
          </div>
          {categories.length > 1 && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'overall' ? 'Overall' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.modelId}
              className={`relative isolate flex items-center gap-4 overflow-hidden rounded-lg p-3 transition-colors ${
                entry.rank === 1
                  ? 'border border-primary/25 bg-primary/5'
                  : entry.rank === 2
                  ? 'bg-gray-500/10 border border-gray-500/20'
                  : entry.rank === 3
                  ? 'bg-amber-600/10 border border-amber-600/20'
                  : 'bg-muted/50'
              }`}
            >
              {entry.rank === 1 && (
                <DitherGradient from="green" to="transparent" direction="right" cell={4} opacity={0.2} />
              )}
              <div className="relative z-10 w-8 flex justify-center">
                {getRankBadge(entry.rank)}
              </div>
              <DitherAvatar
                name={entry.modelId}
                hue={ditherHueForName(entry.modelId)}
                size={36}
                animate={false}
                className="relative z-10 shrink-0 rounded-md"
              />
              <div className="relative z-10 flex-1 min-w-0">
                <div className="font-medium truncate">{entry.modelName}</div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{entry.totalTests} tests</span>
                  {entry.winRate > 0 && (
                    <span className="text-emerald-600">
                      {(entry.winRate * 100).toFixed(0)}% win rate
                    </span>
                  )}
                  {entry.consistency > 0 && (
                    <span>±{(entry.consistency * 100).toFixed(1)}% variance</span>
                  )}
                </div>
              </div>
              <div className="relative z-10 text-right">
                <div className="text-xl font-bold text-emerald-600">
                  {(entry.avgScore * 100).toFixed(1)}%
                </div>
                {selectedCategory === 'overall' && (modelTrends.get(entry.modelId)?.length || 0) > 1 && (
                  <Sparkline
                    data={modelTrends.get(entry.modelId) || []}
                    color={entry.rank === 1 ? 'green' : entry.rank === 2 ? 'blue' : 'purple'}
                    variant="gradient"
                    className="mt-1 h-7 w-24"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CoverageDonut({ analytics }: { analytics: AnalyticsData }) {
  const totals = useMemo(() => {
    const stats = Array.from(analytics.modelStats.values())
    const scored = stats.reduce((sum, stat) => sum + stat.scores.length, 0)
    const expected = stats.reduce((sum, stat) => sum + stat.totalTests, 0)
    return { scored, expected, unscored: Math.max(expected - scored, 0) }
  }, [analytics.modelStats])

  if (totals.expected === 0) return null

  const coverage = totals.scored / totals.expected
  const data = [
    { name: 'scored', value: totals.scored },
    { name: 'unscored', value: totals.unscored },
  ]
  const config = {
    scored: { label: 'Scored', color: 'green' as const },
    unscored: { label: 'Unscored', color: 'purple' as const },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Score Coverage
        </CardTitle>
        <CardDescription>Completed evaluation cells across all benchmark runs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-56 max-w-sm">
          <PieChart
            data={data}
            config={config}
            dataKey="value"
            nameKey="name"
            innerRadius={0.62}
            animate={false}
            bloom="low"
            margins={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Pie variant="gradient" />
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{(coverage * 100).toFixed(1)}%</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {totals.scored} / {totals.expected} scored
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-5 font-mono text-xs text-muted-foreground">
          <span>{totals.scored} scored</span>
          <span>{totals.unscored} unscored</span>
        </div>
      </CardContent>
    </Card>
  )
}

function DifficultyBreakdown({ analytics }: { analytics: AnalyticsData }) {
  if (analytics.difficultyStats.length === 0) return null

  const difficultyColors = {
    easy: 'text-emerald-500 bg-emerald-500/10',
    medium: 'text-yellow-500 bg-yellow-500/10',
    hard: 'text-rose-500 bg-rose-500/10',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Performance by Difficulty
        </CardTitle>
        <CardDescription>
          How models perform across different difficulty levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {analytics.difficultyStats.map((stat) => (
            <div
              key={stat.difficulty}
              className={`p-4 rounded-lg ${difficultyColors[stat.difficulty]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="capitalize">
                  {stat.difficulty}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stat.totalTests} tests
                </span>
              </div>
              <div className="text-2xl font-bold">
                {(stat.avgScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs mt-2">
                <span className="text-muted-foreground">Top: </span>
                <span className="font-medium">{stat.topModel}</span>
                <span className="text-muted-foreground"> ({(stat.topModelScore * 100).toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ModelPerformanceDetails({ analytics }: { analytics: AnalyticsData }) {
  const [expanded, setExpanded] = useState(false)
  const modelStats = Array.from(analytics.modelStats.values())
    .sort((a, b) => b.avgScore - a.avgScore)

  if (modelStats.length === 0) return null

  const displayedModels = expanded ? modelStats : modelStats.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-500" />
          Detailed Model Statistics
        </CardTitle>
        <CardDescription>
          Comprehensive performance metrics for each model
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium">Model</th>
                <th className="text-right py-2 px-2 font-medium">Avg Score</th>
                <th className="text-right py-2 px-2 font-medium">Tests</th>
                <th className="text-right py-2 px-2 font-medium">Runs</th>
                <th className="text-right py-2 px-2 font-medium">Avg Latency</th>
                <th className="text-right py-2 px-2 font-medium">Success Rate</th>
                <th className="text-right py-2 px-2 font-medium">Wins</th>
              </tr>
            </thead>
            <tbody>
              {displayedModels.map((stat) => (
                <tr key={stat.modelId} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 px-2">
                    <span className="flex items-center gap-2 font-medium">
                      <DitherAvatar
                        name={stat.modelId}
                        hue={ditherHueForName(stat.modelId)}
                        size={24}
                        animate={false}
                        className="shrink-0 rounded-sm"
                      />
                      {stat.modelName}
                    </span>
                  </td>
                  <td className="text-right py-2 px-2">
                    <span className="text-emerald-600 font-medium">
                      {(stat.avgScore * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-2 px-2 text-muted-foreground">
                    {stat.totalTests}
                  </td>
                  <td className="text-right py-2 px-2 text-muted-foreground">
                    {stat.totalRuns}
                  </td>
                  <td className="text-right py-2 px-2 text-muted-foreground">
                    {stat.avgLatency > 0 ? `${stat.avgLatency.toFixed(0)}ms` : '-'}
                  </td>
                  <td className="text-right py-2 px-2">
                    <span className={stat.successRate >= 0.9 ? 'text-emerald-600' : 'text-yellow-600'}>
                      {(stat.successRate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-right py-2 px-2">
                    {stat.winCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {stat.winCount}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {modelStats.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {modelStats.length - 5} More Models
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineChart({ analytics }: { analytics: AnalyticsData }) {
  if (analytics.timeSeriesData.length < 2) return null

  const config = {
    avgScore: { label: 'Average score', color: 'blue' as const },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-cyan-500" />
          Performance Over Time
        </CardTitle>
        <CardDescription>
          Average scores across benchmark runs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <AreaChart
            data={analytics.timeSeriesData}
            config={config}
            bloom="low"
            margins={{ top: 10, right: 12, bottom: 30, left: 38 }}
          >
            <Grid />
            <XAxis dataKey="date" maxTicks={6} />
            <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} />
            <Tooltip
              labelKey="date"
              valueFormatter={(value) => `${(value * 100).toFixed(1)}%`}
            />
            <Area dataKey="avgScore" variant="gradient" />
          </AreaChart>
        </div>
      </CardContent>
    </Card>
  )
}

export function Analytics() {
  const { runs } = useRunStore()
  const { testSuites } = useTestSuiteStore()

  const analytics = useMemo(() => {
    return computeAnalytics(runs, testSuites)
  }, [runs, testSuites])

  if (runs.length === 0 || analytics.totalRuns === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Analytics Data Yet"
        description="Complete some benchmark runs to see analytics and insights about model performance."
        steps={[
          {
            number: 1,
            title: 'Create test cases',
            description: 'Define prompts and expected outputs in the Prompts tab',
            completed: testSuites.some(s => s.testCases.length > 0),
          },
          {
            number: 2,
            title: 'Run benchmarks',
            description: 'Execute benchmarks with multiple models in the Arena',
            completed: false,
          },
          {
            number: 3,
            title: 'View insights',
            description: 'Analytics will appear here after completing runs',
            completed: false,
          },
        ]}
      />
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-6 overflow-auto pb-6">
      <div className="surface-strong rounded-3xl p-5 shrink-0">
        <h2 className="headline">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Insights and leaderboards from all your benchmark data
          {analytics.dateRange && (
            <span className="ml-2 text-xs">
              ({new Date(analytics.dateRange.start).toLocaleDateString()} - {new Date(analytics.dateRange.end).toLocaleDateString()})
            </span>
          )}
        </p>
      </div>

      <OverallStats analytics={analytics} />

      <InterestingFacts facts={analytics.interestingFacts} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Leaderboard analytics={analytics} />
        <CoverageDonut analytics={analytics} />
      </div>

      <TimelineChart analytics={analytics} />

      <DifficultyBreakdown analytics={analytics} />

      <ModelPerformanceDetails analytics={analytics} />
    </div>
  )
}
