import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { ExportActions } from "@/components/ExportActions";
import { DISPLAY_STAND_DEFAULTS, generateDisplayStand, type DisplayStandParams } from "@/blocks/display-stand/generator";

export default function DisplayStandPage() {
  const [params, setParams] = useState<DisplayStandParams>(DISPLAY_STAND_DEFAULTS);
  const design = useMemo(() => generateDisplayStand(params), [params]);

  const set = <K extends keyof DisplayStandParams>(key: K) => (value: DisplayStandParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Display Stand</h1>
        <p className="text-muted-foreground mb-6">
          An angled riser for products, cards and retail shelves — the top panel tabs into angled slots in the sides.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ParamSlider label="Stand width" value={params.width} min={40} max={400} step={1} onChange={set("width")} />
            <ParamSlider label="Depth" value={params.depth} min={40} max={300} step={1} onChange={set("depth")} />
            <ParamSlider label="Back height" value={params.backHeight} min={20} max={250} step={1} onChange={set("backHeight")} />
            <ParamSlider label="Front height" value={params.frontHeight} min={5} max={200} step={1} onChange={set("frontHeight")} />
            <ParamSlider label="Material thickness" value={params.thickness} min={2} max={8} step={0.5} onChange={set("thickness")} />
            <ParamSlider label="Kerf compensation" value={params.kerf} min={0} max={0.5} step={0.05} onChange={set("kerf")} />

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Front lip</Label>
                <p className="text-xs text-text-muted mt-0.5">A strip along the front edge so items don't slide off.</p>
              </div>
              <Switch checked={params.lip} onCheckedChange={set("lip")} />
            </div>
            {params.lip && (
              <ParamSlider label="Lip height" value={params.lipHeight} min={6} max={40} step={0.5} onChange={set("lipHeight")} />
            )}

            <WarningsPanel warnings={design.warnings} />
            <ExportActions design={design} filename={`display-stand-${params.width}mm`} onReset={() => setParams(DISPLAY_STAND_DEFAULTS)} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Flat cut layout</h3>
                <LayerLegend hasEngrave={false} />
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
