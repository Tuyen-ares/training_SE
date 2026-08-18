export function buildPublicMediaUrl(storagePath: string): string | null {
  const base = process.env.PUBLIC_MEDIA_BASE_URL?.trim().replace(/\/+$/, '');
  if (!base) return null;
  const encodedPath = storagePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  return `${base}/${encodedPath}`;
}
