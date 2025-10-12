/**
 * Loading Spinner Component
 * Reusable loading indicator with different sizes and variants
 */
import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "muted";
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const variantClasses = {
  default: "text-foreground",
  primary: "text-primary",
  muted: "text-muted-foreground",
};

export function LoadingSpinner({
  size = "md",
  variant = "default",
  className,
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2
          className={cn(
            "animate-spin",
            sizeClasses[size],
            variantClasses[variant]
          )}
        />
        {text && (
          <p className={cn("text-sm", variantClasses[variant])}>{text}</p>
        )}
      </div>
    </div>
  );
}

export default LoadingSpinner;
