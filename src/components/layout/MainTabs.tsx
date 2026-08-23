import { useEffect, useState } from 'react'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { BarChart, Database, FileText, Play, LineChart, Code2, PanelLeftClose, PanelLeftOpen, Settings2 } from 'lucide-react'
import { PromptManager } from '@/components/prompt-manager/PromptManager'
import { Arena } from '@/components/arena/Arena'
import { CodeArena } from '@/components/code-arena/CodeArena'
import { Results } from '@/components/results/Results'
import { Analytics } from '@/components/analytics/Analytics'
import { DataManager } from '@/components/data/DataManager'
import { Settings } from '@/components/settings/Settings'
import appWhite from '/app-white.png'
import appBlack from '/app-black.png'
import logoBlack from '/logo-black.png'
import { DitherGradient } from '@/components/dither-kit/gradient'

const SIDEBAR_COLLAPSED_KEY = 'benchmaker-sidebar-collapsed'

const tabs = [
  { value: 'prompts', label: 'Prompts', Icon: FileText },
  { value: 'arena', label: 'Arena', Icon: Play },
  { value: 'code-arena', label: 'Code Arena', Icon: Code2 },
  { value: 'results', label: 'Results', Icon: BarChart },
  { value: 'analytics', label: 'Analytics', Icon: LineChart },
  { value: 'data', label: 'Data', Icon: Database },
  { value: 'settings', label: 'Settings', Icon: Settings2 },
]

export function MainNavigationRail() {
  const primaryTabs = tabs.slice(0, 4)
  const utilityTabs = tabs.slice(4, 6)
  const settingsTab = tabs[6]
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true')

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  return (
    <aside className={`relative z-20 flex h-full w-[68px] shrink-0 flex-col overflow-hidden border-r border-border/50 bg-background/75 backdrop-blur-2xl transition-[width] duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${collapsed ? '' : 'min-[1180px]:w-56'}`}>
      <DitherGradient from="blue" to="purple" direction="down" opacity={0.08} className="z-0" />
      <div className="absolute inset-y-0 right-0 z-20 w-px overflow-hidden">
        <DitherGradient from="blue" direction="down" opacity={0.45} />
      </div>
      <div className={`relative z-10 flex h-16 shrink-0 items-center justify-center border-b border-border/40 px-3 ${collapsed ? '' : 'min-[1180px]:justify-start min-[1180px]:gap-3 min-[1180px]:px-4'}`}>
        <img src={appWhite} alt="" className="hidden h-9 w-auto shrink-0 rounded-[9px] shadow-sm dark:block" />
        <img src={appBlack} alt="" className="block h-9 w-auto shrink-0 rounded-[9px] shadow-sm dark:hidden" />
        <img src={logoBlack} alt="Benchmaker" className={`hidden h-8 w-auto shrink-0 logo-adaptive ${collapsed ? '' : 'min-[1180px]:block'}`} />
      </div>
      <TabsList aria-label="Primary navigation" className="relative z-10 flex min-h-0 flex-1 flex-col items-stretch justify-start gap-1 rounded-none bg-transparent px-2 py-3 shadow-none">
        {primaryTabs.map((tab) => <RailItem key={tab.value} {...tab} collapsed={collapsed} />)}
        <div className="my-3 h-px bg-border/50" />
        <span className={`${collapsed ? 'hidden' : 'hidden min-[1180px]:block'} px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70`}>Workspace</span>
        {utilityTabs.map((tab) => <RailItem key={tab.value} {...tab} collapsed={collapsed} />)}
        <div className="mt-auto w-full border-t border-border/50 pt-3">
          <RailItem {...settingsTab} collapsed={collapsed} />
        </div>
      </TabsList>
      <div className="relative z-10 hidden shrink-0 flex-col gap-1 border-t border-border/40 p-2 min-[1180px]:flex">
        {!collapsed && <span className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Local workspace</span>}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`w-full ${collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-2'}`}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>Collapse sidebar</span>}
        </Button>
      </div>
    </aside>
  )
}

function RailItem({ value, label, Icon, collapsed }: (typeof tabs)[number] & { collapsed: boolean }) {
  return (
    <TabsTrigger
      value={value}
      aria-label={label}
      title={label}
      className={`group flex h-11 w-full shrink-0 justify-center rounded-lg px-0 text-muted-foreground shadow-none transition-colors hover:bg-muted/60 hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:shadow-none ${collapsed ? '' : 'min-[1180px]:justify-start min-[1180px]:gap-3 min-[1180px]:px-3'}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 transition-colors group-data-[state=active]:text-primary" />
      <span className={`${collapsed ? 'hidden' : 'hidden min-[1180px]:block'} truncate text-sm font-semibold`}>{label}</span>
    </TabsTrigger>
  )
}

export function MainTabs() {
  return (
    <>
      <TabsContent value="prompts" className="mt-0 pt-4 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <PromptManager />
        </div>
      </TabsContent>

      <TabsContent value="arena" className="mt-0 pt-4 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <Arena />
        </div>
      </TabsContent>

      <TabsContent value="code-arena" className="mt-0 pt-4 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <CodeArena />
        </div>
      </TabsContent>

      <TabsContent value="results" className="mt-0 pt-4 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <Results />
        </div>
      </TabsContent>

      <TabsContent value="analytics" className="mt-0 pt-4 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <Analytics />
        </div>
      </TabsContent>

      <TabsContent value="data" className="mt-0 pt-4 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <DataManager />
        </div>
      </TabsContent>

      <TabsContent value="settings" className="mt-0 pt-4 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <Settings />
        </div>
      </TabsContent>
    </>
  )
}
