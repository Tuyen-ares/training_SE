import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  MediaCompleteResponseDto,
  MediaEvidenceDto,
  MediaFileRecord,
  MediaPresignInputDto,
  MediaPresignResponseDto,
} from '@/models/media.model.js';
import type { IMediaRepository, MediaTransaction } from '@/repositories/media.repository.js';
import { MediaError } from '@/shared/app-error.js';
import {
  getMediaConfig,
  MEDIA_CACHE_CONTROL,
  mediaPrefix,
  mimeExtension,
  requireMediaConfig,
  type MediaPurpose,
} from '@/shared/media-config.js';
import { buildPublicMediaUrl } from '@/shared/media-url.js';
import {
  MediaStorageError,
  type IMediaStorage,
} from '@/services/media-storage.service.js';

const PURPOSE_PERMISSIONS: Record<MediaPurpose, string[]> = {
  HANDOVER: ['asset.checkout'],
  RETURN: ['asset.checkin'],
  AFTER_REPAIR: ['asset_issue.close'],
  ASSET_IMAGE: ['asset.create', 'asset.update'],
  USER_AVATAR: [],
};

function toStorageError(error: unknown): MediaError {
  if (error instanceof MediaError) return error;
  if (!(error instanceof MediaStorageError)) {
    return new MediaError('MEDIA_STORAGE_UNAVAILABLE');
  }
  if (error.kind === 'NOT_FOUND') return new MediaError('MEDIA_VERIFY_NOT_FOUND', 'Uploaded object was not found');
  if (error.kind === 'ACCESS') return new MediaError('MEDIA_STORAGE_ACCESS', 'Media storage access failed');
  return new MediaError('MEDIA_STORAGE_UNAVAILABLE', 'Media storage verification is temporarily unavailable');
}

function canonicalUrl(record: MediaFileRecord): string {
  const url = buildPublicMediaUrl(record.storage_path);
  if (!url) throw new MediaError('MEDIA_CONFIG_MISSING', 'Media public URL is not configured');
  return url;
}

function mapComplete(record: MediaFileRecord): MediaCompleteResponseDto {
  if (record.upload_status !== 'READY' || !record.uploaded_at) {
    throw new MediaError('MEDIA_INVALID', 'Media is not ready');
  }
  return {
    mediaId: record.id,
    mimeType: record.mime_type,
    sizeBytes: record.size_bytes,
    purpose: record.purpose,
    uploadStatus: 'READY',
    uploadedAt: record.uploaded_at,
    publicUrl: canonicalUrl(record),
  };
}

export class MediaService {
  constructor(
    private readonly repository: IMediaRepository,
    private readonly storage: IMediaStorage,
    private readonly prisma: PrismaClient,
  ) {}

  canPresign(purpose: MediaPurpose, permissionCodes: string[]): boolean {
    const required = PURPOSE_PERMISSIONS[purpose];
    if (!required) return false;
    if (purpose === 'USER_AVATAR') return true;
    return required.some((permission) => permissionCodes.includes(permission));
  }

  async presign(
    input: MediaPresignInputDto,
    uploaderId: number,
    permissionCodes: string[],
  ): Promise<MediaPresignResponseDto> {
    const config = requireMediaConfig();
    if (!this.canPresign(input.purpose, permissionCodes)) {
      throw new MediaError('MEDIA_FORBIDDEN', 'Missing permission for this media purpose');
    }

    const mimeType = input.mimeType.trim().toLowerCase();
    if (!config.allowedMimeTypes.includes(mimeType)) {
      throw new MediaError('MEDIA_INVALID', 'The selected media type is not allowed');
    }
    if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > config.maxImageSizeBytes) {
      throw new MediaError('MEDIA_INVALID', 'The selected media size is not allowed');
    }

    const storagePath = `${mediaPrefix(input.purpose)}/${randomUUID()}.${mimeExtension(mimeType)}`;
    const row = await this.repository.createPending({
      storagePath,
      mimeType,
      sizeBytes: input.sizeBytes,
      purpose: input.purpose,
      uploadedBy: uploaderId,
    });

