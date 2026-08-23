import { describe, expect, it } from 'vitest'
import {
  buildTradeoffRadarData,
  type ModelChartRow,
} from './BenchmarkCharts'

function row(
  modelId: string,
  overrides: Partial<ModelChartRow> = {},
): ModelChartRow {
  return {
    modelId,
    displayName: modelId,
    effectiveScore: 0.8,
    scoredMean: 0.8,
    scoredCount: 10,
    totalExpected: 10,
    coverage: 1,
    totalCost: 1,
    meanLatencyMs: 100,
    ...overrides,
  }
}

function metricValue(
  radar: NonNullable<ReturnType<typeof buildTradeoffRadarData>>,
  metric: string,
  modelId: string,
): number {
  return radar.metrics.find((item) => item.metric === metric)?.[modelId] as number
}

describe('buildTradeoffRadarData', () => {
  it('selects the top three eligible scored models', () => {
    const radar = buildTradeoffRadarData([
      row('first'),
      row('second'),
      row('third'),
      row('fourth'),
    ])

    expect(radar?.models.map((model) => model.modelId)).toEqual(['first', 'second', 'third'])
  })

  it('prefers cost and falls back to latency when fewer than two costs are positive', () => {
    const costRadar = buildTradeoffRadarData([
      row('a', { totalCost: 2 }),
      row('b', { totalCost: 4 }),
    ])
    const latencyRadar = buildTradeoffRadarData([
      row('a', { totalCost: 0, meanLatencyMs: 100 }),
      row('b', { totalCost: 0, meanLatencyMs: 200 }),
    ])

    expect(costRadar?.basis).toBe('cost')
    expect(latencyRadar?.basis).toBe('latency')
    expect(latencyRadar?.metrics.map((metric) => metric.metric)).toEqual([
      'Score',
      'Coverage',
      'Speed',
    ])
  })

  it('normalizes affordability and speed by their cheapest and fastest values', () => {
    const radar = buildTradeoffRadarData([
      row('a', { totalCost: 2, meanLatencyMs: 100 }),
      row('b', { totalCost: 4, meanLatencyMs: 250 }),
    ])

    expect(radar).not.toBeNull()
    expect(metricValue(radar!, 'Affordability', 'a')).toBe(1)
    expect(metricValue(radar!, 'Affordability', 'b')).toBe(0.5)
    expect(metricValue(radar!, 'Speed', 'a')).toBe(1)
    expect(metricValue(radar!, 'Speed', 'b')).toBe(0.4)
  })

  it('normalizes equal efficiency values to one', () => {
    const radar = buildTradeoffRadarData([
      row('a', { totalCost: 3, meanLatencyMs: 150 }),
      row('b', { totalCost: 3, meanLatencyMs: 150 }),
    ])

    expect(metricValue(radar!, 'Affordability', 'a')).toBe(1)
    expect(metricValue(radar!, 'Affordability', 'b')).toBe(1)
    expect(metricValue(radar!, 'Speed', 'a')).toBe(1)
    expect(metricValue(radar!, 'Speed', 'b')).toBe(1)
  })

  it('omits the radar when eligible models or valid axes are missing', () => {
    expect(buildTradeoffRadarData([
      row('only', { totalCost: 1, meanLatencyMs: null }),
      row('missing', { totalCost: 0, meanLatencyMs: null }),
    ])).toBeNull()

    expect(buildTradeoffRadarData([
      row('a', { coverage: Number.NaN, totalCost: 1, meanLatencyMs: null }),
      row('b', { coverage: Number.NaN, totalCost: 2, meanLatencyMs: null }),
    ])).toBeNull()
  })
})
