import type { MediaEvidenceDto } from '@/models/media.model.js';

export type BorrowRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_APPROVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type BorrowDetailStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReviewQueueApprovalStatus = 'ALL' | BorrowDetailStatus;

export interface CreateBorrowRequestDto {
  note: string;
  items: Array<{
    assetId: number;
    expectedReturnDate: Date;
  }>;
}

export interface BorrowRequestListItemDto {
  id: number;
  status: BorrowRequestStatus;
  createdAt: Date;
  detailCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface BorrowRequestPageDto {
  items: BorrowRequestListItemDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface BorrowRequestDetailDto {
  id: number;
  asset: {
    id: number;
    assetCode: string;
    serialNumber: string | null;
    qrCode: string;
    imageUrl: string | null;
    status: string;
    model: { id: number; name: string };
  };
  expectedReturnDate: string;
  approvalStatus: BorrowDetailStatus;
  approvedBy: { id: number; name: string } | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
}

export interface BorrowRequesterDto {
  id: number;
  userCode: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  department: { id: number; name: string } | null;
}
export interface BorrowRequestDto {
  id: number;
  requester: BorrowRequesterDto;
  status: BorrowRequestStatus;
  note: string;
  createdAt: Date;
  details: BorrowRequestDetailDto[];
}

export interface BorrowRequestListQuery {
  page: number;
  pageSize: number;
  status?: BorrowRequestStatus;
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

export interface ReviewQueueQuery extends PageQuery {
  approvalStatus: ReviewQueueApprovalStatus;
}

export type BorrowHistoryState = 'ALL' | 'CURRENT' | 'RETURNED';

export interface BorrowHistoryQuery extends PageQuery {
  state: BorrowHistoryState;
}

export type BorrowingActivityState = 'CURRENT' | 'RETURNED';

export interface BorrowingActivityQuery extends PageQuery {
  state: BorrowingActivityState;
}

export interface PageDto<T> extends PageQuery {
  items: T[];
  total: number;
}

export interface HandoverQueueItemDto {
  detailId: number;
  asset: {
    id: number;
    assetCode: string;
    serialNumber: string | null;
    qrCode: string;
    imageUrl: string | null;
    status: string;
    model: { id: number; name: string };
  };
  expectedReturnDate: string;
  approvedBy: { id: number; name: string } | null;
  approvedAt: Date | null;
}
export interface HandoverQueueRequestDto {
  requestId: number;
  requestCreatedAt: Date;
  requester: BorrowRequesterDto;
  pendingCount: number;
  approvedCount: number;
  handedOverCount: number;
  items: HandoverQueueItemDto[];
}
export interface ReturnQueueRequestDto {
  requestId: number;
  requestCreatedAt: Date;
  requester: BorrowRequesterDto;
  pendingCount: number;
  returnedCount: number;
  items: BorrowHistoryDto[];
}

export interface BorrowingActivityRequestGroupDto {
  requestId: number;
  requestCreatedAt: Date;
  requester: BorrowRequesterDto;
  itemCount: number;
  items: BorrowHistoryDto[];
}

export type ApproveAllFailureReason = 'ASSET_NOT_AVAILABLE' | 'DETAIL_NOT_PENDING';

export interface ApproveAllResultDto {
  requestId: number;
  approved: Array<{ detailId: number; approvalStatus: 'APPROVED' }>;
  skipped: Array<{
    detailId: number;
    approvalStatus: 'PENDING';
    reason: ApproveAllFailureReason;
  }>;
}

export interface BorrowHistoryDto {
  id: number;
  detailId: number;
  asset: {
    id: number;
    assetCode: string;
    serialNumber: string | null;
    qrCode: string;
    imageUrl: string | null;
    status: string;
    model: { id: number; name: string };
  };
  borrower: { id: number; userCode: string; name: string; avatarUrl: string | null };
  expectedReturnDate: string;
  handedOverBy: { id: number; name: string } | null;
  borrowedAt: Date;
  receivedBy: { id: number; name: string } | null;
  returnedAt: Date | null;
  returnCondition: string | null;
  handoverEvidence: MediaEvidenceDto[];
  returnEvidence: MediaEvidenceDto[];
}

export interface BorrowHistoryDetailDto {
  id: number;
  request: {
    id: number;
    status: BorrowRequestStatus;
    note: string;
    createdAt: Date;
    requester: {
      id: number;
      userCode: string;
      name: string;
      email: string;
      avatarUrl: string | null;
      department: { id: number; name: string } | null;
    };
  };
  asset: BorrowHistoryDto['asset'];
  expectedReturnDate: string;
  approvalStatus: BorrowDetailStatus;
  approvedBy: { id: number; name: string } | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  handedOverBy: { id: number; name: string } | null;
  borrowedAt: Date;
  receivedBy: { id: number; name: string } | null;
  returnedAt: Date | null;
  returnCondition: string | null;
  handoverEvidence: MediaEvidenceDto[];
  returnEvidence: MediaEvidenceDto[];
}
