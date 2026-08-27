import type {
  BorrowRequestDto,
  BorrowRequestListQuery,
  BorrowRequestPageDto,
  CreateBorrowRequestDto,
  BorrowHistoryDto,
  BorrowHistoryDetailDto,
  HandoverQueueRequestDto,
  ReturnQueueRequestDto,
  BorrowingActivityRequestGroupDto,
  PageDto,
  PageQuery,
  ReviewQueueQuery,
  BorrowHistoryQuery,
  BorrowingActivityQuery,
} from '@/models/borrow-lifecycle.model.js';
import type { Prisma } from '../../generated/prisma/index.js';

export type BorrowTransaction = Pick<
  Prisma.TransactionClient,
  | 'assets'
  | 'borrow_requests'
  | 'borrow_request_details'
  | 'borrow_histories'
  | 'users'
>;
export interface BorrowActionDetail {
  id: number;
  requestId: number;
  requesterId: number;
  requesterName: string;
  approvalStatus: string;
  assetId: number;
  assetCode: string;
  assetModelName: string;
  expectedReturnDate: Date;
  assetStatus: string;
  historyId: number | null;
}

export interface IBorrowRequestRepository {
  createForRequester(
    requesterId: number,
    dto: CreateBorrowRequestDto,
    transaction: BorrowTransaction,
  ): Promise<BorrowRequestDto>;
  findPageForRequester(requesterId: number, query: BorrowRequestListQuery): Promise<BorrowRequestPageDto>;
  findDetailForRequester(requestId: number, requesterId: number): Promise<BorrowRequestDto | null>;
  findDetailForReview(requestId: number): Promise<BorrowRequestDto | null>;
  findActionDetail(detailId: number, transaction: BorrowTransaction): Promise<BorrowActionDetail | null>;
  findPendingDetailIdsForRequest(requestId: number): Promise<number[] | null>;
  approveDetail(detailId: number, reviewerId: number, transaction: BorrowTransaction): Promise<void>;
  rejectDetail(detailId: number, reviewerId: number, reason: string, transaction: BorrowTransaction): Promise<void>;
  createHistory(detailId: number, handedOverBy: number, transaction: BorrowTransaction): Promise<number>;
  findHistoryForAction(historyId: number, transaction: BorrowTransaction): Promise<{
    id: number;
    detailId: number;
    assetId: number;
    assetCode: string;
    assetModelName: string;
    expectedReturnDate: Date;
    assetStatus: string;
    requesterId: number;
    requesterName: string;
    returnedAt: Date | null;
  } | null>;
  completeReturn(historyId: number, receiverId: number, condition: string, transaction: BorrowTransaction): Promise<void>;
  refreshRequestStatus(requestId: number, transaction: BorrowTransaction): Promise<void>;
  withdraw(requestId: number, requesterId: number, transaction: BorrowTransaction): Promise<number[]>;
  listReviewQueue(query: ReviewQueueQuery): Promise<PageDto<BorrowRequestDto>>;
  findHandoverQueueRequest(requestId: number): Promise<HandoverQueueRequestDto | null>;
  listHandoverQueue(query: PageQuery): Promise<PageDto<HandoverQueueRequestDto>>;
  findReturnQueueRequest(requestId: number): Promise<ReturnQueueRequestDto | null>;
  listReturnQueue(query: PageQuery): Promise<PageDto<ReturnQueueRequestDto>>;
  listCurrent(requesterId: number, query: PageQuery): Promise<PageDto<BorrowHistoryDto>>;
  listHistory(query: BorrowHistoryQuery, requesterId?: number): Promise<PageDto<BorrowHistoryDto>>;
  listBorrowingActivity(
    query: BorrowingActivityQuery,
    requesterId?: number,
  ): Promise<PageDto<BorrowingActivityRequestGroupDto>>;
  findHistoryDetail(historyId: number, requesterId?: number): Promise<BorrowHistoryDetailDto | null>;
}
