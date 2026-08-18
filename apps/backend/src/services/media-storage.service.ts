import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MediaError } from '@/shared/app-error.js';
import { getMediaConfig, MEDIA_CACHE_CONTROL, requireMediaConfig } from '@/shared/media-config.js';

export interface MediaHeadMetadata {
  contentLength: number;
  contentType: string;
  cacheControl: string;
}

export type MediaStorageFailureKind = 'NOT_FOUND' | 'ACCESS' | 'TRANSIENT' | 'UNKNOWN';

export class MediaStorageError extends Error {
  constructor(public readonly kind: MediaStorageFailureKind, message = 'Media storage operation failed') {
    super(message);
    this.name = 'MediaStorageError';
  }
}

export interface IMediaStorage {
  presignPut(input: {
    storagePath: string;
    mimeType: string;
  }): Promise<{ uploadUrl: string; expiresAt: Date }>;
  headObject(storagePath: string): Promise<MediaHeadMetadata>;
  deleteObject(storagePath: string): Promise<'DELETED' | 'NOT_FOUND'>;
}

function failureKind(error: unknown): MediaStorageFailureKind {
  const value = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
    Code?: string;
  };
  const status = value.$metadata?.httpStatusCode;
  const code = `${value.name || ''} ${value.Code || ''}`.toLowerCase();
  if (status === 404 || code.includes('nosuchkey') || code.includes('notfound')) return 'NOT_FOUND';
  if (status === 401 || status === 403 || code.includes('accessdenied') || code.includes('forbidden')) return 'ACCESS';
  if (status === 408 || status === 425 || status === 429 || (status !== undefined && status >= 500)) return 'TRANSIENT';
  return 'UNKNOWN';
}

export class S3MediaStorage implements IMediaStorage {
  private client: S3Client | null = null;

  private getClient(): { client: S3Client; bucket: string; expiresIn: number } {
    const config = requireMediaConfig();
    if (!this.client) {
      this.client = new S3Client({
        region: config.region,
        ...(config.accessKeyId && config.secretAccessKey
          ? { credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }
          : {}),
      });
    }
    return { client: this.client, bucket: config.bucket, expiresIn: config.presignedPutExpiresSeconds };
  }

  async presignPut(input: { storagePath: string; mimeType: string }): Promise<{ uploadUrl: string; expiresAt: Date }> {
    const { client, bucket, expiresIn } = this.getClient();
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: input.storagePath,
        ContentType: input.mimeType,
        CacheControl: MEDIA_CACHE_CONTROL,
        IfNoneMatch: '*',
      });
      const uploadUrl = await getSignedUrl(client, command, { expiresIn });
      return { uploadUrl, expiresAt: new Date(Date.now() + expiresIn * 1000) };
    } catch (error) {
      if (error instanceof MediaError) throw error;
      throw new MediaStorageError(failureKind(error));
    }
  }

  async headObject(storagePath: string): Promise<MediaHeadMetadata> {
    const { client, bucket } = this.getClient();
    try {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: storagePath }));
      if (result.ContentLength === undefined || !result.ContentType || result.CacheControl === undefined) {
        throw new MediaStorageError('UNKNOWN');
      }
      return {
        contentLength: result.ContentLength,
        contentType: result.ContentType,
        cacheControl: result.CacheControl,
      };
    } catch (error) {
      if (error instanceof MediaStorageError) throw error;
      throw new MediaStorageError(failureKind(error));
    }
  }

  async deleteObject(storagePath: string): Promise<'DELETED' | 'NOT_FOUND'> {
    const { client, bucket } = this.getClient();
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storagePath }));
      return 'DELETED';
    } catch (error) {
      if (error instanceof MediaStorageError) throw error;
      const kind = failureKind(error);
      if (kind === 'NOT_FOUND') return 'NOT_FOUND';
      throw new MediaStorageError(kind);
    }
  }
}

export function isMediaConfigured(): boolean {
  return getMediaConfig() !== null;
}
