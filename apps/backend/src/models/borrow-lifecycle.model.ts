export type BorrowRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_APPROVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type BorrowDetailStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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

export interface BorrowRequestDto {
  id: number;
  requester: {
    id: number;
    userCode: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    department: { id: number; name: string } | null;
  };
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
  approvalStatus: BorrowDetailStatus;
}

export type BorrowHistoryState = 'ALL' | 'CURRENT' | 'RETURNED';

export interface BorrowHistoryQuery extends PageQuery {
  state: BorrowHistoryState;
}

export interface PageDto<T> extends PageQuery {
  items: T[];
  total: number;
}

export interface HandoverQueueItemDto {
  detailId: number;
  requestId: number;
  requestCreatedAt: Date;
  requester: {
    id: number;
    userCode: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    department: { id: number; name: string } | null;
  };
  asset: {
    id: number;
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
  borrower: { id: number; userCode: string; name: string; avatarUrl: string | null };
  expectedReturnDate: string;
  handedOverBy: { id: number; name: string } | null;
  borrowedAt: Date;
  receivedBy: { id: number; name: string } | null;
  returnedAt: Date | null;
  returnCondition: string | null;
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
}
