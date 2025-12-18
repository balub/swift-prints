import { useState } from "react";

const ContextBanner = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="fixed bottom-4 right-4 z-40 text-xs text-muted-foreground"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Collapsed, minimal state when not hovered */}
      {!isHovered && (
        <div className="w-72 rounded-lg border border-border bg-background/90 px-6 py-4 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Platform Preview · autofab
          </span>
        </div>
      )}

      {/* Expanded card on hover */}
      {isHovered && (
        <div className="w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-lg p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Platform Preview
            </span>
          </div>

          {/* Main description */}
          <p className="text-[13px] text-foreground mb-3">
            autofab is an in-progress, local-first manufacturing platform,
            currently in beta.
          </p>

          <ul className="list-disc list-inside space-y-1.5 text-[12px] text-muted-foreground mb-4">
            <li>
              This interface shows a live production workflow for 3D printing.
            </li>
            <li>
              The full platform extends this across cities, makers, and
              operational tooling.
            </li>
          </ul>

          {/* Built and maintained by */}
          <div className="border-t border-border pt-3 mt-1 mb-2">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">
              Built and maintained by Balu Babu
            </p>
            <p className="text-[12px] text-muted-foreground space-x-2">
              <a
                href="https://github.com/balub"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                GitHub
              </a>
              <span>·</span>
              <a
                href="https://x.com/AskBaluBabu"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Twitter
              </a>
            </p>
          </div>

          {/* Early collaboration */}
          <div className="border-t border-border pt-3 mt-1">
            <p className="text-[11px] font-medium text-muted-foreground mb-2">
              Early collaboration and beta testing with
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://pcbcupid.com/"
                target="_blank"
                rel="noreferrer"
                className="flex h-8 flex-none items-center justify-center rounded border border-border/70 bg-muted/40 px-3 underline-offset-2 hover:underline"
              >
                <span className="text-[11px] tracking-wide text-muted-foreground">
                  PCB Cupid
                </span>
              </a>
              <a
                href="https://absurd.industries/"
                target="_blank"
                rel="noreferrer"
                className="flex h-8 flex-none items-center justify-center rounded border border-border/70 bg-muted/40 px-3 underline-offset-2 hover:underline"
              >
                <span className="text-[11px] tracking-wide text-muted-foreground">
                  Absurd Industries
                </span>
              </a>
            </div>
          </div>

          {/* CTA */}
          <div className="border-t border-border pt-3 mt-3 space-y-2">
            <p className="text-[12px] text-muted-foreground">
              You interested in contributing or beta testing the platform, reach
              out at{" "}
              <a
                href="mailto:balu@usevader.dev"
                className="underline-offset-2 hover:underline"
              >
                balu@usevader.dev
              </a>
              .
            </p>
            <p className="text-[12px] text-muted-foreground">
              <a
                href="https://github.com/balub/swift-prints"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Star the full project on GitHub
              </a>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export { ContextBanner };
