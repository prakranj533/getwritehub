import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 60);
}

/**
 * Converts any timestamp format to a JS Date:
 * - Firestore Admin SDK JSON: { _seconds, _nanoseconds }
 * - Firestore Client SDK Timestamp: has .toDate() method
 * - ISO string or number
 * - Already a Date
 */
export function toDate(value: any): Date | null {
  if (!value) return null;
  // Firestore Admin SDK serialized timestamp
  if (typeof value === "object" && "_seconds" in value) {
    return new Date(value._seconds * 1000);
  }
  // Firestore Client SDK Timestamp (has toDate method)
  if (typeof value?.toDate === "function") {
    return value.toDate();
  }
  // Firestore client toMillis
  if (typeof value?.toMillis === "function") {
    return new Date(value.toMillis());
  }
  // Already a Date, ISO string, or epoch number
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: any): string {
  const d = toDate(date);
  if (!d) return "Unknown date";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeTime(date: any): string {
  const then = toDate(date);
  if (!then) return "Just now";
  const now = new Date();
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
