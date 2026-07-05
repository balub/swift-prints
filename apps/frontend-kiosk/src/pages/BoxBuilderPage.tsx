import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { Box3DPreview } from "@/components/Box3DPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { BOX_DEFAULTS, generateBox, type BoxParams } from "@/blocks/box/generator";
import { hasBlockingError } from "@/blocks/types";
import { geometryToDxf } from "@/lib/dxf";
import { geometryToSvg } from "@/lib/svg";
import { downloadDxf, downloadSvg } from "@/lib/download";
import { Download, RotateCcw } from "lucide-react";

export default function BoxBuilderPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<BoxParams>(BOX_DEFAULTS);

  const design = useMemo(() => generateBox(params), [params]);
  const blocked = hasBlockingError(design.warnings);

  const set = <K extends keyof BoxParams>(key: K) => (value: BoxParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const filename = `box-${params.length}x${params.width}x${params.height}mm`;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Laser-Cut Box</h1>
        <p className="text-muted-foreground mb-6">Generate a laser-cut finger-joint box from dimensions.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: controls */}
          <div className="space-y-6">
            <ParamSlider label="Box length" value={params.length} min={30} max={400} step={1} onChange={set("length")} />
            <ParamSlider label="Box width" value={params.width} min={30} max={400} step={1} onChange={set("width")} />
            <ParamSlider label="Box height" value={params.height} min={20} max={300} step={1} onChange={set("height")} />
            <ParamSlider label="Material thickness" value={params.thickness} min={1} max={12} step={0.5} onChange={set("thickness")} />
            <ParamSlider label="Finger size" value={params.fingerSize} min={3} max={30} step={0.5} onChange={set("fingerSize")} />
            <ParamSlider label="Kerf compensation" value={params.kerf} min={0} max={0.5} step={0.05} onChange={set("kerf")} />
            <ParamSlider label="Panel spacing" value={params.spacing} min={4} max={20} step={1} onChange={set("spacing")} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Joint type</Label>
                <Select value="finger" onValueChange={() => undefined}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finger">Finger joints</SelectItem>
                    <SelectItem value="butt" disabled>
                      Butt joints — coming soon
                    </SelectItem>
                    <SelectItem value="tslot" disabled>
                      T-slot + bolts — coming soon
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Units</Label>
                <Select value="mm" onValueChange={() => undefined}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm">Millimeters</SelectItem>
                    <SelectItem value="in" disabled>
                      Inches — coming soon
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Closed box</Label>
                <p className="text-xs text-text-muted mt-0.5">Adds a sixth panel to close the top.</p>
              </div>
              <Switch checked={params.closedTop} onCheckedChange={set("closedTop")} />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <Label>Engrave panel labels</Label>
                <p className="text-xs text-text-muted mt-0.5">Marks each panel name in the layout.</p>
              </div>
              <Switch checked={params.labels} onCheckedChange={set("labels")} />
            </div>

            <WarningsPanel warnings={design.warnings} />

            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  disabled={blocked}
                  onClick={() => downloadDxf(geometryToDxf(design.geometry), `${filename}.dxf`)}
                >
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
                <Button variant="ghost" onClick={() => setParams(BOX_DEFAULTS)}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Right: previews */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Flat cut layout</h3>
                <LayerLegend hasEngrave={params.labels} />
              </div>
              <GeometryPreview geometry={design.geometry} />
            </div>

            <SummaryCard title="Cut list" items={design.summary} />

            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">Assembled preview</h3>
              <Box3DPreview
                length={params.length}
                width={params.width}
                height={params.height}
                thickness={params.thickness}
                closedTop={params.closedTop}
                className="h-[320px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
