import { useMemo, useState } from "react";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { PhoneStand3DPreview } from "@/components/PhoneStand3DPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { ExportActions } from "@/components/ExportActions";
import { generatePhoneStand, PHONE_STAND_DEFAULTS, type PhoneStandParams } from "@/blocks/phone-stand/generator";

export default function PhoneStandPage() {
  const [params, setParams] = useState<PhoneStandParams>(PHONE_STAND_DEFAULTS);
  const design = useMemo(() => generatePhoneStand(params), [params]);

  const set = <K extends keyof PhoneStandParams>(key: K) => (value: PhoneStandParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Phone Stand</h1>
        <p className="text-muted-foreground mb-6">
          A slot-together desk stand — two side profiles and a cross brace, no glue needed.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ParamSlider label="Stand width" value={params.width} min={40} max={150} step={1} onChange={set("width")} />
            <ParamSlider label="Recline angle" unit="°" value={params.reclineDeg} min={5} max={50} step={1} onChange={set("reclineDeg")} />
            <ParamSlider label="Back support length" value={params.supportLength} min={60} max={180} step={1} onChange={set("supportLength")} />
            <ParamSlider label="Phone channel" value={params.channel} min={7} max={30} step={0.5} onChange={set("channel")} />
            <ParamSlider label="Front lip height" value={params.lipHeight} min={8} max={30} step={0.5} onChange={set("lipHeight")} />
            <ParamSlider label="Brace height" value={params.braceHeight} min={10} max={40} step={1} onChange={set("braceHeight")} />
            <ParamSlider label="Material thickness" value={params.thickness} min={2} max={8} step={0.5} onChange={set("thickness")} />
            <ParamSlider label="Kerf compensation" value={params.kerf} min={0} max={0.5} step={0.05} onChange={set("kerf")} />

            <WarningsPanel warnings={design.warnings} />
            <ExportActions design={design} filename={`phone-stand-${params.width}mm`} onReset={() => setParams(PHONE_STAND_DEFAULTS)} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Flat cut layout</h3>
                <LayerLegend hasEngrave={false} />
              </div>
              <GeometryPreview geometry={design.geometry} />
            </div>

            <SummaryCard title="Production summary" items={design.summary} />

            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">Assembled preview</h3>
              <PhoneStand3DPreview params={params} className="h-[300px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
