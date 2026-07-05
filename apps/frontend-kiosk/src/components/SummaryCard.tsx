import { Card, CardContent } from "@/components/ui/card";
import type { SummaryItem } from "@/blocks/types";

export function SummaryCard({ title, items }: { title: string; items: SummaryItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
        <dl className="space-y-1">
          {items.map((item) => (
            <div key={item.label} className="flex justify-between gap-4 text-sm">
              <dt className="text-text-muted">{item.label}</dt>
              <dd className="text-text-secondary font-mono text-right">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
