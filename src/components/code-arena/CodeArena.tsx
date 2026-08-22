import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Code2, Key, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useSettingsStore } from '@/stores/settingsStore'
import { useModelStore } from '@/stores/modelStore'
import { useCodeArenaStore } from '@/stores/codeArenaStore'
import { getOpenRouterClient } from '@/services/openrouter'
import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { CodeArenaHeader } from './CodeArenaHeader'
import { CodeArenaGrid } from './CodeArenaGrid'
import { CodeArenaExecutionControls } from './CodeArenaExecutionControls'
import { CodeArenaJudgeSelector } from './CodeArenaJudgeSelector'
import { CodeArenaParameters } from './CodeArenaParameters'
import { CodeArenaReview } from './CodeArenaReview'
import { ModelSelector } from '@/components/arena/ModelSelector'
import { ExecutionSafetyPanel } from '@/components/arena/ExecutionSafetyPanel'

const stages = [{ id: 'configure', label: 'Configure' }, { id: 'create', label: 'Create' }, { id: 'evaluate', label: 'Evaluate' }, { id: 'export', label: 'Export' }] as const

export function CodeArena() {
  const { apiKey } = useSettingsStore()
  const { stage, setStage, configOpen, setConfigOpen } = useCodeArenaStore()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const modelStore = useModelStore()

  useEffect(() => {
    if (!apiKey) return
    const fresh = modelStore.lastFetchedAt && modelStore.lastFetchedAt > Date.now() - 300000 && modelStore.availableModels.length > 0
    if (fresh) return
    const fetchModels = async () => { modelStore.setIsLoadingModels(true); modelStore.setModelsError(null); try { modelStore.setAvailableModels(await getOpenRouterClient(apiKey).fetchModels()); modelStore.setLastFetchedAt(Date.now()) } catch (error) { modelStore.setModelsError(error instanceof Error ? error.message : 'Failed to fetch models') } finally { modelStore.setIsLoadingModels(false) } }
    void fetchModels()
  }, [apiKey])

  return <div className="flex h-full min-h-0 flex-col gap-3">
    <header className="surface shrink-0 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Code2 className="h-6 w-6 shrink-0 text-primary" /><div><h2 className="headline">Code Arena</h2><p className="text-xs text-muted-foreground sm:text-sm">Create, freeze, evaluate, and export reproducible frontend comparisons.</p></div></div><div className="flex items-center gap-2">{(stage === 'configure' || stage === 'create') && <CodeArenaExecutionControls />}</div></div>
      <nav className="mt-4 grid grid-cols-4 gap-1" aria-label="Code Arena stages">{stages.map((item, index) => <Button key={item.id} variant={stage === item.id ? 'default' : 'ghost'} className="h-auto justify-start gap-2 px-2 py-2 text-xs sm:px-3 sm:text-sm" onClick={() => setStage(item.id)}><span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px]">{index + 1}</span>{item.label}</Button>)}</nav>
    </header>
    {!apiKey && <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"><div className="flex items-center gap-2 text-sm"><Key className="h-4 w-4 text-amber-500" /><span>Explore the workspace now. Add an OpenRouter key when you’re ready to run models.</span></div><ApiKeyManager /></div>}
    <main className="flex-1 min-h-0">
      {(stage === 'configure' || stage === 'create') ? <div className={`grid h-full min-h-0 gap-3 ${configOpen ? 'xl:grid-cols-[minmax(280px,360px)_1fr]' : 'grid-cols-1'}`}>
        <Collapsible open={configOpen} onOpenChange={setConfigOpen} className="min-h-0"><div className="mb-2 flex items-center"><CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Settings2 className="h-4 w-4" />Configuration {configOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></CollapsibleTrigger></div><CollapsibleContent className="h-[calc(100%-42px)]"><ScrollArea className="h-full"><div className="space-y-3 pr-2"><CodeArenaHeader /><div className={!apiKey ? 'pointer-events-none opacity-55' : ''} aria-disabled={!apiKey}><ModelSelector useCodeArenaStore /></div><ExecutionSafetyPanel /><CodeArenaJudgeSelector /><Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}><CollapsibleTrigger asChild><Button variant="outline" className="w-full justify-between">Advanced {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></CollapsibleTrigger><CollapsibleContent className="pt-2"><CodeArenaParameters /></CollapsibleContent></Collapsible></div></ScrollArea></CollapsibleContent></Collapsible>
        <section className="min-h-0"><CodeArenaGrid /></section>
      </div> : <CodeArenaReview mode={stage} />}
    </main>
  </div>
}
