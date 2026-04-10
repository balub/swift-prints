// apps/frontend-kiosk/src/pages/BoxBuilder.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { STLViewer } from '@/components/STLViewer'
import { useBoxGenerator, BoxParams } from '@/hooks/useBoxGenerator'
import { analyzeUpload } from '@/services/uploads.service'

const DEFAULTS: BoxParams = {
  length: 80,
  width: 60,
  height: 40,
  lipHeight: 8,
  cornerRadius: 3,
  clearance: 0.4,
  wallThickness: 2,
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function BoxBuilder() {
  const navigate = useNavigate()
  const { generate, result, isLoading, error } = useBoxGenerator()
  const [params, setParams] = useState<BoxParams>(DEFAULTS)
  const [activePart, setActivePart] = useState<'body' | 'lid'>('body')
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const debouncedParams = useDebounce(params, 400)

  // Regenerate on param change
  useEffect(() => {
    generate(debouncedParams)
  }, [debouncedParams, generate])

  // Update preview when result or active part changes
  useEffect(() => {
    if (!result) return
    const buffer = activePart === 'body' ? result.bodyBuffer : result.lidBuffer
    const file = new File([buffer], `box-${activePart}.stl`, { type: 'application/octet-stream' })
    setPreviewFile(file)
  }, [result, activePart])

  const set = (key: keyof BoxParams) => (value: number) =>
    setParams(prev => ({ ...prev, [key]: value }))

  const handlePrint = async (part: 'body' | 'lid' | 'both') => {
    if (!result || isLoading) return
    setIsPrinting(true)
    setUploadError(null)
    try {
      const buffer =
        part === 'body' ? result.bodyBuffer :
        part === 'lid'  ? result.lidBuffer  :
                          result.combinedBuffer
      const file = new File([buffer], `box-${part}.stl`, { type: 'application/octet-stream' })
      const upload = await analyzeUpload(file)
      setIsPrinting(false)
      navigate('/order', { state: { upload, file } })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setIsPrinting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Box Builder</h1>
        <p className="text-muted-foreground mb-6">Configure a snap-fit box and send it to print.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Parameters */}
          <div className="space-y-6">
            <ParamSlider label="Length (interior)" unit="mm" value={params.length} min={20} max={300} step={1} onChange={set('length')} />
            <ParamSlider label="Width (interior)" unit="mm" value={params.width} min={20} max={300} step={1} onChange={set('width')} />
            <ParamSlider label="Height" unit="mm" value={params.height} min={10} max={200} step={1} onChange={set('height')} />
            <ParamSlider label="Lid lip height" unit="mm" value={params.lipHeight} min={3} max={20} step={0.5} onChange={set('lipHeight')} />
            <ParamSlider label="Corner radius" unit="mm" value={params.cornerRadius} min={0.1} max={15} step={0.5} onChange={set('cornerRadius')} />

            <div className="space-y-2">
              <Label>Fit clearance (mm)</Label>
              <Input
                type="number"
                min={0.1}
                max={1.0}
                step={0.05}
                value={params.clearance}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) set('clearance')(v)
                }}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Gap between lid lip and box interior. 0.4mm = snug friction fit.</p>
            </div>

            {/* Print buttons */}
            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={() => handlePrint('both')}
                disabled={!result || isPrinting || isLoading}
                className="w-full"
              >
                {isPrinting ? 'Uploading…' : 'Print Box + Lid'}
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePrint('body')}
                  disabled={!result || isPrinting || isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  Body only
                </Button>
                <Button
                  onClick={() => handlePrint('lid')}
                  disabled={!result || isPrinting || isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  Lid only
                </Button>
              </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activePart === 'body' ? 'default' : 'outline'}
                onClick={() => setActivePart('body')}
              >
                Body
              </Button>
              <Button
                size="sm"
                variant={activePart === 'lid' ? 'default' : 'outline'}
                onClick={() => setActivePart('lid')}
              >
                Lid
              </Button>
            </div>
            <div className="h-[500px] rounded-xl overflow-hidden border relative">
              {previewFile && (
                <STLViewer file={previewFile} className="h-full w-full" />
              )}
              {(isLoading || !previewFile) && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-muted-foreground">
                  Generating…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ParamSliderProps {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

function ParamSlider({ label, unit, value, min, max, step, onChange }: ParamSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-mono">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
        />
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) onChange(v)
          }}
          className="w-20"
        />
      </div>
    </div>
  )
}
