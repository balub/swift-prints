import type { LaserGeometry } from "@/lib/geometry";

export type BlockCategory = "makers" | "home" | "gifts" | "business" | "engineering";

export interface DesignBlock {
  id: string;
  name: string;
  slug: string;
  category: BlockCategory;
  description: string;
  status: "available" | "coming-soon";
}

export type WarningLevel = "info" | "warning" | "error";

export interface DesignWarning {
  level: WarningLevel;
  message: string;
}

/** One line of the cut list / production summary. */
export interface SummaryItem {
  label: string;
  value: string;
}

export interface GeneratedDesign {
  geometry: LaserGeometry;
  /** Cut list / production summary lines shown next to the preview. */
  summary: SummaryItem[];
  warnings: DesignWarning[];
}

export function hasBlockingError(warnings: DesignWarning[]): boolean {
  return warnings.some((w) => w.level === "error");
}
