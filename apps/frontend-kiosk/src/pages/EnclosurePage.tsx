import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { Box3DPreview } from "@/components/Box3DPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { ExportActions } from "@/components/ExportActions";
import { ENCLOSURE_DEFAULTS, generateEnclosure, type EnclosureHole, type EnclosureParams, type VentPlacement } from "@/blocks/enclosure/generator";
import { Plus, Trash2 } from "lucide-react";

const VENT_OPTIONS: { value: VentPlacement; label: string }[] = [
  { value: "lid", label: "On the lid" },
  { value: "sides", label: "On both sides" },
  { value: "none", label: "No vents" },
];

export default function EnclosurePage() {
  const [params, setParams] = useState<EnclosureParams>(ENCLOSURE_DEFAULTS);
  const design = useMemo(() => generateEnclosure(params), [params]);

  const set = <K extends keyof EnclosureParams>(key: K) => (value: EnclosureParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));
  const setPort = <K extends keyof EnclosureParams["frontPort"]>(key: K) => (value: EnclosureParams["frontPort"][K]) =>
    setParams((prev) => ({ ...prev, frontPort: { ...prev.frontPort, [key]: value } }));

  const addHole = () =>
    setParams((prev) => ({ ...prev, backHoles: [...prev.backHoles, { x: Math.round(prev.length / 2), z: Math.round(prev.height / 2), diameter: 6 }] }));
  const removeHole = (i: number) => setParams((prev) => ({ ...prev, backHoles: prev.backHoles.filter((_, idx) => idx !== i) }));
  const updateHole = (i: number, key: keyof EnclosureHole, raw: string) =>
    setParams((prev) => ({
      ...prev,
      backHoles: prev.backHoles.map((hole, idx) => {
        if (idx !== i) return hole;
        const value = parseFloat(raw);
        return isNaN(value) ? hole : { ...hole, [key]: value };
      }),
    }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Electronics Enclosure</h1>
        <p className="text-muted-foreground mb-6">
          A closed finger-joint project box with connector holes, a front port and ventilation.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ParamSlider label="Length" value={params.length} min={40} max={400} step={1} onChange={set("length")} />
            <ParamSlider label="Width" value={params.width} min={40} max={400} step={1} onChange={set("width")} />
            <ParamSlider label="Height" value={params.height} min={25} max={200} step={1} onChange={set("height")} />
            <ParamSlider label="Material thickness" value={params.thickness} min={1} max={12} step={0.5} onChange={set("thickness")} />
            <ParamSlider label="Finger size" value={params.fingerSize} min={3} max={30} step={0.5} onChange={set("fingerSize")} />
            <ParamSlider label="Kerf compensation" value={params.kerf} min={0} max={0.5} step={0.05} onChange={set("kerf")} />

            <div className="space-y-2">
              <Label>Ventilation</Label>
              <Select value={params.vents} onValueChange={(v) => set("vents")(v as VentPlacement)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Back panel holes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Back panel holes (jacks, switches, glands)</Label>
                <Button size="sm" variant="outline" onClick={addHole}>
                  <Plus className="w-4 h-4 mr-1" /> Add hole
                </Button>
              </div>
              <div className="space-y-2">
                {params.backHoles.map((hole, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-4">{i + 1}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">X</span>
                      <Input type="number" step={0.5} defaultValue={hole.x} onChange={(e) => updateHole(i, "x", e.target.value)} className="w-20 h-8 text-sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">Z</span>
                      <Input type="number" step={0.5} defaultValue={hole.z} onChange={(e) => updateHole(i, "z", e.target.value)} className="w-20 h-8 text-sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">⌀</span>
                      <Input type="number" step={0.1} min={0.5} defaultValue={hole.diameter} onChange={(e) => updateHole(i, "diameter", e.target.value)} className="w-20 h-8 text-sm" />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeHole(i)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted">X from the panel's left edge, Z above the box floor, in mm.</p>
            </div>

            {/* Front port */}
            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Front port cutout</Label>
                <p className="text-xs text-text-muted mt-0.5">Rectangular opening for USB, display or SD card.</p>
              </div>
              <Switch checked={params.frontPort.enabled} onCheckedChange={setPort("enabled")} />
            </div>
            {params.frontPort.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <ParamSlider label="Port width" value={params.frontPort.width} min={4} max={80} step={0.5} onChange={setPort("width")} />
                <ParamSlider label="Port height" value={params.frontPort.height} min={3} max={50} step={0.5} onChange={setPort("height")} />
                <ParamSlider label="Port center X" value={params.frontPort.x} min={0} max={params.length} step={1} onChange={setPort("x")} />
                <ParamSlider label="Port center Z" value={params.frontPort.z} min={0} max={params.height} step={1} onChange={setPort("z")} />
              </div>
            )}

            <WarningsPanel warnings={design.warnings} />
            <ExportActions
              design={design}
              filename={`enclosure-${params.length}x${params.width}x${params.height}mm`}
              onReset={() => setParams(ENCLOSURE_DEFAULTS)}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Flat cut layout</h3>
                <LayerLegend hasEngrave={params.labels} />
              </div>
              <GeometryPreview geometry={design.geometry} />
            </div>

            <SummaryCard title="Production summary" items={design.summary} />

            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">Assembled preview</h3>
              <Box3DPreview
                length={params.length}
                width={params.width}
                height={params.height}
                thickness={params.thickness}
                closedTop={true}
                className="h-[280px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
