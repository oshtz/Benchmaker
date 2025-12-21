import { useState, useMemo } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { useModelStore } from '@/stores/modelStore'

export function ModelSelector() {
  const {
    availableModels,
    selectedModelIds,
    toggleModelSelection,
    clearSelectedModels,
    isLoadingModels,
    modelsError,
  } = useModelStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState<string | null>(null)
  const searchTerm = searchQuery.trim().toLowerCase()

  // Extract unique providers
  const providers = useMemo(() => {
    const providerSet = new Set<string>()
    availableModels.forEach((model) => {
      const matchesSearch =
        !searchTerm ||
        model.id.toLowerCase().includes(searchTerm) ||
        model.name.toLowerCase().includes(searchTerm)
      if (!matchesSearch) return

      const provider = model.id.split('/')[0]
      if (provider) providerSet.add(provider)
    })
    return Array.from(providerSet).sort()
  }, [availableModels, searchTerm])

  // Filter models
  const filteredModels = useMemo(() => {
    return availableModels.filter((model) => {
      const matchesSearch =
        !searchTerm ||
        model.id.toLowerCase().includes(searchTerm) ||
        model.name.toLowerCase().includes(searchTerm)

      const matchesProvider =
        !providerFilter || model.id.startsWith(`${providerFilter}/`)

      return matchesSearch && matchesProvider
    })
  }, [availableModels, searchTerm, providerFilter])

  const providersForTags = useMemo(() => {
    if (providerFilter && !providers.includes(providerFilter)) {
      return [providerFilter, ...providers]
    }
    return providers
  }, [providers, providerFilter])

  const handleProviderWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget
    if (container.scrollWidth <= container.clientWidth) return
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      container.scrollLeft += event.deltaY
      event.preventDefault()
    }
  }

  const formatPrice = (price: string) => {
    const num = parseFloat(price)
    if (num === 0) return 'Free'
    return `$${(num * 1000000).toFixed(2)}/M`
  }

  if (isLoadingModels) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading models...</span>
        </CardContent>
      </Card>
    )
  }

  if (modelsError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">{modelsError}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full min-h-0 flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Model Selection</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {selectedModelIds.length} model{selectedModelIds.length !== 1 ? 's' : ''}{' '}
              queued
            </CardDescription>
          </div>
          {selectedModelIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelectedModels} className="shrink-0">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 overflow-hidden p-0 px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hidden"
          onWheel={handleProviderWheel}
        >
          <Badge
            variant={providerFilter === null ? 'default' : 'outline'}
            className="cursor-pointer shrink-0"
            onClick={() => setProviderFilter(null)}
          >
            All
          </Badge>
          {providersForTags.map((provider) => (
            <Badge
              key={provider}
              variant={providerFilter === provider ? 'default' : 'outline'}
              className="cursor-pointer shrink-0"
              onClick={() =>
                setProviderFilter(providerFilter === provider ? null : provider)
              }
            >
              {provider}
            </Badge>
          ))}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 pb-4">
            {filteredModels.map((model) => {
              const isSelected = selectedModelIds.includes(model.id)
              return (
                <div
                  key={model.id}
                  className={`flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'hover:bg-muted/70 hover:border-border'
                  }`}
                  onClick={() => toggleModelSelection(model.id)}
                >
                  <Checkbox checked={isSelected} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{model.name}</div>
                      {isSelected && (
                        <Badge variant="outline" className="text-[10px]">
                          selected
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {model.id}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">
                      {model.context_length.toLocaleString()} ctx
                    </div>
                    <div className="text-xs font-medium">
                      {formatPrice(model.pricing.prompt)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
