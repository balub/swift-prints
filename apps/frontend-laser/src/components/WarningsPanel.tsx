import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { DesignWarning } from "@/blocks/types";

const styles = {
  error: { icon: XCircle, box: "bg-destructive/10 text-destructive border-destructive/30" },
  warning: { icon: AlertTriangle, box: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  info: { icon: Info, box: "bg-primary/5 text-text-secondary border-border" },
};

export function WarningsPanel({ warnings }: { warnings: DesignWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      {warnings.map((w, i) => {
        const { icon: Icon, box } = styles[w.level];
        return (
          <div key={i} className={`flex items-start gap-2 text-sm border rounded-lg px-3 py-2 ${box}`}>
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{w.message}</span>
          </div>
        );
      })}
    </div>
  );
}
