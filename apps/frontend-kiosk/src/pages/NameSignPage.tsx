import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { ExportActions } from "@/components/ExportActions";
import { generateNameSign, NAME_SIGN_DEFAULTS, type NameSignParams } from "@/blocks/name-sign/generator";
import { useSignFont } from "@/blocks/name-sign/useFont";
import { Loader2 } from "lucide-react";

export default function NameSignPage() {
  const { font, error: fontError } = useSignFont();
  const [params, setParams] = useState<NameSignParams>(NAME_SIGN_DEFAULTS);

  const design = useMemo(() => {
    if (!font) return { geometry: { shapes: [] }, summary: [], warnings: [] };
    return generateNameSign(params, font);
  }, [params, font]);

  const set = <K extends keyof NameSignParams>(key: K) => (value: NameSignParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Name Sign</h1>
        <p className="text-muted-foreground mb-6">
          A name cut as one piece in a connected script — real vector letters, ready for walls, doors and desks.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={params.name} maxLength={20} placeholder="Milo" onChange={(e) => set("name")(e.target.value)} />
              <p className="text-xs text-text-muted">Lowercase script connects best — dots on i and j become separate pieces.</p>
            </div>

            <ParamSlider label="Sign width" value={params.width} min={80} max={600} step={5} onChange={set("width")} />

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Base bar</Label>
                <p className="text-xs text-text-muted mt-0.5">A bar along the baseline that fuses the letters together.</p>
              </div>
              <Switch checked={params.baseBar} onCheckedChange={set("baseBar")} />
            </div>
            {params.baseBar && (
              <>
                <ParamSlider label="Bar height" value={params.barHeight} min={6} max={30} step={1} onChange={set("barHeight")} />
                <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <div>
                    <Label>Hanging holes</Label>
                    <p className="text-xs text-text-muted mt-0.5">Two holes in the bar for nails or string.</p>
                  </div>
                  <Switch checked={params.hangingHoles} onCheckedChange={set("hangingHoles")} />
                </div>
                {params.hangingHoles && (
                  <ParamSlider label="Hole diameter" value={params.holeDiameter} min={2} max={8} step={0.5} onChange={set("holeDiameter")} />
                )}
              </>
            )}

            <WarningsPanel warnings={design.warnings} />
            {fontError && <p className="text-destructive text-sm">{fontError}</p>}
            <ExportActions
              design={design}
              filename={`name-sign-${params.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "sign"}`}
              onReset={() => setParams(NAME_SIGN_DEFAULTS)}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                <LayerLegend hasEngrave={false} />
              </div>
              {font ? (
                <GeometryPreview geometry={design.geometry} maxHeightClass="max-h-[380px]" />
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-text-muted gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading font…
                </div>
              )}
            </div>
            <SummaryCard title="Production summary" items={design.summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
