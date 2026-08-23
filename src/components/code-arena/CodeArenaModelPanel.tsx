import { AlertCircle, Clock, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DitherAvatar } from '@/components/dither-kit/avatar'
import { ditherHueForName } from '@/lib/dither'
import { CodePreviewPanel } from './CodePreviewPanel'
import { CodeEditorView } from './CodeEditorView'
import type { CodeArenaOutput, CodeArenaViewMode, CodeArenaViewport } from '@/types'

interface Props { modelId: string; anonymousLabel: string; revealModel: boolean; output?: CodeArenaOutput; viewMode: CodeArenaViewMode; viewport: CodeArenaViewport }

export function CodeArenaModelPanel({ modelId, anonymousLabel, revealModel, output, viewMode, viewport }: Props) {
  const name = revealModel ? modelId.split('/').pop() || modelId : anonymousLabel
  const avatarSeed = revealModel ? modelId : anonymousLabel
  const displayCode = output?.status === 'running' ? '' : output?.extractedCode || ''
  const report = output?.runtimeReport
  const status = output?.status ?? 'idle'
  return <Card className="flex min-h-[360px] flex-col overflow-hidden">
    <CardHeader className="shrink-0 border-b px-3 py-2">
      <div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><DitherAvatar name={avatarSeed} hue={ditherHueForName(avatarSeed)} size={24} animate={false} className="shrink-0 rounded-sm" /><CardTitle className="truncate text-sm" title={revealModel ? modelId : name}>{name}</CardTitle></div><div className="flex items-center gap-2"><Badge variant={status === 'failed' ? 'destructive' : status === 'completed' ? 'default' : 'secondary'}>{status === 'completed' ? 'Done' : status}</Badge>{output?.rubricScores && <Badge>{Math.round(output.rubricScores.total)}%</Badge>}</div></div>
      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">{output?.latencyMs ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(output.latencyMs / 1000).toFixed(1)}s</span> : null}{output?.cost ? <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${output.cost.toFixed(4)}</span> : null}<span>{viewport === 'desktop' ? '1440×900' : '390×844'}</span></div>
    </CardHeader>
    <CardContent className="flex flex-1 min-h-0 items-stretch justify-center p-0">
      {status === 'failed' ? <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-destructive"><AlertCircle className="h-8 w-8" /><p className="text-center text-sm">{output?.error}</p></div>
      : status === 'running' ? <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6"><div className="h-20 w-full animate-pulse rounded-lg bg-muted" /><span className="decoding-text text-sm text-primary">STREAMING CODE · {output?.streamedContent?.length ?? 0} chars</span></div>
      : viewMode === 'code' ? <CodeEditorView code={displayCode} className="h-full w-full" />
      : viewMode === 'console' ? <div className="w-full overflow-auto bg-zinc-950 p-3 font-mono text-xs text-zinc-300">{!report || (report.consoleMessages.length === 0 && report.runtimeErrors.length === 0) ? 'No captured console output.' : <>{report.runtimeErrors.map((message) => <p key={message} className="text-red-400">ERROR {message}</p>)}{report.consoleMessages.map((entry, index) => <p key={`${entry.level}-${index}`}><span className="uppercase text-zinc-500">{entry.level}</span> {entry.message}</p>)}</>}</div>
      : <div className={viewport === 'mobile' ? 'h-full w-[390px] max-w-full border-x bg-white' : 'h-full w-full'}><CodePreviewPanel code={displayCode} className="h-full" /></div>}
    </CardContent>
  </Card>
}
