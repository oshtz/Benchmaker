import { useEffect, useMemo, useRef } from 'react'
import { Bar } from '@/components/dither-kit/bar'
import { BarChart } from '@/components/dither-kit/bar-chart'
import { DitherAvatar } from '@/components/dither-kit/avatar'
import { DitherGradient } from '@/components/dither-kit/gradient'
import { Pie } from '@/components/dither-kit/pie'
import { PieChart } from '@/components/dither-kit/pie-chart'
import { ditherHueForName } from '@/lib/dither'
import type { BenchmarkExportDocument, ShareImageDitherAssets } from '@/services/benchmarkExport'

interface DitherExportAssetsProps {
  assetKey: string
  document: BenchmarkExportDocument
  onReady: (assetKey: string, assets: ShareImageDitherAssets) => void
}

function captureCanvasStack(root: HTMLElement | null): string | undefined {
  if (!root) return undefined
  const rootRect = root.getBoundingClientRect()
  if (rootRect.width <= 0 || rootRect.height <= 0) return undefined

  const output = window.document.createElement('canvas')
  output.width = Math.round(rootRect.width)
  output.height = Math.round(rootRect.height)
  const context = output.getContext('2d')
  if (!context) return undefined

  for (const canvas of root.querySelectorAll('canvas')) {
    const rect = canvas.getBoundingClientRect()
    const style = window.getComputedStyle(canvas)
    context.save()
    context.globalAlpha = Number.parseFloat(style.opacity || '1')
    context.globalCompositeOperation = style.mixBlendMode === 'plus-lighter' ? 'lighter' : 'source-over'
    if (style.filter && style.filter !== 'none') context.filter = style.filter
    context.drawImage(
      canvas,
      rect.left - rootRect.left,
      rect.top - rootRect.top,
      rect.width,
      rect.height,
    )
    context.restore()
  }

  return output.toDataURL('image/png')
}

export function DitherExportAssets({ assetKey, document, onReady }: DitherExportAssetsProps) {
  const barsRef = useRef<HTMLDivElement>(null)
  const donutRef = useRef<HTMLDivElement>(null)
  const gradientRef = useRef<HTMLDivElement>(null)
  const avatarRefs = useRef(new Map<string, HTMLDivElement>())

  const rows = useMemo(
    () => document.modelRows.slice(0, 6).map((row) => ({ model: row.displayName, score: row.effectiveScore })),
    [document.modelRows],
  )
  const coverage = useMemo(() => [
    { name: 'scored', value: document.summary.scoredCount },
    {
      name: 'unscored',
      value: Math.max(document.summary.expectedResultCount - document.summary.scoredCount, 0),
    },
  ], [document.summary.expectedResultCount, document.summary.scoredCount])

  useEffect(() => {
    let cancelled = false
    let timeout = 0
    let firstFrame = 0
    let secondFrame = 0

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        timeout = window.setTimeout(() => {
          if (cancelled) return
          const avatars = Object.fromEntries(
            document.modelRows.slice(0, 6).flatMap((row) => {
              const image = captureCanvasStack(avatarRefs.current.get(row.modelId) || null)
              return image ? [[row.modelId, image]] : []
            }),
          )
          onReady(assetKey, {
            scoreBars: captureCanvasStack(barsRef.current),
            coverageDonut: captureCanvasStack(donutRef.current),
            gradient: captureCanvasStack(gradientRef.current),
            avatars,
          })
        }, 80)
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      window.clearTimeout(timeout)
    }
  }, [assetKey, document.modelRows, onReady])

  const barConfig = { score: { label: 'Effective score', color: 'green' as const } }
  const pieConfig = {
    scored: { label: 'Scored', color: 'green' as const },
    unscored: { label: 'Unscored', color: 'purple' as const },
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] overflow-hidden"
    >
      <div ref={gradientRef} className="relative h-[260px] w-[960px] overflow-hidden">
        <DitherGradient from="green" to="purple" direction="right" opacity={0.42} />
      </div>
      <div ref={barsRef} className="h-[400px] w-[720px]">
        <BarChart
          data={rows}
          config={barConfig}
          animate={false}
          interactive={false}
          bloom="low"
          margins={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Bar dataKey="score" variant="gradient" />
        </BarChart>
      </div>
      <div ref={donutRef} className="h-[240px] w-[240px]">
        <PieChart
          data={coverage}
          config={pieConfig}
          dataKey="value"
          nameKey="name"
          innerRadius={0.62}
          animate={false}
          bloom="low"
          margins={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Pie variant="gradient" />
        </PieChart>
      </div>
      <div className="flex gap-4">
        {document.modelRows.slice(0, 6).map((row) => (
          <div
            key={row.modelId}
            ref={(node) => {
              if (node) avatarRefs.current.set(row.modelId, node)
              else avatarRefs.current.delete(row.modelId)
            }}
            className="h-24 w-24"
          >
            <DitherAvatar
              name={document.options.anonymizeModelIds ? row.displayName : row.modelId}
              hue={ditherHueForName(document.options.anonymizeModelIds ? row.displayName : row.modelId)}
              size={96}
              animate={false}
              bloom="low"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
