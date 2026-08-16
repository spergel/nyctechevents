/** Canonical public origin for SEO, feeds, and absolute URLs. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://tech.somethingtodo.nyc'
).replace(/\/$/, '');

export function absoluteUrl(path = ''): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
