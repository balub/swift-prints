import { useEffect, useState } from "react";

// Versioned key so updates reappear even if an older banner was dismissed
const DISMISS_KEY = "swiftPrintsContextBannerDismissed_v2";

const ContextBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DISMISS_KEY);
      if (stored === "true") {
        setDismissed(true);
      }
    } catch {
      // Ignore storage errors and show banner by default
    }
  }, []);

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setExpanded(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Ignore storage errors
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 text-xs text-muted-foreground">
      {/* Collapsed pill */}
      {!expanded && (
        <button
          type="button"
          onClick={handleToggle}
          className="rounded-full border border-border bg-background/90 px-3 py-1 shadow-sm hover:bg-background transition-colors"
        >
          Swift Prints · Preview
        </button>
      )}

      {/* Expanded card */}
      {expanded && (
        <div className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-lg p-3 sm:p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Platform preview
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>

          {/* A. What is this? */}
          <p className="text-xs text-foreground mb-2">
            This interface is a focused deployment of the Swift Prints platform.
          </p>

          {/* B. What does that mean? */}
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground mb-3">
            <li>
              This view covers a narrow slice of the end-to-end print flow.
            </li>
            <li>
              The full platform coordinates more locations, partners, and
              operational tooling behind the scenes.
            </li>
          </ul>

          {/* C. Who's involved? */}
          <div className="border-t border-border pt-2 mt-1">
            <p className="text-[11px] font-medium text-muted-foreground mb-2">
              Built in collaboration with
            </p>
            <div className="flex items-center gap-2">
              {/* Swift Prints wordmark */}
              <div className="flex h-7 flex-none items-center justify-center rounded border border-border/70 bg-muted/40 px-3">
                <span className="text-[11px] tracking-wide text-muted-foreground">
                  Swift Prints
                </span>
              </div>

              {/* PCB Cupid placeholder logo */}
              <div className="flex h-7 flex-none items-center justify-center rounded border border-border/70 bg-muted/40 px-3">
                <span className="text-[11px] tracking-wide text-muted-foreground">
                  PCB Cupid
                </span>
              </div>

              {/* Generic partner placeholder */}
              <div className="flex h-7 flex-none items-center justify-center rounded border border-border/70 bg-muted/40 px-3">
                <span className="text-[11px] tracking-wide text-muted-foreground">
                  Partner
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { ContextBanner };
