import { useEffect, useState } from "react";
import { parse, type Font } from "opentype.js";
import fontUrl from "@/assets/fonts/Pacifico-Regular.ttf";

/** Loads the bundled Pacifico font once for the name-sign generator. */
export function useSignFont(): { font: Font | null; error: string | null } {
  const [font, setFont] = useState<Font | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(fontUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        if (!cancelled) setFont(parse(buffer));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the sign font.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { font, error };
}
