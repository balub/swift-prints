import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a duration expressed in hours.
 * - If under 1 hour, returns whole minutes (e.g. 0.1 -> "6 min")
 * - If 1 hour or more, returns hours with one decimal (e.g. 1.5 -> "1.5h")
 */
export function formatDurationFromHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return "";
  }

  if (hours > 0 && hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }

  return `${hours.toFixed(1)}h`;
}
