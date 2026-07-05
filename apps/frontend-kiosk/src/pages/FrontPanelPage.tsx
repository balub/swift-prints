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
import { FRONT_PANEL_DEFAULTS, generateFrontPanel, type FrontPanelParams, type PanelHole } from "@/blocks/front-panel/generator";
import { Plus, Trash2 } from "lucide-react";

export default function FrontPanelPage() {
  const [params, setParams] = useState<FrontPanelParams>(FRONT_PANEL_DEFAULTS);
  const design = useMemo(() => generateFrontPanel(params), [params]);

  const set = <K extends keyof FrontPanelParams>(key: K) => (value: FrontPanelParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const addHole = () =>
    setParams((prev) => ({
      ...prev,
      holes: [...prev.holes, { x: Math.round(prev.width / 2), y: Math.round(prev.height / 2), diameter: 6, label: "" }],
    }));
  const removeHole = (i: number) => setParams((prev) => ({ ...prev, holes: prev.holes.filter((_, idx) => idx !== i) }));
  const updateHole = (i: number, key: keyof PanelHole, raw: string) =>
    setParams((prev) => ({
      ...prev,
      holes: prev.holes.map((hole, idx) => {
        if (idx !== i) return hole;
        if (key === "label") return { ...hole, label: raw };
        const value = parseFloat(raw);
        return isNaN(value) ? hole : { ...hole, [key]: value };
      }),
    }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Front Panel</h1>
        <p className="text-muted-foreground mb-6">
          An instrument panel with holes for switches, jacks and LEDs — labels engraved right on the panel.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ParamSlider label="Panel width" value={params.width} min={40} max={400} step={1} onChange={set("width")} />
            <ParamSlider label="Panel height" value={params.height} min={20} max={300} step={1} onChange={set("height")} />
            <ParamSlider label="Corner radius" value={params.cornerRadius} min={0} max={15} step={0.5} onChange={set("cornerRadius")} />

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Corner mounting holes</Label>
                <p className="text-xs text-text-muted mt-0.5">Four screw holes near the corners.</p>
              </div>
              <Switch checked={params.mountingHoles} onCheckedChange={set("mountingHoles")} />
            </div>
            {params.mountingHoles && (
              <div className="grid grid-cols-2 gap-4">
                <ParamSlider label="Screw hole ⌀" value={params.mountingHoleDiameter} min={2} max={8} step={0.1} onChange={set("mountingHoleDiameter")} />
                <ParamSlider label="Corner inset" value={params.mountingHoleInset} min={3} max={20} step={0.5} onChange={set("mountingHoleInset")} />
              </div>
            )}

            {/* Component hole table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Component holes</Label>
                <Button size="sm" variant="outline" onClick={addHole}>
                  <Plus className="w-4 h-4 mr-1" /> Add hole
                </Button>
              </div>
              {params.holes.length === 0 && (
                <p className="text-xs text-text-muted">No holes yet — add one for each switch, jack or LED.</p>
              )}
              <div className="space-y-2">
                {params.holes.map((hole, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-text-muted w-4">{i + 1}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">X</span>
                      <Input type="number" step={0.5} defaultValue={hole.x} onChange={(e) => updateHole(i, "x", e.target.value)} className="w-16 h-8 text-sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">Y</span>
                      <Input type="number" step={0.5} defaultValue={hole.y} onChange={(e) => updateHole(i, "y", e.target.value)} className="w-16 h-8 text-sm" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">⌀</span>
                      <Input type="number" step={0.1} min={0.5} defaultValue={hole.diameter} onChange={(e) => updateHole(i, "diameter", e.target.value)} className="w-16 h-8 text-sm" />
                    </div>
                    <Input
                      placeholder="Label"
                      defaultValue={hole.label}
                      maxLength={16}
                      onChange={(e) => updateHole(i, "label", e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeHole(i)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted">X/Y are measured in mm from the bottom-left corner of the panel.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Engrave labels</Label>
                <p className="text-xs text-text-muted mt-0.5">Marks each hole's label underneath it.</p>
              </div>
              <Switch checked={params.engraveLabels} onCheckedChange={set("engraveLabels")} />
            </div>
            {params.engraveLabels && (
              <ParamSlider label="Label size" value={params.labelSize} min={2} max={8} step={0.5} onChange={set("labelSize")} />
            )}

            <WarningsPanel warnings={design.warnings} />
            <ExportActions design={design} filename={`front-panel-${params.width}x${params.height}mm`} onReset={() => setParams(FRONT_PANEL_DEFAULTS)} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                <LayerLegend hasEngrave={params.engraveLabels} />
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
