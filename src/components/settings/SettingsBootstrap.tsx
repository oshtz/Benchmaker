import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { loadStoredApiKey } from '@/services/secureApiKey'
import { useToast } from '@/components/ui/use-toast'

export function SettingsBootstrap() {
  const { theme, setApiKey } = useSettingsStore()
  const { toast } = useToast()

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolvedTheme = theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme
      root.classList.remove('light', 'dark')
      root.classList.add(resolvedTheme)
    }

    applyTheme()
    if (theme !== 'system') return

    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [theme])

  useEffect(() => {
    let active = true

    void loadStoredApiKey()
      .then((storedKey) => {
        if (!active || !storedKey || useSettingsStore.getState().apiKey) return
        setApiKey(storedKey)
      })
      .catch((error) => {
        toast({
          title: 'API Key Unavailable',
          description: error instanceof Error ? error.message : 'Failed to read the API key from the OS credential store',
          variant: 'destructive',
        })
      })

    return () => {
      active = false
    }
  }, [setApiKey, toast])

  return null
}
