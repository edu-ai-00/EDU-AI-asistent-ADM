/**
 * YouTube URL parsing and embed utilities.
 *
 * Supports:
 *  - youtube.com/watch?v=ID
 *  - youtu.be/ID
 *  - youtube.com/embed/ID
 *  - youtube.com/shorts/ID
 */

const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
];

/** Extract YouTube video ID from various URL formats. Returns null if invalid. */
export function parseYouTubeId(url: string): string | null {
  if (!url) return null;
  for (const pattern of YT_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Build a privacy-enhanced embed URL with no related videos or autoplay. */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/** Convenience check — true when the URL contains a recognisable YouTube video ID. */
export function isValidYouTubeUrl(url: string): boolean {
  return parseYouTubeId(url) !== null;
}
