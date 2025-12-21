import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModelStore } from '@/stores/modelStore'

export function ParameterPanel() {
  const { parameters, setParameters, resetParameters } = useModelStore()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Parameters</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Applied to all models</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={resetParameters} className="shrink-0">
            <RotateCcw className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Temperature</Label>
            <span className="text-sm text-muted-foreground">
              {parameters.temperature.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[parameters.temperature]}
            onValueChange={([v]) => setParameters({ temperature: v })}
            min={0}
            max={2}
            step={0.01}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Top P</Label>
            <span className="text-sm text-muted-foreground">
              {parameters.topP.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[parameters.topP]}
            onValueChange={([v]) => setParameters({ topP: v })}
            min={0}
            max={1}
            step={0.01}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-tokens">Max Tokens</Label>
          <Input
            id="max-tokens"
            type="number"
            min={1}
            max={128000}
            value={parameters.maxTokens}
            onChange={(e) =>
              setParameters({ maxTokens: parseInt(e.target.value) || 2048 })
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Frequency Penalty</Label>
            <span className="text-sm text-muted-foreground">
              {parameters.frequencyPenalty.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[parameters.frequencyPenalty]}
            onValueChange={([v]) => setParameters({ frequencyPenalty: v })}
            min={-2}
            max={2}
            step={0.01}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Presence Penalty</Label>
            <span className="text-sm text-muted-foreground">
              {parameters.presencePenalty.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[parameters.presencePenalty]}
            onValueChange={([v]) => setParameters({ presencePenalty: v })}
            min={-2}
            max={2}
            step={0.01}
          />
        </div>
      </CardContent>
    </Card>
  )
}
