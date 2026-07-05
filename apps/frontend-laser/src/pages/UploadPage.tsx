import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, FileText, FileUp, X } from "lucide-react";

const MATERIALS = ["Plywood (birch)", "MDF", "Acrylic — clear", "Acrylic — black", "Acrylic — white", "Cardboard"];
const THICKNESSES = ["2 mm", "3 mm", "4 mm", "5 mm", "6 mm"];

interface PickedFile {
  file: File;
  kind: "dxf" | "svg";
  previewUrl: string | null; // object URL for SVG preview
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [thickness, setThickness] = useState("3 mm");
  const [quantity, setQuantity] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const acceptFile = (file: File) => {
    setFileError(null);
    setSubmitted(false);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "dxf" && ext !== "svg") {
      setPicked(null);
      setFileError(`"${file.name}" is not supported — please upload a DXF or SVG file.`);
      return;
    }
    if (picked?.previewUrl) URL.revokeObjectURL(picked.previewUrl);
    setPicked({
      file,
      kind: ext,
      previewUrl: ext === "svg" ? URL.createObjectURL(file) : null,
    });
  };

  const clearFile = () => {
    if (picked?.previewUrl) URL.revokeObjectURL(picked.previewUrl);
    setPicked(null);
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Upload your file</h1>
        <p className="text-muted-foreground mb-6">
          Send us a DXF or SVG and we'll laser-cut it. Every file is reviewed by a human before cutting.
        </p>

        {!picked && (
          <div
            className={`upload-zone ${dragging ? "dragover" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) acceptFile(file);
            }}
          >
            <FileUp className="w-10 h-10 text-primary mx-auto mb-4" />
            <p className="text-text-primary font-medium mb-1">Drag and drop your file here</p>
            <p className="text-sm text-text-muted mb-4">or click to browse — DXF and SVG supported</p>
            <Button variant="outline" onClick={(e) => e.stopPropagation()} asChild>
              <span onClick={() => inputRef.current?.click()}>Choose file</span>
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".dxf,.svg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) acceptFile(file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {fileError && (
          <div className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {fileError}
          </div>
        )}

        {picked && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* File + preview */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{picked.file.name}</p>
                      <p className="text-xs text-text-muted">
                        {(picked.file.size / 1024).toFixed(1)} KB · {picked.kind.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={clearFile} aria-label="Remove file">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="rounded-xl border bg-white min-h-[180px] flex items-center justify-center overflow-hidden">
                  {picked.previewUrl ? (
                    <img src={picked.previewUrl} alt="Uploaded design preview" className="max-h-[220px] max-w-full p-3" />
                  ) : (
                    <div className="text-center p-6">
                      <p className="text-sm text-text-muted">
                        DXF preview coming soon — our team checks every file by hand before cutting.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  File received — automatic checks will run here once quoting launches.
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Thickness</Label>
                  <Select value={thickness} onValueChange={setThickness}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THICKNESSES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setQuantity(Math.max(1, v));
                    }}
                  />
                </div>

                {submitted ? (
                  <div className="rounded-lg border border-green-600/30 bg-green-600/10 px-3 py-3 text-sm text-green-800">
                    Thanks! Instant quoting is coming soon — this flow is a preview of the ordering experience.
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSubmitted(true);
                      toast.success("Request captured — quoting launches soon.");
                    }}
                  >
                    Get Quote
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
