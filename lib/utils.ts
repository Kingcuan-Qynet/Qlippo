import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_]{2,50})/g) ?? [];
  const unique = new Set(matches.map((m) => m.slice(1).toLowerCase()));
  return Array.from(unique);
}

export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}
