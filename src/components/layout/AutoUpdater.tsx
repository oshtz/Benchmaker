import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/use-toast'
import { checkForUpdate, downloadUpdate, installUpdate, type UpdateInfo } from '@/services/updater'

export function AutoUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updatePath, setUpdatePath] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let active = true

    const runUpdateCheck = async () => {
      try {
        const info = await checkForUpdate()
        if (!active || !info) return

        setUpdateInfo(info)
        toast({
          title: 'Update available',
          description: `Version ${info.version} is available. Downloading now...`,
        })

        const path = await downloadUpdate(info)
        if (!active) return

        setUpdatePath(path)
        setDialogOpen(true)
      } catch (error) {
        if (active) {
          console.warn('Auto-update check failed:', error)
        }
      }
    }

    void runUpdateCheck()

    return () => {
      active = false
    }
  }, [])

  const handleInstall = async () => {
    if (!updatePath) return

    toast({
      title: 'Installing update',
      description: 'Benchmaker will restart to finish installing.',
    })

    try {
      await installUpdate(updatePath)
    } catch (error) {
      console.error('Update install failed:', error)
      toast({
        title: 'Update failed',
        description: 'Could not install the update. Please try again later.',
        variant: 'destructive',
      })
    }
  }

  if (!updateInfo) {
    return null
  }

  return (
    <ConfirmDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      title={`Update ready (${updateInfo.version})`}
      description="Benchmaker has downloaded the latest version. Restart now to finish installing."
      confirmLabel="Restart now"
      cancelLabel="Later"
      onConfirm={handleInstall}
    />
  )
}
