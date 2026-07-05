import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { generateKeychain, KEYCHAIN_DEFAULTS, type HolePosition, type KeychainParams, type KeychainShape } from "@/blocks/keychain/generator";
import { hasBlockingError } from "@/blocks/types";
import { geometryToDxf } from "@/lib/dxf";
import { geometryToSvg } from "@/lib/svg";
import { downloadDxf, downloadSvg } from "@/lib/download";
import { Download, RotateCcw } from "lucide-react";

const SHAPE_OPTIONS: { value: KeychainShape; label: string }[] = [
  { value: "rounded", label: "Rounded rectangle" },
  { value: "rectangle", label: "Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "oval", label: "Oval" },
  { value: "tag", label: "Tag" },
];

const HOLE_OPTIONS: { value: HolePosition; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top", label: "Top" },
];

export default function KeychainPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<KeychainParams>(KEYCHAIN_DEFAULTS);

  const design = useMemo(() => generateKeychain(params), [params]);
  const blocked = hasBlockingError(design.warnings);

  const set = <K extends keyof KeychainParams>(key: K) => (value: KeychainParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const slug = params.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "tag";
  const filename = `keychain-${slug}`;
  const isCircle = params.shape === "circle";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Keychain / Text Tag</h1>
        <p className="text-muted-foreground mb-6">Design a personalized tag with engraved text and a keyring hole.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: controls */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shape</Label>
                <Select value={params.shape} onValueChange={(v) => set("shape")(v as KeychainShape)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHAPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Keyring hole position</Label>
                <Select value={params.holePosition} onValueChange={(v) => set("holePosition")(v as HolePosition)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ParamSlider
              label={isCircle ? "Diameter" : "Width"}
              value={params.width}
              min={15}
              max={150}
              step={1}
              onChange={set("width")}
            />
            {!isCircle && (
              <ParamSlider label="Height" value={params.height} min={12} max={100} step={1} onChange={set("height")} />
            )}
            {params.shape === "rounded" && (
              <ParamSlider label="Corner radius" value={params.cornerRadius} min={0} max={15} step={0.5} onChange={set("cornerRadius")} />
            )}

            <div className="space-y-2">
              <Label>Text</Label>
              <Input
                value={params.textContent}
                maxLength={40}
                placeholder="Your text"
                onChange={(e) => set("textContent")(e.target.value)}
              />
            </div>

            <ParamSlider label="Font size" value={params.fontSize} min={2} max={30} step={0.5} onChange={set("fontSize")} />
            <ParamSlider label="Hole diameter" value={params.holeDiameter} min={1} max={12} step={0.5} onChange={set("holeDiameter")} />

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Engrave text</Label>
                <p className="text-xs text-text-muted mt-0.5">The laser marks the text into the surface.</p>
              </div>
              <Switch checked={params.engraveText} onCheckedChange={set("engraveText")} />
            </div>

            <div className="space-y-2">
              <Label>Material thickness</Label>
              <Select value={String(params.thickness)} onValueChange={(v) => set("thickness")(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map((t) => (
                    <SelectItem key={t} value={String(t)}>
                      {t} mm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <WarningsPanel warnings={design.warnings} />

            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button disabled={blocked} onClick={() => downloadDxf(geometryToDxf(design.geometry), `${filename}.dxf`)}>
                  <Download className="w-4 h-4 mr-2" /> Download DXF
                </Button>
                <Button
                  variant="outline"
                  disabled={blocked}
                  onClick={() => downloadSvg(geometryToSvg(design.geometry), `${filename}.svg`)}
                >
                  <Download className="w-4 h-4 mr-2" /> Download SVG
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  disabled={blocked}
                  onClick={() => {
                    toast.info("Ordering is coming soon — download the DXF for now.");
                    navigate("/orders");
                  }}
                >
                  Continue to Order
                </Button>
                <Button variant="ghost" onClick={() => setParams(KEYCHAIN_DEFAULTS)}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Right: preview + summary */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                <LayerLegend hasEngrave={params.engraveText && params.textContent.trim().length > 0} />
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
