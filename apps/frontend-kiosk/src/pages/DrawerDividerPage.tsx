import { useMemo, useState } from "react";
import { ParamSlider } from "@/components/ParamSlider";
import { GeometryPreview, LayerLegend } from "@/components/GeometryPreview";
import { DividerGrid3DPreview } from "@/components/DividerGrid3DPreview";
import { SummaryCard } from "@/components/SummaryCard";
import { WarningsPanel } from "@/components/WarningsPanel";
import { ExportActions } from "@/components/ExportActions";
import { DRAWER_DIVIDER_DEFAULTS, generateDrawerDivider, type DrawerDividerParams } from "@/blocks/drawer-divider/generator";

export default function DrawerDividerPage() {
  const [params, setParams] = useState<DrawerDividerParams>(DRAWER_DIVIDER_DEFAULTS);
  const design = useMemo(() => generateDrawerDivider(params), [params]);

  const set = <K extends keyof DrawerDividerParams>(key: K) => (value: DrawerDividerParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Drawer Divider</h1>
        <p className="text-muted-foreground mb-6">
          A slot-together grid sized to your drawer — strips press into each other, no glue needed.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ParamSlider label="Drawer width (inside)" value={params.width} min={100} max={800} step={1} onChange={set("width")} />
            <ParamSlider label="Drawer depth (inside)" value={params.depth} min={100} max={800} step={1} onChange={set("depth")} />
            <ParamSlider label="Divider height" value={params.height} min={20} max={150} step={1} onChange={set("height")} />
            <ParamSlider label="Columns" unit="" value={params.columns} min={1} max={8} step={1} onChange={set("columns")} />
            <ParamSlider label="Rows" unit="" value={params.rows} min={1} max={8} step={1} onChange={set("rows")} />
            <ParamSlider label="Material thickness" value={params.thickness} min={2} max={8} step={0.5} onChange={set("thickness")} />
            <ParamSlider label="Kerf compensation" value={params.kerf} min={0} max={0.5} step={0.05} onChange={set("kerf")} />

            <WarningsPanel warnings={design.warnings} />
            <ExportActions
              design={design}
              filename={`drawer-divider-${params.columns}x${params.rows}`}
              onReset={() => setParams(DRAWER_DIVIDER_DEFAULTS)}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Flat cut layout</h3>
                <LayerLegend hasEngrave={false} />
              </div>
              <GeometryPreview geometry={design.geometry} />
            </div>

            <SummaryCard title="Cut list" items={design.summary} />

            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">Assembled preview</h3>
              <DividerGrid3DPreview
                width={params.width}
                depth={params.depth}
                height={params.height}
                columns={params.columns}
                rows={params.rows}
                thickness={params.thickness}
                className="h-[300px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
