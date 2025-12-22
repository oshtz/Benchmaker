import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { BarChart3, Database, FileText, Play, PieChart } from 'lucide-react'
import { PromptManager } from '@/components/prompt-manager/PromptManager'
import { Arena } from '@/components/arena/Arena'
import { Results } from '@/components/results/Results'
import { Analytics } from '@/components/analytics/Analytics'
import { DataManager } from '@/components/data/DataManager'

const tabs = [
  { value: 'prompts', label: 'Prompts', Icon: FileText },
  { value: 'arena', label: 'Arena', Icon: Play },
  { value: 'results', label: 'Results', Icon: BarChart3 },
  { value: 'analytics', label: 'Analytics', Icon: PieChart },
  { value: 'data', label: 'Data', Icon: Database },
]

export function MainTabsList({ className }: { className?: string }) {
  return (
    <TabsList className={cn("grid w-full max-w-2xl grid-cols-5 bg-muted/60", className)}>
      {tabs.map(({ value, label, Icon }) => (
        <TabsTrigger key={value} value={value} className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

export function MainTabs() {
  return (
    <>
      <TabsContent value="prompts" className="mt-0 pt-6 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <PromptManager />
        </div>
      </TabsContent>

      <TabsContent value="arena" className="mt-0 pt-6 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <Arena />
        </div>
      </TabsContent>

      <TabsContent value="results" className="mt-0 pt-6 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <Results />
        </div>
      </TabsContent>

      <TabsContent value="analytics" className="mt-0 pt-6 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <Analytics />
        </div>
      </TabsContent>

      <TabsContent value="data" className="mt-0 pt-6 flex-1 min-h-0 animate-fade-up">
        <div className="w-full h-full min-h-0">
          <DataManager />
        </div>
      </TabsContent>
    </>
  )
}
