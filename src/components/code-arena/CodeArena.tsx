import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Code2, Key, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { usePanelRef } from 'react-resizable-panels'
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
  const [wideLayout, setWideLayout] = useState(() => window.matchMedia('(min-width: 1280px)').matches)
  const [configAnimating, setConfigAnimating] = useState(false)
  const configPanelRef = usePanelRef()
  const configAnimationFrameRef = useRef<number | null>(null)
  const configAnimationTimerRef = useRef<number | null>(null)
  const modelStore = useModelStore()

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const updateLayout = () => setWideLayout(media.matches)
    media.addEventListener('change', updateLayout)
    return () => media.removeEventListener('change', updateLayout)
  }, [])

  const handleConfigOpenChange = (open: boolean) => {
    if (configAnimationFrameRef.current !== null) cancelAnimationFrame(configAnimationFrameRef.current)
    if (configAnimationTimerRef.current !== null) window.clearTimeout(configAnimationTimerRef.current)

    setConfigOpen(open)
    setConfigAnimating(true)
    configAnimationFrameRef.current = requestAnimationFrame(() => {
      const panel = configPanelRef.current
      if (open) panel?.resize(wideLayout ? '29%' : '48%')
      else panel?.collapse()
      configAnimationTimerRef.current = window.setTimeout(() => {
        setConfigAnimating(false)
      }, 150)
    })
  }

  useEffect(() => () => {
    if (configAnimationFrameRef.current !== null) cancelAnimationFrame(configAnimationFrameRef.current)
    if (configAnimationTimerRef.current !== null) window.clearTimeout(configAnimationTimerRef.current)
  }, [])

  useEffect(() => {
    if (!apiKey) return
    const fresh = modelStore.lastFetchedAt && modelStore.lastFetchedAt > Date.now() - 300000 && modelStore.availableModels.length > 0
    if (fresh) return
    const fetchModels = async () => { modelStore.setIsLoadingModels(true); modelStore.setModelsError(null); try { modelStore.setAvailableModels(await getOpenRouterClient(apiKey).fetchModels()); modelStore.setLastFetchedAt(Date.now()) } catch (error) { modelStore.setModelsError(error instanceof Error ? error.message : 'Failed to fetch models') } finally { modelStore.setIsLoadingModels(false) } }
    void fetchModels()
  }, [apiKey])

  return <div className="flex h-full min-h-0 flex-col gap-3">
    <header className="surface shrink-0 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Code2 className="h-6 w-6 shrink-0 text-primary" /><div><h2 className="headline">Code Arena</h2><p className="text-sm text-muted-foreground">Create, freeze, evaluate, and export reproducible frontend comparisons.</p></div></div><div className="flex items-center gap-2">{(stage === 'configure' || stage === 'create') && <CodeArenaExecutionControls />}</div></div>
      <nav className="mt-4 grid grid-cols-4 gap-1" aria-label="Code Arena stages">{stages.map((item, index) => <Button key={item.id} variant={stage === item.id ? 'default' : 'ghost'} className="h-auto justify-start gap-2 px-2 py-2 text-xs sm:px-3 sm:text-sm" onClick={() => setStage(item.id)}><span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px]">{index + 1}</span>{item.label}</Button>)}</nav>
    </header>
    {!apiKey && <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"><div className="flex items-center gap-2 text-sm"><Key className="h-4 w-4 text-amber-500" /><span>Explore the workspace now. Add an OpenRouter key when you’re ready to run models.</span></div><ApiKeyManager /></div>}
    <main className="flex-1 min-h-0">
      {(stage === 'configure' || stage === 'create') ? <ResizablePanelGroup key={wideLayout ? 'wide' : 'narrow'} direction={wideLayout ? 'horizontal' : 'vertical'} className={`h-full min-h-0 ${configAnimating ? 'resizable-panel-motion' : ''}`}>
        <ResizablePanel
          id="code-arena-configuration"
          panelRef={configPanelRef}
          defaultSize={configOpen ? (wideLayout ? '29%' : '48%') : (wideLayout ? '46px' : '42px')}
          minSize={wideLayout ? '260px' : '180px'}
          maxSize={wideLayout ? '44%' : '65%'}
          collapsedSize={wideLayout ? '46px' : '42px'}
          collapsible
          className="min-h-0 min-w-0"
          onResize={({ inPixels }) => {
            if (inPixels <= 0) return
            const panel = configPanelRef.current
            const expanded = panel ? !panel.isCollapsed() : inPixels > 80
            if (expanded !== configOpen) setConfigOpen(expanded)
          }}
        >
          <Collapsible open={configOpen} onOpenChange={handleConfigOpenChange} className="h-full min-h-0">
            <div className="mb-2 flex items-center pr-2">
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={configOpen ? 'w-full justify-between gap-2' : 'h-9 w-full justify-center px-0'}
                  aria-label={configOpen ? 'Collapse configuration' : 'Expand configuration'}
                  title={configOpen ? 'Collapse configuration' : 'Expand configuration'}
                >
                  <span className="flex items-center gap-2"><Settings2 className="h-4 w-4 shrink-0" />{configOpen && 'Configuration'}</span>
                  {configOpen && (wideLayout ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="h-[calc(100%-42px)]"><ScrollArea className="h-full"><div className="space-y-3 pr-2"><CodeArenaHeader /><div className={!apiKey ? 'pointer-events-none opacity-55' : ''} aria-disabled={!apiKey}><ModelSelector useCodeArenaStore /></div><ExecutionSafetyPanel /><CodeArenaJudgeSelector /><Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}><CollapsibleTrigger asChild><Button variant="outline" className="w-full justify-between">Advanced {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></CollapsibleTrigger><CollapsibleContent className="pt-2"><CodeArenaParameters /></CollapsibleContent></Collapsible></div></ScrollArea></CollapsibleContent>
          </Collapsible>
        </ResizablePanel>
        <ResizableHandle withHandle aria-label="Resize configuration panel" className="mx-1 bg-border/50 transition-colors after:w-3 hover:bg-primary/60 aria-[orientation=horizontal]:mx-0 aria-[orientation=horizontal]:my-1 aria-[orientation=horizontal]:after:h-3" />
        <ResizablePanel id="code-arena-preview" defaultSize={wideLayout ? '71%' : '52%'} minSize={wideLayout ? '45%' : '220px'} className="min-h-0 min-w-0">
          <section className={`h-full min-h-0 ${wideLayout ? 'pl-2' : 'pt-2'}`}><CodeArenaGrid /></section>
        </ResizablePanel>
      </ResizablePanelGroup> : <CodeArenaReview mode={stage} />}
    </main>
  </div>
}
