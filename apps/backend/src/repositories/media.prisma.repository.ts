import type { Prisma, PrismaClient } from '../../generated/prisma/index.js';
import type { MediaFileRecord } from '@/models/media.model.js';
import type { MediaPurpose } from '@/shared/media-config.js';
import type {
  CreatePendingMediaData,
  IMediaRepository,
  MediaTransaction,
} from '@/repositories/media.repository.js';

type MediaDatabase = PrismaClient | MediaTransaction;

function toDatabasePurpose(purpose: MediaPurpose): string {
  return purpose.toLowerCase();
}

function fromDatabasePurpose(purpose: string): MediaPurpose {
  return purpose.toUpperCase() as MediaPurpose;
}

function toDatabaseStatus(status: string): 'PENDING' | 'READY' {
  return status.toUpperCase() as 'PENDING' | 'READY';
}

function mapMedia(row: any): MediaFileRecord {
  return {
    id: row.id,
    storage_path: row.storage_path,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    purpose: fromDatabasePurpose(row.purpose),
    upload_status: toDatabaseStatus(row.upload_status),
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
    uploaded_at: row.uploaded_at,
    linked_at: row.linked_at,
  };
}

export class PrismaMediaRepository implements IMediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private database(transaction?: MediaTransaction): MediaDatabase {
    return transaction ?? this.prisma;
  }

  async createPending(data: CreatePendingMediaData): Promise<MediaFileRecord> {
    const row = await this.prisma.media_files.create({
      data: {
        storage_path: data.storagePath,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        purpose: toDatabasePurpose(data.purpose) as any,
        upload_status: 'pending',
        uploaded_by: data.uploadedBy,
      },
    });
    return mapMedia(row);
  }

  async findById(id: number, transaction?: MediaTransaction): Promise<MediaFileRecord | null> {
    const row = await this.database(transaction).media_files.findUnique({ where: { id } });
    return row ? mapMedia(row) : null;
  }

  async markReady(id: number, uploadedAt: Date, transaction?: MediaTransaction): Promise<MediaFileRecord | null> {
    const database = this.database(transaction);
    await database.media_files.updateMany({
      where: { id, upload_status: 'pending' },
      data: { upload_status: 'ready', uploaded_at: uploadedAt },
    });
    const row = await database.media_files.findUnique({ where: { id } });
    return row ? mapMedia(row) : null;
  }

  async claimReady(
    id: number,
    uploaderId: number,
    purpose: MediaPurpose,
    transaction: MediaTransaction,
  ): Promise<boolean> {
    const result = await transaction.media_files.updateMany({
      where: {
        id,
        uploaded_by: uploaderId,
        purpose: toDatabasePurpose(purpose) as any,
        upload_status: 'ready',
        linked_at: null,
      },
      data: { linked_at: new Date() },
    });
    return result.count === 1;
  }

  createHandoverEvidence(historyId: number, mediaId: number, transaction: MediaTransaction): Promise<void> {
    return transaction.handover_evidence.create({
      data: { borrow_history_id: historyId, media_file_id: mediaId },
      select: { media_file_id: true },
    }).then(() => undefined);
  }

  createReturnEvidence(historyId: number, mediaId: number, transaction: MediaTransaction): Promise<void> {
    return transaction.return_evidence.create({
      data: { borrow_history_id: historyId, media_file_id: mediaId },
      select: { media_file_id: true },
    }).then(() => undefined);
  }

  createRepairEvidence(issueId: number, mediaId: number, transaction: MediaTransaction): Promise<void> {
    return transaction.repair_evidence.create({
      data: { asset_issue_id: issueId, media_file_id: mediaId },
      select: { media_file_id: true },
    }).then(() => undefined);
  }

  async delete(id: number, transaction?: MediaTransaction): Promise<void> {
    await this.database(transaction).media_files.delete({ where: { id } });
  }
}
