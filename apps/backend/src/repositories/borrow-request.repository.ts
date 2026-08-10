import type {
  BorrowRequestDto,
  BorrowRequestListQuery,
  BorrowRequestPageDto,
  CreateBorrowRequestDto,
  BorrowHistoryDto,
  BorrowHistoryDetailDto,
  PageDto,
  PageQuery,
  ReviewQueueQuery,
  BorrowHistoryQuery,
} from '@/models/borrow-lifecycle.model.js';
import type { Prisma } from '../../generated/prisma/index.js';

export type BorrowTransaction = Pick<Prisma.TransactionClient, 'assets' | 'asset_issues' | 'borrow_requests' | 'borrow_request_details' | 'borrow_histories' | 'notifications'>;
export interface BorrowActionDetail { id: number; requestId: number; requesterId: number; approvalStatus: string; assetId: number; assetStatus: string; historyId: number | null; }

export interface IBorrowRequestRepository {
  createForRequester(requesterId: number, dto: CreateBorrowRequestDto): Promise<BorrowRequestDto>;
  findPageForRequester(requesterId: number, query: BorrowRequestListQuery): Promise<BorrowRequestPageDto>;
  findDetailForRequester(requestId: number, requesterId: number): Promise<BorrowRequestDto | null>;
  findDetailForReview(requestId: number): Promise<BorrowRequestDto | null>;
  transaction<T>(work: (transaction: BorrowTransaction) => Promise<T>): Promise<T>;
  findActionDetail(detailId: number, transaction: BorrowTransaction): Promise<BorrowActionDetail | null>;
  findPendingDetailIdsForRequest(requestId: number): Promise<number[] | null>;
  approveDetail(detailId: number, reviewerId: number, transaction: BorrowTransaction): Promise<void>;
  rejectDetail(detailId: number, reviewerId: number, reason: string, transaction: BorrowTransaction): Promise<void>;
  createHistory(detailId: number, handedOverBy: number, transaction: BorrowTransaction): Promise<number>;
  findHistoryForAction(historyId: number, transaction: BorrowTransaction): Promise<{ id: number; detailId: number; assetId: number; assetStatus: string; requesterId: number; returnedAt: Date | null } | null>;
  completeReturn(historyId: number, receiverId: number, condition: string, transaction: BorrowTransaction): Promise<void>;
  createConfirmedIssueForDamagedReturn(assetId: number, actorId: number, description: string, transaction: BorrowTransaction): Promise<number>;
  refreshRequestStatus(requestId: number, transaction: BorrowTransaction): Promise<void>;
  withdraw(requestId: number, requesterId: number, transaction: BorrowTransaction): Promise<number[]>;
  listReviewQueue(query: ReviewQueueQuery): Promise<PageDto<BorrowRequestDto>>;
  listCurrent(requesterId: number, query: PageQuery): Promise<PageDto<BorrowHistoryDto>>;
  listHistory(query: BorrowHistoryQuery, requesterId?: number): Promise<PageDto<BorrowHistoryDto>>;
  findHistoryDetail(historyId: number, requesterId?: number): Promise<BorrowHistoryDetailDto | null>;
}
