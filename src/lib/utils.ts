import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Strip HTML tags from a string and return plain text
 */
export function stripHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, " ");
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

export function isBase64Image(str: string): boolean {
  return str.startsWith("data:image/");
}
