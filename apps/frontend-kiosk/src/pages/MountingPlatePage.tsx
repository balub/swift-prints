import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { ExportActions } from "@/components/ExportActions";
import { generateMountingPlate, MOUNTING_PLATE_DEFAULTS, type MountingPlateParams, type PlateHole } from "@/blocks/mounting-plate/generator";
import { Plus, Trash2 } from "lucide-react";

export default function MountingPlatePage() {
  const [params, setParams] = useState<MountingPlateParams>(MOUNTING_PLATE_DEFAULTS);
  const design = useMemo(() => generateMountingPlate(params), [params]);

  const set = <K extends keyof MountingPlateParams>(key: K) => (value: MountingPlateParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));
  const setGrid = <K extends keyof MountingPlateParams["grid"]>(key: K) => (value: MountingPlateParams["grid"][K]) =>
    setParams((prev) => ({ ...prev, grid: { ...prev.grid, [key]: value } }));

  const addHole = () =>
    setParams((prev) => ({ ...prev, holes: [...prev.holes, { x: Math.round(prev.width / 2), y: Math.round(prev.height / 2), diameter: 4 }] }));
  const removeHole = (i: number) => setParams((prev) => ({ ...prev, holes: prev.holes.filter((_, idx) => idx !== i) }));
  const updateHole = (i: number, key: keyof PlateHole, raw: string) =>
    setParams((prev) => ({
      ...prev,
      holes: prev.holes.map((hole, idx) => {
        if (idx !== i) return hole;
        const value = parseFloat(raw);
        return isNaN(value) ? hole : { ...hole, [key]: value };
      }),
    }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Mounting Plate</h1>
        <p className="text-muted-foreground mb-6">A flat plate with a hole grid for standoffs, sensors, pumps — plus extra holes wherever you need them.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ParamSlider label="Plate width" value={params.width} min={30} max={400} step={1} onChange={set("width")} />
            <ParamSlider label="Plate height" value={params.height} min={30} max={400} step={1} onChange={set("height")} />
            <ParamSlider label="Corner radius" value={params.cornerRadius} min={0} max={15} step={0.5} onChange={set("cornerRadius")} />

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Hole grid</Label>
                <p className="text-xs text-text-muted mt-0.5">A regular pattern centered on the plate.</p>
              </div>
              <Switch checked={params.grid.enabled} onCheckedChange={setGrid("enabled")} />
            </div>
            {params.grid.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <ParamSlider label="Columns" unit="" value={params.grid.columns} min={1} max={12} step={1} onChange={setGrid("columns")} />
                  <ParamSlider label="Rows" unit="" value={params.grid.rows} min={1} max={12} step={1} onChange={setGrid("rows")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ParamSlider label="Pitch X" value={params.grid.pitchX} min={5} max={60} step={0.5} onChange={setGrid("pitchX")} />
                  <ParamSlider label="Pitch Y" value={params.grid.pitchY} min={5} max={60} step={0.5} onChange={setGrid("pitchY")} />
                </div>
                <ParamSlider label="Grid hole ⌀" value={params.grid.diameter} min={1} max={10} step={0.1} onChange={setGrid("diameter")} />
              </>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Extra holes</Label>
                <Button size="sm" variant="outline" onClick={addHole}>
                  <Plus className="w-4 h-4 mr-1" /> Add hole
                </Button>
              </div>
              {params.holes.length === 0 && <p className="text-xs text-text-muted">None — the grid may be all you need.</p>}
              <div className="space-y-2">
                {params.holes.map((hole, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-4">{i + 1}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">X</span>
                      <Input type="number" step={0.5} defaultValue={hole.x} onChange={(e) => updateHole(i, "x", e.target.value)} className="w-20 h-8 text-sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">Y</span>
                      <Input type="number" step={0.5} defaultValue={hole.y} onChange={(e) => updateHole(i, "y", e.target.value)} className="w-20 h-8 text-sm" />
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
              <p className="text-xs text-text-muted">X/Y from the bottom-left corner, in mm.</p>
            </div>

            <WarningsPanel warnings={design.warnings} />
            <ExportActions design={design} filename={`mounting-plate-${params.width}x${params.height}mm`} onReset={() => setParams(MOUNTING_PLATE_DEFAULTS)} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                <LayerLegend hasEngrave={params.engraveOrigin} />
              </div>
              <GeometryPreview geometry={design.geometry} />
            </div>
            <SummaryCard title="Production summary" items={design.summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
