import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileUp, Shapes, Ruler, Eye, Package } from "lucide-react";

const steps = [
  { icon: Ruler, title: "Set your dimensions", text: "Pick a design block and adjust sizes with simple sliders — no CAD software needed." },
  { icon: Eye, title: "Preview instantly", text: "See the exact cut layout and an assembled 3D preview update as you type." },
  { icon: Package, title: "Download or order", text: "Get a laser-ready DXF/SVG file, or continue to ordering when it launches." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-jura mb-4">
          Laser cutting <span className="text-primary">made easy</span>
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10">
          Customize a ready-made design block or upload your own DXF/SVG. We turn it into precisely cut parts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <Link to="/design" className="block">
            <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardContent className="p-8 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shapes className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-text-primary">Use a design block</h2>
                <p className="text-sm text-text-muted">
                  Boxes, keychains, signs and more — customize dimensions and text, preview, download.
                </p>
                <Button className="mt-2">
                  Browse design blocks <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/upload" className="block">
            <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardContent className="p-8 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileUp className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-text-primary">Upload your file</h2>
                <p className="text-sm text-text-muted">
                  Already have a DXF or SVG? Upload it, pick a material and get it cut.
                </p>
                <Button variant="outline" className="mt-2">
                  Upload DXF / SVG <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold font-jura text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step) => (
            <Card key={step.title}>
              <CardContent className="p-6 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-text-primary">{step.title}</h3>
                <p className="text-sm text-text-muted">{step.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
