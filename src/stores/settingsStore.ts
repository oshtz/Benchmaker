import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '@/types'

interface SettingsState extends Settings {
  setApiKey: (apiKey: string) => void
  setDefaultTemperature: (temperature: number) => void
  setDefaultTopP: (topP: number) => void
  setDefaultMaxTokens: (maxTokens: number) => void
  setTheme: (theme: Settings['theme']) => void
  clearApiKey: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      defaultTemperature: 0.7,
      defaultTopP: 1,
      defaultMaxTokens: 2048,
      theme: 'system',

      setApiKey: (apiKey) => set({ apiKey }),
      setDefaultTemperature: (defaultTemperature) => set({ defaultTemperature }),
      setDefaultTopP: (defaultTopP) => set({ defaultTopP }),
      setDefaultMaxTokens: (defaultMaxTokens) => set({ defaultMaxTokens }),
      setTheme: (theme) => set({ theme }),
      clearApiKey: () => set({ apiKey: '' }),
    }),
    {
      name: 'benchmaker-settings',
    }
  )
)