    try {
      const signed = await this.storage.presignPut({ storagePath, mimeType });
      return {
        mediaId: row.id,
        uploadUrl: signed.uploadUrl,
        expiresAt: signed.expiresAt,
        requiredHeaders: {
          'Content-Type': mimeType,
          'Cache-Control': MEDIA_CACHE_CONTROL,
          'If-None-Match': '*',
        },
      };
    } catch (error) {
      try {
        await this.repository.delete(row.id);
      } catch {
        // The pending row is intentionally left for manual stale-PENDING cleanup.
      }
      throw toStorageError(error);
    }
  }

  async complete(mediaId: number, uploaderId: number): Promise<MediaCompleteResponseDto> {
    requireMediaConfig();
    const row = await this.repository.findById(mediaId);
    if (!row) throw new MediaError('MEDIA_NOT_FOUND', 'Media not found');
    if (row.uploaded_by !== uploaderId) throw new MediaError('MEDIA_FORBIDDEN', 'You do not own this media');
    if (row.upload_status === 'READY') return mapComplete(row);
    if (row.upload_status !== 'PENDING') throw new MediaError('MEDIA_INVALID', 'Media is not in a completable state');

    let head;
    try {
      head = await this.storage.headObject(row.storage_path);
    } catch (error) {
      throw toStorageError(error);
    }

    const matches =
      head.contentLength === row.size_bytes &&
      head.contentType === row.mime_type &&
      head.cacheControl === MEDIA_CACHE_CONTROL;
    if (!matches) {
      try {
        await this.storage.deleteObject(row.storage_path);
      } catch {
        // Keep PENDING so manual cleanup can retry if invalid-upload cleanup failed.
      }
      throw new MediaError('MEDIA_METADATA_MISMATCH', 'Uploaded media metadata does not match the presign request');
    }

    const ready = await this.repository.markReady(mediaId, new Date());
    if (!ready) throw new MediaError('MEDIA_NOT_FOUND', 'Media not found');
    if (ready.upload_status === 'READY') return mapComplete(ready);
    throw new MediaError('MEDIA_INVALID', 'Media could not be completed');
  }

  async cancel(mediaId: number, uploaderId: number): Promise<void> {
    const row = await this.repository.findById(mediaId);
    if (!row) throw new MediaError('MEDIA_NOT_FOUND', 'Media not found');
    if (row.uploaded_by !== uploaderId) throw new MediaError('MEDIA_FORBIDDEN', 'You do not own this media');
    if (row.linked_at) throw new MediaError('MEDIA_ALREADY_LINKED', 'Linked media cannot be cancelled');

    let result: 'DELETED' | 'NOT_FOUND';
    try {
      result = await this.storage.deleteObject(row.storage_path);
    } catch (error) {
      throw toStorageError(error);
    }
    if (result === 'DELETED' || result === 'NOT_FOUND') await this.repository.delete(mediaId);
  }

  async claimForPurpose(
    mediaIds: number[] | undefined,
    uploaderId: number,
    purpose: MediaPurpose,
    transaction: MediaTransaction,
  ): Promise<number[]> {
    const ids = [...new Set(mediaIds ?? [])];
    const max = getMediaConfig()?.maxEvidenceImageCount ?? 10;
    if (ids.length > max) throw new MediaError('MEDIA_INVALID', `At most ${max} media files may be attached`);
    for (const id of ids) {
      if (!Number.isInteger(id) || id <= 0) throw new MediaError('MEDIA_INVALID', 'Media IDs must be positive integers');
      const claimed = await this.repository.claimReady(id, uploaderId, purpose, transaction);
      if (!claimed) throw new MediaError('MEDIA_INVALID', 'Media is missing, not ready, already linked or has the wrong purpose');
    }
    return ids;
  }

  async claimHandoverEvidence(
    historyId: number,
    mediaIds: number[] | undefined,
    uploaderId: number,
    transaction: MediaTransaction,
  ): Promise<void> {
    const ids = await this.claimForPurpose(mediaIds, uploaderId, 'HANDOVER', transaction);
    for (const mediaId of ids) await this.repository.createHandoverEvidence(historyId, mediaId, transaction);
  }

  async claimReturnEvidence(
    historyId: number,
    mediaIds: number[] | undefined,
    uploaderId: number,
    transaction: MediaTransaction,
  ): Promise<void> {
    const ids = await this.claimForPurpose(mediaIds, uploaderId, 'RETURN', transaction);
    for (const mediaId of ids) await this.repository.createReturnEvidence(historyId, mediaId, transaction);
  }

  async claimRepairEvidence(
    issueId: number,
    mediaIds: number[] | undefined,
    uploaderId: number,
    transaction: MediaTransaction,
  ): Promise<void> {
    const ids = await this.claimForPurpose(mediaIds, uploaderId, 'AFTER_REPAIR', transaction);
    for (const mediaId of ids) await this.repository.createRepairEvidence(issueId, mediaId, transaction);
  }

  async claimPrimaryImage(
    mediaId: number,
    uploaderId: number,
    purpose: 'ASSET_IMAGE' | 'USER_AVATAR',
    transaction: MediaTransaction,
  ): Promise<void> {
    await this.claimForPurpose([mediaId], uploaderId, purpose, transaction);
  }

  toEvidence(record: MediaFileRecord): MediaEvidenceDto {
    if (record.upload_status !== 'READY' || !record.uploaded_at) {
      throw new MediaError('MEDIA_INVALID', 'Referenced media is not ready');
    }
    return {
      mediaId: record.id,
      mimeType: record.mime_type,
      sizeBytes: record.size_bytes,
      uploadedAt: record.uploaded_at,
      publicUrl: canonicalUrl(record),
    };
  }

  get storageClient(): IMediaStorage {
    return this.storage;
  }

  get database(): PrismaClient {
    return this.prisma;
  }
}
