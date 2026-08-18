import type { Prisma } from '../../generated/prisma/index.js';
import type { MediaFileRecord } from '@/models/media.model.js';
import type { MediaPurpose } from '@/shared/media-config.js';

export type MediaTransaction = Prisma.TransactionClient;

export interface CreatePendingMediaData {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  purpose: MediaPurpose;
  uploadedBy: number;
}

export interface IMediaRepository {
  createPending(data: CreatePendingMediaData): Promise<MediaFileRecord>;
  findById(id: number, transaction?: MediaTransaction): Promise<MediaFileRecord | null>;
  markReady(id: number, uploadedAt: Date, transaction?: MediaTransaction): Promise<MediaFileRecord | null>;
  claimReady(
    id: number,
    uploaderId: number,
    purpose: MediaPurpose,
    transaction: MediaTransaction,
  ): Promise<boolean>;
  createHandoverEvidence(
    historyId: number,
    mediaId: number,
    transaction: MediaTransaction,
  ): Promise<void>;
  createReturnEvidence(
    historyId: number,
    mediaId: number,
    transaction: MediaTransaction,
  ): Promise<void>;
  createRepairEvidence(
    issueId: number,
    mediaId: number,
    transaction: MediaTransaction,
  ): Promise<void>;
  delete(id: number, transaction?: MediaTransaction): Promise<void>;
}
