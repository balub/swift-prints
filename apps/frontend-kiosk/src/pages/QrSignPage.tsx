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
import { generateQrSign, QR_SIGN_DEFAULTS, type QrErrorLevel, type QrSignParams } from "@/blocks/qr-sign/generator";

const ERROR_LEVELS: { value: QrErrorLevel; label: string }[] = [
  { value: "L", label: "L — smallest code" },
  { value: "M", label: "M — recommended" },
  { value: "Q", label: "Q — robust" },
  { value: "H", label: "H — most robust" },
];

export default function QrSignPage() {
  const [params, setParams] = useState<QrSignParams>(QR_SIGN_DEFAULTS);
  const design = useMemo(() => generateQrSign(params), [params]);

  const set = <K extends keyof QrSignParams>(key: K) => (value: QrSignParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">QR Code Sign</h1>
        <p className="text-muted-foreground mb-6">
          A scannable engraved QR sign for menus, payments, Wi-Fi and links. The sign height adjusts to fit automatically.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Link or text to encode</Label>
              <Input
                value={params.content}
                maxLength={200}
                placeholder="https://your-shop.example"
                onChange={(e) => set("content")(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Error correction</Label>
                <Select value={params.errorLevel} onValueChange={(v) => set("errorLevel")(v as QrErrorLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ERROR_LEVELS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-text-muted">Higher levels survive scratches but need bigger codes.</p>
              </div>
              <div className="space-y-2">
                <Label>Caption</Label>
                <Input value={params.caption} maxLength={30} placeholder="SCAN ME" onChange={(e) => set("caption")(e.target.value)} />
              </div>
            </div>

            <ParamSlider label="Sign width" value={params.signWidth} min={40} max={300} step={1} onChange={set("signWidth")} />
            <ParamSlider label="QR size" value={params.qrSize} min={20} max={250} step={1} onChange={set("qrSize")} />
            <ParamSlider label="Caption size" value={params.captionSize} min={3} max={15} step={0.5} onChange={set("captionSize")} />
            <ParamSlider label="Corner radius" value={params.cornerRadius} min={0} max={15} step={0.5} onChange={set("cornerRadius")} />

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Hanging holes</Label>
                <p className="text-xs text-text-muted mt-0.5">Two holes at the top for screws or string.</p>
              </div>
              <Switch checked={params.hangingHoles} onCheckedChange={set("hangingHoles")} />
            </div>
            {params.hangingHoles && (
              <ParamSlider label="Hole diameter" value={params.holeDiameter} min={2} max={8} step={0.5} onChange={set("holeDiameter")} />
            )}

            <WarningsPanel warnings={design.warnings} />
            <ExportActions design={design} filename={`qr-sign-${params.signWidth}mm`} onReset={() => setParams(QR_SIGN_DEFAULTS)} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                <LayerLegend />
              </div>
              <GeometryPreview geometry={design.geometry} maxHeightClass="max-h-[440px]" />
              <p className="text-xs text-text-muted">
                Tip: engrave on a light material (or paint-fill the engraving) so the code has strong contrast.
              </p>
            </div>
            <SummaryCard title="Production summary" items={design.summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
