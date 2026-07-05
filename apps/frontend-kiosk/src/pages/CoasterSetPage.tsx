import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { ExportActions } from "@/components/ExportActions";
import { COASTER_DEFAULTS, generateCoasterSet, type BorderStyle, type CoasterParams, type CoasterShape } from "@/blocks/coaster/generator";

const SHAPES: { value: CoasterShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "square", label: "Rounded square" },
  { value: "hexagon", label: "Hexagon" },
];

const BORDERS: { value: BorderStyle; label: string }[] = [
  { value: "none", label: "No border" },
  { value: "single", label: "Single ring" },
  { value: "double", label: "Double ring" },
];

export default function CoasterSetPage() {
  const [params, setParams] = useState<CoasterParams>(COASTER_DEFAULTS);
  const design = useMemo(() => generateCoasterSet(params), [params]);

  const set = <K extends keyof CoasterParams>(key: K) => (value: CoasterParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Coaster Set</h1>
        <p className="text-muted-foreground mb-6">A matching set of coasters with an engraved border and monogram.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shape</Label>
                <Select value={params.shape} onValueChange={(v) => set("shape")(v as CoasterShape)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Border</Label>
                <Select value={params.border} onValueChange={(v) => set("border")(v as BorderStyle)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BORDERS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ParamSlider label="Coaster size" value={params.size} min={60} max={150} step={1} onChange={set("size")} />
            <ParamSlider label="Quantity" unit="" value={params.quantity} min={1} max={12} step={1} onChange={set("quantity")} />
            {params.shape === "square" && (
              <ParamSlider label="Corner radius" value={params.cornerRadius} min={0} max={20} step={0.5} onChange={set("cornerRadius")} />
            )}

            <div className="space-y-2">
              <Label>Engraved text (monogram or word)</Label>
              <Input value={params.textContent} maxLength={20} placeholder="B" onChange={(e) => set("textContent")(e.target.value)} />
            </div>
            <ParamSlider label="Font size" value={params.fontSize} min={4} max={50} step={1} onChange={set("fontSize")} />

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Engrave text</Label>
                <p className="text-xs text-text-muted mt-0.5">Marks the text in the center of each coaster.</p>
              </div>
              <Switch checked={params.engraveText} onCheckedChange={set("engraveText")} />
            </div>

            <WarningsPanel warnings={design.warnings} />
            <ExportActions design={design} filename={`coasters-${params.quantity}x${params.size}mm`} onReset={() => setParams(COASTER_DEFAULTS)} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                <LayerLegend />
              </div>
              <GeometryPreview geometry={design.geometry} maxHeightClass="max-h-[420px]" />
            </div>
            <SummaryCard title="Production summary" items={design.summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
