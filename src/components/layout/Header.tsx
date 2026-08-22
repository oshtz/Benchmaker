import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { BenchmarkProgress } from '@/components/layout/BenchmarkProgress'
import { Badge } from '@/components/ui/badge'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import { UpdateStatus } from '@/components/layout/UpdateStatus'

const pageLabels: Record<string, string> = {
  prompts: 'Prompt Library',
  arena: 'Benchmark Arena',
  'code-arena': 'Code Arena',
  results: 'Results',
  analytics: 'Analytics',
  data: 'Local Data',
}

export function Header({ activeTab }: { activeTab: string }) {
  const { testSuites, activeTestSuiteId } = useTestSuiteStore()
  const activeSuite = testSuites.find((suite) => suite.id === activeTestSuiteId)

  return (
    <header className="relative z-50 isolate shrink-0 overflow-hidden border-b border-border/40 bg-background/60 backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 z-20 h-[2px] bg-brand-gradient" />
      <div className="relative z-10 flex h-14 min-w-0 items-center gap-3 px-3 sm:h-16 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
            <h1 className="truncate text-sm font-bold sm:text-base">{pageLabels[activeTab] ?? 'Benchmaker'}</h1>
          </div>
          {activeSuite && (
            <Badge variant="outline" className="hidden max-w-48 truncate whitespace-nowrap bg-background/50 text-[10px] backdrop-blur-md sm:inline-flex">
              {activeSuite.name}
            </Badge>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-4">
          <div className="hidden md:block">
            <BenchmarkProgress />
          </div>
          <UpdateStatus />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <ApiKeyManager />
          </div>
        </div>
      </div>
    </header>
  )
}
