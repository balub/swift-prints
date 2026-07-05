import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS, DESIGN_BLOCKS } from "@/blocks/registry";
import type { DesignBlock } from "@/blocks/types";
import {
  Box,
  CircuitBoard,
  Cpu,
  Grid3x3,
  KeyRound,
  Lightbulb,
  MonitorSmartphone,
  PanelTop,
  QrCode,
  Smartphone,
  Store,
  Type,
} from "lucide-react";

const BLOCK_ICONS: Record<string, typeof Box> = {
  "box-builder": Box,
  keychain: KeyRound,
  enclosure: Cpu,
  "front-panel": PanelTop,
  "pcb-standoff": CircuitBoard,
  "phone-stand": Smartphone,
  "qr-sign": QrCode,
  "coaster-set": Grid3x3,
  "drawer-divider": MonitorSmartphone,
  "display-stand": Store,
  "name-sign": Type,
  "edge-lit-sign": Lightbulb,
};

function BlockCard({ block }: { block: DesignBlock }) {
  const Icon = BLOCK_ICONS[block.id] ?? Box;
  const available = block.status === "available";

  const body = (
    <Card
      className={`h-full transition-all duration-200 ${
        available ? "hover:border-primary/50 hover:shadow-md cursor-pointer" : "opacity-70"
      }`}
    >
      <CardContent className="p-6 flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <Badge variant="outline" className="text-xs bg-muted/50 text-text-secondary border-border">
            {CATEGORY_LABELS[block.category]}
          </Badge>
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-text-primary">{block.name}</h2>
          <p className="text-sm text-text-muted mt-0.5">{block.description}</p>
        </div>
        {available ? (
          <Button size="sm" className="w-full">
            Customize
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full" disabled>
            Coming soon
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return available ? (
    <Link to={`/design/${block.slug}`} className="block h-full">
      {body}
    </Link>
  ) : (
    <div className="h-full">{body}</div>
  );
}

export default function DesignGallery() {
  const available = DESIGN_BLOCKS.filter((b) => b.status === "available");
  const comingSoon = DESIGN_BLOCKS.filter((b) => b.status === "coming-soon");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Design Blocks</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Pick a ready-made design, set your dimensions and text, and get a laser-ready file — no CAD needed.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {available.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </div>

        <h2 className="text-lg font-semibold font-jura mb-3 text-text-secondary">More blocks on the way</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {comingSoon.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}
