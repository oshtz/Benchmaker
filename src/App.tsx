import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Tabs } from '@/components/ui/tabs'
import { TitleBar } from '@/components/layout/TitleBar'
import { AutoUpdater } from '@/components/layout/AutoUpdater'
import { Header } from '@/components/layout/Header'
import { MainNavigationRail, MainTabs } from '@/components/layout/MainTabs'
import { initLocalDb } from '@/services/localDb'
import { DitherGradient } from '@/components/dither-kit/gradient'
import { SettingsBootstrap } from '@/components/settings/SettingsBootstrap'

function App() {
  const [activeTab, setActiveTab] = useState('prompts')

  useEffect(() => {
    void initLocalDb()
  }, [])

  return (
    <div className="h-screen flex flex-col relative z-10 overflow-hidden">
      <TitleBar />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <DitherGradient from="grey" direction="down" opacity={0.1} />
        <DitherGradient from="green" direction="left" opacity={0.035} />
      </div>
      <div className="absolute inset-0 subtle-grid opacity-40 pointer-events-none" />
      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex h-full min-h-0">
          <MainNavigationRail />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header activeTab={activeTab} />
            <main className="flex w-full flex-1 min-h-0 flex-col p-2 sm:p-4">
              <MainTabs />
            </main>
          </div>
        </Tabs>
      </div>
      <AutoUpdater />
      <SettingsBootstrap />
      <Toaster />
    </div>
  )
}

export default App
