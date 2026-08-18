import { MediaError } from '@/shared/app-error.js';

export const MEDIA_CACHE_CONTROL = 'public,max-age=31536000,immutable';

export type MediaPurpose =
  | 'HANDOVER'
  | 'RETURN'
  | 'AFTER_REPAIR'
  | 'ASSET_IMAGE'
  | 'USER_AVATAR';

export const MEDIA_PURPOSES: MediaPurpose[] = [
  'HANDOVER',
  'RETURN',
  'AFTER_REPAIR',
  'ASSET_IMAGE',
  'USER_AVATAR',
];

export interface MediaConfig {
  region: string;
  bucket: string;
  publicBaseUrl: string;
  allowedMimeTypes: string[];
  maxImageSizeBytes: number;
  maxEvidenceImageCount: number;
  presignedPutExpiresSeconds: number;
  accessKeyId?: string;
  secretAccessKey?: string;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readOptionalConfig(): MediaConfig | null {
  const region = process.env.AWS_REGION?.trim();
  const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
  const publicBaseUrl = process.env.PUBLIC_MEDIA_BASE_URL?.trim();

  if (!region || !bucket || !publicBaseUrl) return null;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() || undefined;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() || undefined;
  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new MediaError(
      'MEDIA_CONFIG_MISSING',
      'Media storage credentials must be configured as a complete pair',
    );
  }

  try {
    const parsedUrl = new URL(publicBaseUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported URL protocol');
  } catch {
    throw new MediaError('MEDIA_CONFIG_MISSING', 'PUBLIC_MEDIA_BASE_URL must be an absolute URL');
  }

  return {
    region,
    bucket,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
    allowedMimeTypes: (process.env.MEDIA_ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    maxImageSizeBytes: parsePositiveInteger(process.env.MEDIA_MAX_IMAGE_SIZE_BYTES, 10 * 1024 * 1024),
    maxEvidenceImageCount: parsePositiveInteger(process.env.MEDIA_MAX_EVIDENCE_IMAGE_COUNT, 10),
    presignedPutExpiresSeconds: Math.min(
      parsePositiveInteger(process.env.MEDIA_PRESIGNED_PUT_EXPIRES_SECONDS, 300),
      900,
    ),
    ...(accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : {}),
  };
}

export function getMediaConfig(): MediaConfig | null {
  return readOptionalConfig();
}

export function requireMediaConfig(): MediaConfig {
  const config = readOptionalConfig();
  if (!config) {
    throw new MediaError(
      'MEDIA_CONFIG_MISSING',
      'Media storage is not configured. Set AWS_REGION, AWS_S3_BUCKET_NAME and PUBLIC_MEDIA_BASE_URL.',
    );
  }
  return config;
}

export function validateProductionMediaConfig(): void {
  if (process.env.NODE_ENV === 'production') requireMediaConfig();
}

export function mimeExtension(mimeType: string): string {
  const extensionByMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return extensionByMime[mimeType.toLowerCase()] || 'bin';
}

export function mediaPrefix(purpose: MediaPurpose, now = new Date()): string {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  if (purpose === 'HANDOVER') return `evidence/handover/${year}/${month}`;
  if (purpose === 'RETURN') return `evidence/return/${year}/${month}`;
  if (purpose === 'AFTER_REPAIR') return `evidence/repair/${year}/${month}`;
  if (purpose === 'ASSET_IMAGE') return 'asset-images';
  return 'user-avatars';
}

