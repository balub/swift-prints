import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";
import type { GeneratedDesign } from "@/blocks/types";
import { hasBlockingError } from "@/blocks/types";
import { geometryToDxf } from "@/lib/dxf";
import { geometryToSvg } from "@/lib/svg";
import { downloadDxf, downloadSvg } from "@/lib/download";

interface ExportActionsProps {
  design: GeneratedDesign;
  /** Base filename without extension. */
  filename: string;
  onReset: () => void;
}

/** Standard CTA block for laser design pages: DXF/SVG download, order placeholder, reset. */
export function ExportActions({ design, filename, onReset }: ExportActionsProps) {
  const navigate = useNavigate();
  const blocked = hasBlockingError(design.warnings);

  return (
    <div className="space-y-2 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={blocked} onClick={() => downloadDxf(geometryToDxf(design.geometry), `${filename}.dxf`)}>
          <Download className="w-4 h-4 mr-2" /> Download DXF
        </Button>
        <Button variant="outline" disabled={blocked} onClick={() => downloadSvg(geometryToSvg(design.geometry), `${filename}.svg`)}>
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
        <Button variant="ghost" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-2" /> Reset
        </Button>
      </div>
    </div>
  );
}
