import { KeyRound, Palette, RefreshCw, Settings2 } from 'lucide-react'
import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { UpdateStatus } from '@/components/layout/UpdateStatus'
import { ParameterPanel } from '@/components/arena/ParameterPanel'
import { ExecutionSafetyPanel } from '@/components/arena/ExecutionSafetyPanel'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUpdateStore } from '@/stores/updateStore'

const updateLabels = {
  idle: 'Not checked',
  checking: 'Checking',
  'up-to-date': 'Up to date',
  available: 'Available',
  downloading: 'Downloading',
  ready: 'Ready to install',
  installing: 'Installing',
  disabled: 'Desktop only',
  error: 'Check failed',
} as const

export function Settings() {
  const { apiKey, theme } = useSettingsStore()
  const { currentVersion, status, lastCheckedAt } = useUpdateStore()
  const updateVariant = status === 'error' ? 'destructive' : status === 'available' || status === 'ready' ? 'default' : 'outline'

  return (
    <div className="h-full min-h-0 overflow-y-auto pb-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="surface flex shrink-0 items-center gap-3 p-4 sm:p-5">
          <Settings2 className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <h2 className="headline">Settings</h2>
            <p className="text-sm text-muted-foreground">Manage Benchmaker’s appearance, provider access, run defaults, and updates.</p>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Choose how Benchmaker looks on this device.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Color theme</p>
                <p className="mt-1 text-xs text-muted-foreground">Currently using {theme === 'system' ? 'your system preference' : `${theme} mode`}.</p>
              </div>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                OpenRouter
              </CardTitle>
              <CardDescription>Secure provider access for benchmark and Code Arena runs.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">API credential</p>
                  <Badge variant={apiKey ? 'success' : 'warning'}>{apiKey ? 'Connected' : 'Required'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Stored in the operating system credential vault.</p>
              </div>
              <ApiKeyManager />
            </CardContent>
          </Card>

          <ParameterPanel />
          <ExecutionSafetyPanel />

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Updates & version
              </CardTitle>
              <CardDescription>Check the desktop release channel and review the installed version.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Benchmaker {currentVersion ? `v${currentVersion}` : 'desktop app'}</p>
                  <Badge variant={updateVariant}>{updateLabels[status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lastCheckedAt ? `Last checked ${new Date(lastCheckedAt).toLocaleString()}` : 'No update check has completed yet.'}
                </p>
              </div>
              <UpdateStatus />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
