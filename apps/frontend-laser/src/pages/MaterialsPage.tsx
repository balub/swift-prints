import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MATERIALS = [
  { name: "Birch plywood", thicknesses: "3 / 4 / 6 mm", tone: "#d4a373", blurb: "Warm, strong and easy to finish — the go-to for boxes and organizers." },
  { name: "MDF", thicknesses: "3 / 6 mm", tone: "#b08968", blurb: "Smooth and budget-friendly, great for prototypes and painted parts." },
  { name: "Clear acrylic", thicknesses: "2 / 3 / 5 mm", tone: "#cfe8ef", blurb: "Glass-like panels and signs. Polished edges straight off the laser." },
  { name: "Black acrylic", thicknesses: "3 mm", tone: "#2b2b2b", blurb: "Deep matte or gloss black for keychains, signage and front panels." },
  { name: "White acrylic", thicknesses: "3 mm", tone: "#f4f4f4", blurb: "Clean and bright — engraving shows up crisp and dark." },
  { name: "Cardboard", thicknesses: "2 / 3 mm", tone: "#c9a86a", blurb: "Cheap test cuts before committing to your final material." },
];

export default function MaterialsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Materials</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          The materials we keep in stock. Pricing per cut is coming with the quoting engine.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MATERIALS.map((m) => (
            <Card key={m.name}>
              <CardContent className="p-5 flex gap-4">
                <div className="w-12 h-12 rounded-lg border shrink-0" style={{ background: m.tone }} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-text-primary">{m.name}</h2>
                    <Badge variant="outline" className="text-xs">{m.thicknesses}</Badge>
                  </div>
                  <p className="text-sm text-text-muted mt-1">{m.blurb}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
