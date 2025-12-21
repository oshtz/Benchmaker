import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Tabs } from '@/components/ui/tabs'
import { TitleBar } from '@/components/layout/TitleBar'
import { Header } from '@/components/layout/Header'
import { MainTabs } from '@/components/layout/MainTabs'
import { initLocalDb } from '@/services/localDb'

function App() {
  useEffect(() => {
    void initLocalDb()
  }, [])

  return (
    <div className="h-screen flex flex-col relative z-10 overflow-hidden">
      <TitleBar />
      <div className="absolute inset-0 subtle-grid opacity-40 pointer-events-none" />
      <div className="flex-1 min-h-0 overflow-hidden relative z-10">
        <Tabs defaultValue="prompts" className="h-full min-h-0 flex flex-col">
          <Header />
          <main className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 flex-1 min-h-0 flex flex-col">
            <MainTabs />
          </main>
        </Tabs>
      </div>
      <Toaster />
    </div>
  )
}

export default App
