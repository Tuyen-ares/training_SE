export type BorrowRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_APPROVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type BorrowDetailStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreateBorrowRequestDto {
  note?: string | null;
  items: Array<{
    assetId: number;
    expectedReturnDate: Date;
    note?: string | null;
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
    serialNumber: string | null;
    qrCode: string;
    imageUrl: string | null;
    status: string;
    model: { id: number; name: string };
  };
  expectedReturnDate: string;
  note: string | null;
  approvalStatus: BorrowDetailStatus;
  approvedBy: { id: number; name: string } | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
}

export interface BorrowRequestDto {
  id: number;
  requester: { id: number; name: string; avatarUrl: string | null };
  status: BorrowRequestStatus;
  note: string | null;
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

export interface PageDto<T> extends PageQuery {
  items: T[];
  total: number;
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
    serialNumber: string | null;
    qrCode: string;
    imageUrl: string | null;
    status: string;
    model: { id: number; name: string };
  };
  borrower: { id: number; name: string; avatarUrl: string | null };
  expectedReturnDate: string;
  handedOverBy: { id: number; name: string } | null;
  borrowedAt: Date;
  receivedBy: { id: number; name: string } | null;
  returnedAt: Date | null;
  returnCondition: string | null;
}
