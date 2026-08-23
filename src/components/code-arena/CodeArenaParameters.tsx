import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useCodeArenaStore } from '@/stores/codeArenaStore'

export function CodeArenaParameters() {
  const { parameters, setParameters } = useCodeArenaStore()
  const number = (key: keyof typeof parameters, value: string) => {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) setParameters({ [key]: parsed })
  }

  return (
    <div className="surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="benchmark-mode">Reproducible benchmark</Label>
          <p className="text-xs text-muted-foreground">Pins temperature to zero for repeatable comparisons.</p>
        </div>
        <Switch id="benchmark-mode" checked={parameters.benchmarkMode ?? false} onCheckedChange={(checked) => setParameters({ benchmarkMode: checked, ...(checked ? { temperature: 0 } : {}) })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="arena-temperature" label="Temperature" value={parameters.benchmarkMode ? 0 : parameters.temperature} disabled={parameters.benchmarkMode} onChange={(v) => number('temperature', v)} />
        <Field id="arena-top-p" label="Top P" value={parameters.topP} onChange={(v) => number('topP', v)} />
        <Field id="arena-max-tokens" label="Max tokens" value={parameters.maxTokens} onChange={(v) => number('maxTokens', v)} />
        <Field id="arena-frequency" label="Frequency penalty" value={parameters.frequencyPenalty} onChange={(v) => number('frequencyPenalty', v)} />
        <Field id="arena-presence" label="Presence penalty" value={parameters.presencePenalty} onChange={(v) => number('presencePenalty', v)} />
      </div>
    </div>
  )
}

function Field({ id, label, value, disabled, onChange }: { id: string; label: string; value: number; disabled?: boolean; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} type="number" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="h-8" /></div>
}
