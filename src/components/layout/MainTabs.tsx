import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Database, FileText, Play, LineChart, Code2 } from 'lucide-react'
import { PromptManager } from '@/components/prompt-manager/PromptManager'
import { Arena } from '@/components/arena/Arena'
import { CodeArena } from '@/components/code-arena/CodeArena'
import { Results } from '@/components/results/Results'
import { Analytics } from '@/components/analytics/Analytics'
import { DataManager } from '@/components/data/DataManager'
import appWhite from '/app-white.png'
import appBlack from '/app-black.png'
import logoBlack from '/logo-black.png'

const tabs = [
  { value: 'prompts', label: 'Prompts', Icon: FileText },
  { value: 'arena', label: 'Arena', Icon: Play },
  { value: 'code-arena', label: 'Code Arena', Icon: Code2 },
  { value: 'results', label: 'Results', Icon: BarChart },
  { value: 'analytics', label: 'Analytics', Icon: LineChart },
  { value: 'data', label: 'Data', Icon: Database },
]

export function MainNavigationRail() {
  const primaryTabs = tabs.slice(0, 4)
  const utilityTabs = tabs.slice(4)

  return (
    <aside className="relative z-20 flex h-full w-[68px] shrink-0 flex-col overflow-hidden border-r border-border/50 bg-background/75 backdrop-blur-2xl transition-[width] duration-300 min-[1180px]:w-56">
      <div className="absolute inset-y-0 right-0 z-20 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />
      <div className="relative z-10 flex h-16 shrink-0 items-center justify-center border-b border-border/40 px-3 min-[1180px]:justify-start min-[1180px]:gap-3 min-[1180px]:px-4">
        <img src={appWhite} alt="" className="hidden h-9 w-auto shrink-0 rounded-[9px] shadow-sm dark:block" />
        <img src={appBlack} alt="" className="block h-9 w-auto shrink-0 rounded-[9px] shadow-sm dark:hidden" />
        <img src={logoBlack} alt="Benchmaker" className="hidden h-8 w-auto shrink-0 logo-adaptive min-[1180px]:block" />
      </div>
      <TabsList aria-label="Primary navigation" className="relative z-10 flex min-h-0 flex-1 flex-col items-stretch justify-start gap-1 rounded-none bg-transparent px-2 py-3 shadow-none">
        {primaryTabs.map((tab) => <RailItem key={tab.value} {...tab} />)}
        <div className="my-3 h-px bg-border/50" />
        <span className="hidden px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 min-[1180px]:block">Insights</span>
        {utilityTabs.map((tab) => <RailItem key={tab.value} {...tab} />)}
      </TabsList>
      <div className="relative z-10 hidden border-t border-border/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground min-[1180px]:block">Local workspace</div>
    </aside>
  )
}

function RailItem({ value, label, Icon }: (typeof tabs)[number]) {
  return (
    <TabsTrigger
      value={value}
      aria-label={label}
      title={label}
      className="group relative flex h-11 w-full shrink-0 justify-center overflow-hidden rounded-lg px-0 text-muted-foreground shadow-none transition-colors after:absolute after:inset-y-2 after:left-0 after:w-[3px] after:rounded-r-full after:bg-primary after:opacity-0 after:shadow-[0_0_12px_hsl(var(--primary))] hover:bg-muted/60 hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:opacity-100 min-[1180px]:justify-start min-[1180px]:gap-3 min-[1180px]:px-3"
    >
      <Icon className="h-[18px] w-[18px] shrink-0 transition-colors group-data-[state=active]:text-primary" />
      <span className="hidden truncate text-sm font-semibold min-[1180px]:block">{label}</span>
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
    </>
  )
}
