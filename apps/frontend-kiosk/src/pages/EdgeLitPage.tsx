import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { ExportActions } from "@/components/ExportActions";
import { EDGE_LIT_DEFAULTS, generateEdgeLit, type EdgeLitParams } from "@/blocks/edge-lit/generator";

export default function EdgeLitPage() {
  const [params, setParams] = useState<EdgeLitParams>(EDGE_LIT_DEFAULTS);
  const design = useMemo(() => generateEdgeLit(params), [params]);

  const set = <K extends keyof EdgeLitParams>(key: K) => (value: EdgeLitParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Edge-Lit Acrylic Sign</h1>
        <p className="text-muted-foreground mb-6">
          A clear acrylic panel that slots into a base — put an LED strip under the slot and the engraving glows.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Sign text</Label>
              <Input value={params.textContent} maxLength={30} placeholder="OPEN" onChange={(e) => set("textContent")(e.target.value)} />
            </div>

            <ParamSlider label="Panel width" value={params.width} min={60} max={400} step={1} onChange={set("width")} />
            <ParamSlider label="Panel height" value={params.height} min={40} max={300} step={1} onChange={set("height")} />
            <ParamSlider label="Font size" value={params.fontSize} min={8} max={80} step={1} onChange={set("fontSize")} />
            <ParamSlider label="Corner radius" value={params.cornerRadius} min={0} max={20} step={0.5} onChange={set("cornerRadius")} />
            <ParamSlider label="Base depth" value={params.baseDepth} min={20} max={80} step={1} onChange={set("baseDepth")} />
            <ParamSlider label="Acrylic thickness" value={params.thickness} min={2} max={10} step={0.5} onChange={set("thickness")} />
            <ParamSlider label="Kerf compensation" value={params.kerf} min={0} max={0.5} step={0.05} onChange={set("kerf")} />

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Mirror the engraving</Label>
                <p className="text-xs text-text-muted mt-0.5">
                  Engrave the BACK of the panel — the text reads correctly from the front and glows brighter.
                </p>
              </div>
              <Switch checked={params.mirrored} onCheckedChange={set("mirrored")} />
            </div>

            <WarningsPanel warnings={design.warnings} />
            <ExportActions design={design} filename={`edge-lit-${params.width}mm`} onReset={() => setParams(EDGE_LIT_DEFAULTS)} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                <LayerLegend />
              </div>
              <GeometryPreview geometry={design.geometry} maxHeightClass="max-h-[420px]" />
              {params.mirrored && (
                <p className="text-xs text-text-muted">The text previews mirrored on purpose — that's the back of the panel.</p>
              )}
            </div>
            <SummaryCard title="Production summary" items={design.summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
