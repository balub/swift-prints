// apps/frontend-kiosk/src/pages/PcbStandoff.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { STLViewer } from '@/components/STLViewer'
import { usePcbStandoffGenerator, PcbStandoffParams, HolePosition } from '@/hooks/usePcbStandoffGenerator'
import { analyzeUpload } from '@/services/uploads.service'
import { Plus, Trash2 } from 'lucide-react'

const DEFAULTS: Omit<PcbStandoffParams, 'holes'> = {
  pcbLength: 100,
  pcbWidth: 80,
  plateThickness: 2,
  standoffHeight: 8,
  standoffOD: 6,
  screwHoleDia: 3,
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// 2D top-down preview of PCB with standoff positions
function PcbPreview({ params }: { params: PcbStandoffParams }) {
  const { pcbLength: L, pcbWidth: W, standoffOD: od, screwHoleDia: sd, holes } = params
  const pad = 20
  const viewW = L + pad * 2
  const viewH = W + pad * 2

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Top-down preview — origin (0, 0) is top-left corner</p>
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full border rounded-xl bg-neutral-50"
        style={{ aspectRatio: `${viewW} / ${viewH}`, maxHeight: '220px' }}
      >
        {/* PCB outline */}
        <rect x={pad} y={pad} width={L} height={W} fill="#e8f5e9" stroke="#4caf50" strokeWidth={0.6} rx={1} />

        {/* Dimension labels */}
        <text x={pad + L / 2} y={pad - 6} textAnchor="middle" fontSize={6} fill="#666">{L} mm</text>
        <text
          x={pad - 6}
          y={pad + W / 2}
          textAnchor="middle"
          fontSize={6}
          fill="#666"
          transform={`rotate(-90, ${pad - 6}, ${pad + W / 2})`}
        >
          {W} mm
        </text>

        {/* Standoff circles */}
        {holes.map((hole, i) => {
          const cx = pad + hole.x
          const cy = pad + hole.y
          const inBounds = hole.x >= 0 && hole.x <= L && hole.y >= 0 && hole.y <= W
          return (
            <g key={i}>
              <circle
                cx={cx} cy={cy} r={od / 2}
                fill={inBounds ? '#1976d2' : '#e53935'}
                fillOpacity={0.25}
                stroke={inBounds ? '#1976d2' : '#e53935'}
                strokeWidth={0.6}
              />
              <circle cx={cx} cy={cy} r={sd / 2} fill="white" stroke={inBounds ? '#1976d2' : '#e53935'} strokeWidth={0.4} />
              <text cx={cx} cy={cy - od / 2 - 2} textAnchor="middle" fontSize={4} fill="#555">{i + 1}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function PcbStandoff() {
  const navigate = useNavigate()
  const { generate, result, isLoading, error } = usePcbStandoffGenerator()
  const [params, setParams] = useState(DEFAULTS)
  const [holes, setHoles] = useState<HolePosition[]>([])
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fullParams: PcbStandoffParams = { ...params, holes }
  const debouncedParams = useDebounce(fullParams, 400)

  useEffect(() => {
    generate(debouncedParams)
  }, [debouncedParams, generate])

  useEffect(() => {
    if (!result) return
    const file = new File([result.buffer], 'pcb-standoff-plate.stl', { type: 'application/octet-stream' })
    setPreviewFile(file)
  }, [result])

  const set = (key: keyof typeof DEFAULTS) => (value: number) =>
    setParams(prev => ({ ...prev, [key]: value }))

  const addHole = () => setHoles(prev => [...prev, { x: 0, y: 0 }])
  const removeHole = (i: number) => setHoles(prev => prev.filter((_, idx) => idx !== i))
  const updateHole = (i: number, key: 'x' | 'y', raw: string) => {
    const value = parseFloat(raw)
    if (isNaN(value)) return
    setHoles(prev => prev.map((h, idx) => idx === i ? { ...h, [key]: value } : h))
  }

  const handlePrint = async () => {
    if (!result || isLoading) return
    setIsPrinting(true)
    setUploadError(null)
    try {
      const file = new File([result.buffer], 'pcb-standoff-plate.stl', { type: 'application/octet-stream' })
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
        <h1 className="text-3xl font-bold font-jura mb-2">PCB Standoff Plate</h1>
        <p className="text-muted-foreground mb-6">Generate a mounting plate with standoffs at exact hole positions.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: parameters + hole table */}
          <div className="space-y-6">
            <ParamSlider label="PCB Length" unit="mm" value={params.pcbLength} min={20} max={400} step={1} onChange={set('pcbLength')} />
            <ParamSlider label="PCB Width" unit="mm" value={params.pcbWidth} min={20} max={400} step={1} onChange={set('pcbWidth')} />
            <ParamSlider label="Plate thickness" unit="mm" value={params.plateThickness} min={1} max={5} step={0.5} onChange={set('plateThickness')} />
            <ParamSlider label="Standoff height" unit="mm" value={params.standoffHeight} min={2} max={30} step={0.5} onChange={set('standoffHeight')} />
            <ParamSlider label="Standoff outer diameter" unit="mm" value={params.standoffOD} min={4} max={12} step={0.5} onChange={set('standoffOD')} />
            <ParamSlider label="Screw hole diameter" unit="mm" value={params.screwHoleDia} min={1} max={params.standoffOD - 1} step={0.5} onChange={set('screwHoleDia')} />

            {/* Hole positions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Standoff positions</Label>
                <Button size="sm" variant="outline" onClick={addHole}>
                  <Plus className="w-4 h-4 mr-1" /> Add hole
                </Button>
              </div>

              {holes.length === 0 && (
                <p className="text-xs text-muted-foreground">No holes added — plate will be generated without standoffs.</p>
              )}

              <div className="space-y-2">
                {holes.map((hole, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs text-muted-foreground w-4">X</span>
                      <Input
                        type="number"
                        min={0}
                        max={params.pcbLength}
                        step={0.5}
                        defaultValue={hole.x}
                        onChange={e => updateHole(i, 'x', e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs text-muted-foreground w-4">Y</span>
                      <Input
                        type="number"
                        min={0}
                        max={params.pcbWidth}
                        step={0.5}
                        defaultValue={hole.y}
                        onChange={e => updateHole(i, 'y', e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeHole(i)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handlePrint}
              disabled={!result || isPrinting || isLoading}
              className="w-full mt-4"
            >
              {isPrinting ? 'Uploading…' : 'Print Standoff Plate'}
            </Button>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
          </div>

          {/* Right: 2D preview + 3D viewer */}
          <div className="space-y-4">
            <PcbPreview params={fullParams} />

            <div className="h-[350px] rounded-xl overflow-hidden border relative">
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
