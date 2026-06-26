/**
 * Appends a cache-busting timestamp to a URL if it's a Firebase Storage URL.
 * This helps prevent CORS issues caused by browser cache "pollution" where
 * the browser tries to reuse a cached version of an image that was loaded
 * without the appropriate CORS headers.
 */
// Generate a session-stable timestamp to avoid flickering while still bypassing potential old cache
const sessionTimestamp = new Date().getTime();

/**
 * Appends a cache-busting timestamp to a URL if it's a Firebase Storage URL.
 * This helps prevent CORS issues caused by browser cache "pollution" where
 * the browser tries to reuse a cached version of an image that was loaded
 * without the appropriate CORS headers.
 *
 * We use a stable sessionTimestamp to prevent constant re-renders/flickering
 * while the user interacts with elements (like dragging in Konva).
 */
export const getCacheBustedUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  // Only apply to Firebase Storage URLs or other external assets
  if (url.includes('firebasestorage.googleapis.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${sessionTimestamp}`;
  }

  return url;
};
