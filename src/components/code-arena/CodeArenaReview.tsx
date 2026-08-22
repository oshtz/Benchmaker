import { useState } from 'react'
import { Camera, Check, Download, Eye, Loader2, RotateCcw, Trash2, Trophy, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useCodeArenaRunStore } from '@/stores/codeArenaRunStore'
import { useCodeArenaStore } from '@/stores/codeArenaStore'
import { captureCodeArenaOutput, getCachedCapture } from '@/services/codeArenaCapture'
import { CODE_ARENA_RUBRIC_VERSION, judgeCapturedOutput, runDeterministicChecks } from '@/services/codeArenaEvaluation'
import { exportCapture, exportComparisonPack, exportRawHtml } from '@/services/codeArenaExport'
import { getOpenRouterClient } from '@/services/openrouter'
import { useSettingsStore } from '@/stores/settingsStore'
import { useModelStore } from '@/stores/modelStore'
import type { CodeArenaJudgeStatus } from '@/types'
import { useToast } from '@/components/ui/use-toast'

export function CodeArenaReview({ mode }: { mode: 'evaluate' | 'export' }) {
  const { runs, currentRunId, setCurrentRun, updateRun, updateOutput, deleteRun } = useCodeArenaRunStore()
  const { outputs, updateOutput: updateLiveOutput, revealModels, setRevealModels, allowRemoteAssets, setAllowRemoteAssets, setPrompt, setSystemPrompt, setSelectedModelIds, setParameters, setStage } = useCodeArenaStore()
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const { apiKey } = useSettingsStore()
  const { availableModels } = useModelStore()
  const run = runs.find((item) => item.id === currentRunId) ?? runs[0]

  const freeze = async () => {
    if (!run) return
    setBusy(true)
    try {
      for (const output of run.outputs.filter((item) => item.status === 'completed' && item.extractedCode)) {
        const captures = []
        let runtimeReport = output.runtimeReport
        for (const viewport of ['desktop', 'mobile'] as const) {
          const result = await captureCodeArenaOutput(run.id, output.modelId, output.extractedCode, viewport, allowRemoteAssets)
          captures.push(result.capture); runtimeReport = result.runtimeReport
        }
        const checked = runDeterministicChecks({ ...output, runtimeReport })
        let rubricScores = checked.rubricScores
        let judgeStatus: CodeArenaJudgeStatus = run.judgeModelId ? 'pending' : 'not-requested'
        let judgeConfidence: number | undefined
        let judgeCost: number | undefined
        let score
        if (run.judgeModelId && apiKey) {
          try {
            const desktop = getCachedCapture(run.id, output.modelId, 'desktop')
            const mobile = getCachedCapture(run.id, output.modelId, 'mobile')
            if (!desktop || !mobile) throw new Error('Fixed captures are unavailable.')
            const judged = await judgeCapturedOutput({ prompt: run.prompt, code: output.extractedCode, desktopCapture: desktop, mobileCapture: mobile, client: getOpenRouterClient(apiKey), judgeModelId: run.judgeModelId })
            rubricScores = judged.scores; judgeConfidence = judged.confidence; judgeStatus = 'completed'
            score = { score: judged.scores.total / 100, confidence: judged.confidence, notes: judged.notes, rawScore: judged.scores.total, maxScore: 100 }
            const judgeModel = availableModels.find((item) => item.id === run.judgeModelId)
            if (judged.usage && judgeModel) judgeCost = judged.usage.prompt_tokens * (Number(judgeModel.pricing.prompt) || 0) + judged.usage.completion_tokens * (Number(judgeModel.pricing.completion) || 0)
          } catch { judgeStatus = 'unavailable' }
        } else if (run.judgeModelId) judgeStatus = 'unavailable'
        const patch = { captures, runtimeReport, rubricScores, judgeStatus, judgeConfidence, judgeCost, score }
        updateOutput(run.id, output.modelId, patch); if (outputs.has(output.modelId)) updateLiveOutput(output.modelId, patch)
      }
      const refreshed = useCodeArenaRunStore.getState().runs.find((item) => item.id === run.id)
      const judgeCost = refreshed?.outputs.reduce((sum, item) => sum + (item.judgeCost ?? 0), 0)
      updateRun(run.id, { captureProfile: 'fixed-v1-static', evaluation: { rubricVersion: CODE_ARENA_RUBRIC_VERSION, judgeModelId: run.judgeModelId, captureProfile: 'fixed-v1-static', evaluatedAt: Date.now(), generationCost: run.outputs.reduce((sum, item) => sum + (item.cost ?? 0), 0), judgeCost } })
      toast({ title: 'Run frozen', description: 'Fixed desktop/mobile captures, deterministic checks, and requested judging completed.' })
    } catch (error) { toast({ title: 'Capture failed', description: error instanceof Error ? error.message : 'Unable to capture run', variant: 'destructive' }) } finally { setBusy(false) }
  }

  if (!run) return <Card><CardContent className="flex min-h-64 items-center justify-center text-muted-foreground">Create a run to unlock {mode}.</CardContent></Card>

  const rerun = () => { setPrompt(run.prompt); setSystemPrompt(run.systemPrompt); setSelectedModelIds(run.models); setParameters(run.parameters); setStage('configure') }
  return <div className="grid min-h-0 gap-4 xl:grid-cols-[280px_1fr]">
    <Card className="min-h-0"><CardHeader><CardTitle className="text-base">Run history</CardTitle></CardHeader><CardContent className="space-y-2 overflow-auto">{runs.map((item) => <button key={item.id} type="button" onClick={() => setCurrentRun(item.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${item.id === run.id ? 'border-primary bg-primary/10' : 'hover:bg-muted/60'}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{item.prompt}</span><Badge variant={item.status === 'completed-with-errors' ? 'destructive' : 'secondary'}>{item.status === 'completed-with-errors' ? 'Completed with errors' : item.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{new Date(item.startedAt).toLocaleString()} · {item.models.length} models</p></button>)}</CardContent></Card>
    <Card className="min-h-0"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{mode === 'evaluate' ? 'Freeze & evaluate' : 'Export artifacts'}</CardTitle><p className="mt-1 text-xs text-muted-foreground">Generation ${run.outputs.reduce((sum, item) => sum + (item.cost ?? 0), 0).toFixed(4)} · Judge {run.evaluation?.judgeCost ? `$${run.evaluation.judgeCost.toFixed(4)}` : '—'}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={rerun}><RotateCcw className="mr-1 h-4 w-4" />Rerun</Button><Button variant="outline" size="icon" aria-label="Delete run" onClick={() => deleteRun(run.id)}><Trash2 className="h-4 w-4" /></Button></div></div></CardHeader><CardContent className="space-y-4">
      {mode === 'evaluate' ? <><div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-3"><div className="flex items-center gap-3"><Switch id="remote-assets" checked={allowRemoteAssets} onCheckedChange={setAllowRemoteAssets} /><Label htmlFor="remote-assets"><span>Allow remote assets</span><span className="block text-xs font-normal text-muted-foreground">Offline/self-contained is the default.</span></Label></div><Button onClick={freeze} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}Freeze & capture</Button></div><div className="flex items-center justify-between"><Button variant="outline" size="sm" onClick={() => setRevealModels(!revealModels)}><Eye className="mr-2 h-4 w-4" />{revealModels ? 'Hide models' : 'Reveal models'}</Button>{run.humanWinnerModelId && <Badge className="gap-1"><Trophy className="h-3 w-3" />Human winner recorded</Badge>}</div><div className="grid gap-3 md:grid-cols-2">{run.outputs.map((output, index) => <div key={output.modelId} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><strong className="text-sm">{revealModels ? output.modelId.split('/').pop() : `Model ${index + 1}`}</strong>{output.rubricScores && <Badge>{Math.round(output.rubricScores.total)}%</Badge>}</div><p className="mt-2 text-xs text-muted-foreground">Judge: {output.judgeStatus ?? 'not-requested'} · Captures: {output.captures?.length ?? 0}/2</p><Button className="mt-3 w-full" variant={run.humanWinnerModelId === output.modelId ? 'default' : 'outline'} size="sm" onClick={() => updateRun(run.id, { humanWinnerModelId: output.modelId })}><Check className="mr-1 h-4 w-4" />Choose human winner</Button></div>)}</div></>
      : <><div className="grid gap-3 sm:grid-cols-2">{run.outputs.filter((item) => item.status === 'completed').map((output) => <div key={output.modelId} className="rounded-lg border p-3"><strong className="text-sm">{output.modelId.split('/').pop()}</strong><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void exportRawHtml(run, output.modelId)}><Download className="mr-1 h-4 w-4" />HTML</Button><Button size="sm" variant="outline" disabled={!output.captures?.length} onClick={() => void exportCapture(run, output.modelId, 'desktop')}><Camera className="mr-1 h-4 w-4" />PNG</Button></div></div>)}</div><div className="flex flex-wrap gap-2 border-t pt-4"><Button onClick={() => void exportComparisonPack(run, true)}><Download className="mr-2 h-4 w-4" />Comparison pack</Button><Button variant="outline" disabled title="Bundled FFmpeg encoder is not provisioned in this build"><Video className="mr-2 h-4 w-4" />MP4 · desktop required</Button></div></>}
    </CardContent></Card>
  </div>
}
