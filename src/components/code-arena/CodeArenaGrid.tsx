import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Code, Eye, Monitor, Smartphone, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeArenaModelPanel } from './CodeArenaModelPanel'
import { useCodeArenaStore } from '@/stores/codeArenaStore'

const PAGE_SIZE = 4

export function CodeArenaGrid() {
  const { selectedModelIds, outputs, viewMode, viewport, revealModels, setViewMode, setViewport } = useCodeArenaStore()
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(selectedModelIds.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const visible = useMemo(() => selectedModelIds.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE), [safePage, selectedModelIds])

  if (selectedModelIds.length === 0) return <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-muted/20 text-muted-foreground">Select models to compare</div>

  return <div className="flex h-full min-h-0 flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2 shrink-0" aria-label="Synchronized result controls">
      <div className="flex items-center gap-1"><Toggle active={viewMode === 'preview'} onClick={() => setViewMode('preview')} icon={Eye} label="Preview" /><Toggle active={viewMode === 'code'} onClick={() => setViewMode('code')} icon={Code} label="Code" /><Toggle active={viewMode === 'console'} onClick={() => setViewMode('console')} icon={Terminal} label="Console" /></div>
      <div className="flex items-center gap-1"><Toggle active={viewport === 'desktop'} onClick={() => setViewport('desktop')} icon={Monitor} label="Desktop" /><Toggle active={viewport === 'mobile'} onClick={() => setViewport('mobile')} icon={Smartphone} label="Mobile" />{pageCount > 1 && <><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((v) => Math.max(0, v - 1))} disabled={safePage === 0} aria-label="Previous results"><ChevronLeft className="h-4 w-4" /></Button><span className="px-1 text-xs text-muted-foreground">{safePage + 1}/{pageCount}</span><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((v) => Math.min(pageCount - 1, v + 1))} disabled={safePage >= pageCount - 1} aria-label="Next results"><ChevronRight className="h-4 w-4" /></Button></>}</div>
    </div>
    <div className={`grid flex-1 min-h-0 gap-3 overflow-auto ${visible.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>{visible.map((modelId) => <CodeArenaModelPanel key={modelId} modelId={modelId} anonymousLabel={`Model ${selectedModelIds.indexOf(modelId) + 1}`} revealModel={revealModels} output={outputs.get(modelId)} viewMode={viewMode} viewport={viewport} />)}</div>
  </div>
}

function Toggle({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Eye; label: string }) {
  return <Button variant={active ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5" onClick={onClick} aria-pressed={active}><Icon className="h-3.5 w-3.5" />{label}</Button>
}
