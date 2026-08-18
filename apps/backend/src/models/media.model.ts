import type { MediaPurpose } from '@/shared/media-config.js';

export type MediaUploadStatus = 'PENDING' | 'READY';

export interface MediaFileRecord {
  id: number;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  purpose: MediaPurpose;
  upload_status: MediaUploadStatus;
  uploaded_by: number;
  created_at: Date;
  uploaded_at: Date | null;
  linked_at: Date | null;
}

export interface MediaEvidenceDto {
  mediaId: number;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
  publicUrl: string;
}

export interface MediaPresignInputDto {
  purpose: MediaPurpose;
  mimeType: string;
  sizeBytes: number;
}

export interface MediaPresignResponseDto {
  mediaId: number;
  uploadUrl: string;
  expiresAt: Date;
  requiredHeaders: {
    'Content-Type': string;
    'Cache-Control': string;
    'If-None-Match': '*';
  };
}

export interface MediaCompleteResponseDto {
  mediaId: number;
  mimeType: string;
  sizeBytes: number;
  purpose: MediaPurpose;
  uploadStatus: 'READY';
  uploadedAt: Date;
  publicUrl: string;
}
