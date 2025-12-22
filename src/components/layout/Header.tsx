import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { BenchmarkProgress } from '@/components/layout/BenchmarkProgress'
import { MainTabsList } from '@/components/layout/MainTabs'
import { Badge } from '@/components/ui/badge'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import logoBlack from '/logo-black.png'
import { UpdateStatus } from '@/components/layout/UpdateStatus'

export function Header() {
  const { testSuites, activeTestSuiteId } = useTestSuiteStore()
  const activeSuite = testSuites.find((suite) => suite.id === activeTestSuiteId)

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src={logoBlack}
            alt="Benchmaker"
            className="h-8 sm:h-10 w-auto logo-adaptive shrink-0"
          />
          {activeSuite && (
            <Badge variant="outline" className="text-[10px] normal-case hidden sm:inline-flex whitespace-nowrap">
              {activeSuite.name}
            </Badge>
          )}
        </div>

        <div className="flex-1 px-3 sm:px-4 min-w-0">
          <MainTabsList className="mx-auto max-w-md sm:max-w-lg" />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <BenchmarkProgress />
          <UpdateStatus />
          <ThemeToggle />
          <ApiKeyManager />
        </div>
      </div>
    </header>
  )
}
