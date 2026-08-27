import type { AssetService } from '@/services/assets.service.js';
import type { IBorrowRequestRepository } from '@/repositories/borrow-request.repository.js';
import { BorrowError } from '@/shared/app-error.js';
import type { ApproveAllResultDto, BorrowHistoryQuery, BorrowingActivityQuery, PageQuery, ReviewQueueQuery } from '@/models/borrow-lifecycle.model.js';
import { ConflictError } from '@/shared/app-error.js';
import { MediaError } from '@/shared/app-error.js';
import type { AssetIssueService } from '@/services/asset-issue.service.js';
import type {
  BorrowApprovalItemSnapshot,
  DomainEventWriter,
} from '@/notifications/domain-event.js';
import type { BorrowActionDetail } from '@/repositories/borrow-request.repository.js';
import type { PrismaClient } from '../../generated/prisma/index.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';
import type { MediaService } from '@/services/media.service.js';

export class BorrowWorkflowService {
  constructor(
    private readonly repository: IBorrowRequestRepository,
    private readonly assets: AssetService,
    private readonly assetIssues: AssetIssueService,
    private readonly events: DomainEventWriter,
    private readonly prisma: PrismaClient,
    private readonly mediaService?: MediaService,
  ) {}

  async approve(detailId: number, reviewerId: number): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await this.approveDetailInTransaction(
        detailId,
        reviewerId,
        transaction,
        false,
      );
    });
  }

  async approveAll(requestId: number, reviewerId: number): Promise<ApproveAllResultDto> {
    const detailIds = await this.repository.findPendingDetailIdsForRequest(requestId);
    if (!detailIds) throw new BorrowError('REQUEST_NOT_FOUND');

    return this.prisma.$transaction(async (transaction) => {
      const result: ApproveAllResultDto = { requestId, approved: [], skipped: [] };
      const approvalItems: BorrowApprovalItemSnapshot[] = [];
      const approvedDetails: BorrowActionDetail[] = [];

      for (const detailId of detailIds) {
        try {
          const detail = await this.approveDetailInTransaction(
            detailId,
            reviewerId,
            transaction,
            true,
          );
          approvedDetails.push(detail);
          result.approved.push({ detailId, approvalStatus: 'APPROVED' });
          approvalItems.push({
            detailId,
            assetId: detail.assetId,
            assetCode: detail.assetCode,
            assetModelName: detail.assetModelName,
            expectedReturnDate: detail.expectedReturnDate.toISOString(),
            outcome: 'APPROVED',
          });
        } catch (error) {
          if (
            !(error instanceof BorrowError) &&
            !(error instanceof ConflictError)
          ) {
            throw error;
          }
          const reason =
            error instanceof ConflictError ||
            error.code === 'INVALID_ASSET_SELECTION'
              ? 'ASSET_NOT_AVAILABLE'
              : 'DETAIL_NOT_PENDING';
          result.skipped.push({
            detailId,
            approvalStatus: 'PENDING',
            reason,
          });
          const skippedDetail = await this.repository.findActionDetail(
            detailId,
            transaction,
          );
          approvalItems.push({
            detailId,
            ...(skippedDetail
              ? {
                  assetId: skippedDetail.assetId,
                  assetCode: skippedDetail.assetCode,
                  assetModelName: skippedDetail.assetModelName,
                  expectedReturnDate:
                    skippedDetail.expectedReturnDate.toISOString(),
                }
              : {}),
            outcome: 'SKIPPED',
            reason,
          });
        }
      }

      if (approvedDetails.length > 0) {
        const first = approvedDetails[0];
        const actorName = await this.userName(reviewerId, transaction);
        await this.events.append(
          {
            eventType: 'borrow_request.approval_summary',
            aggregateType: 'BORROW_REQUEST',
            aggregateId: requestId,
            actorUserId: reviewerId,
            payload: {
              requestId,
              requesterId: first.requesterId,
              requesterName: first.requesterName,
              actorName,
              approvalItems,
              deepLinkContext: {
                entityType: 'BORROW_REQUEST',
                entityId: requestId,
              },
            },
          },
          transaction,
        );
      }
      return result;
    });
  }

  async reject(detailId: number, reviewerId: number, reason: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const detail = await this.repository.findActionDetail(detailId, transaction);
      if (!detail) throw new BorrowError('REQUEST_NOT_FOUND');
      if (detail.approvalStatus !== 'PENDING') {
        throw new BorrowError('INVALID_ASSET_SELECTION');
      }

      await this.repository.rejectDetail(detailId, reviewerId, reason, transaction);
      await this.repository.refreshRequestStatus(detail.requestId, transaction);
      const actorName = await this.userName(reviewerId, transaction);
      await this.events.append({
        eventType: 'borrow_request_detail.rejected',
        aggregateType: 'BORROW_REQUEST_DETAIL',
        aggregateId: detailId,
        actorUserId: reviewerId,
        payload: {
          requestId: detail.requestId,
          requesterId: detail.requesterId,
          requesterName: detail.requesterName,
          actorName,
          detailId: detail.id,
          assetId: detail.assetId,
          assetCode: detail.assetCode,
          assetModelName: detail.assetModelName,
          expectedReturnDate: detail.expectedReturnDate.toISOString(),
          rejectionReason: reason,
          deepLinkContext: {
            entityType: 'BORROW_REQUEST',
            entityId: detail.requestId,
          },
        },
      }, transaction);
    });
  }

  async handover(detailId: number, actorId: number, mediaIds?: number[]): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const detail = await this.repository.findActionDetail(detailId, transaction);
      if (!detail) throw new BorrowError('REQUEST_NOT_FOUND');
      if (
        detail.approvalStatus !== 'APPROVED' ||
        detail.assetStatus !== 'reserved' ||
        detail.historyId
      ) {
        throw new BorrowError('INVALID_ASSET_SELECTION');
      }

      await this.assets.confirmHandover([detail.assetId], transaction);
      const historyId = await this.repository.createHistory(detailId, actorId, transaction);
      await this.claimHandoverEvidence(historyId, mediaIds, actorId, transaction);
      const actorName = await this.userName(actorId, transaction);
      await this.events.append({
        eventType: 'borrow_history.handed_over',
        aggregateType: 'BORROW_HISTORY',
        aggregateId: historyId,
        actorUserId: actorId,
        payload: {
          requestId: detail.requestId,
          requesterId: detail.requesterId,
          requesterName: detail.requesterName,
          actorName,
          detailId: detail.id,
          assetId: detail.assetId,
          assetCode: detail.assetCode,
          assetModelName: detail.assetModelName,
          expectedReturnDate: detail.expectedReturnDate.toISOString(),
          deepLinkContext: {
            entityType: 'BORROW_REQUEST',
            entityId: detail.requestId,
          },
        },
      }, transaction);
      return historyId;
    });
  }

  async returnNormal(
    historyId: number,
    actorId: number,
    mediaIds?: number[],
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const history = await this.repository.findHistoryForAction(historyId, transaction);
      if (!history) throw new BorrowError('REQUEST_NOT_FOUND');
      if (history.returnedAt || history.assetStatus !== 'borrowed') {
        throw new BorrowError('INVALID_ASSET_SELECTION');
      }
      const detail = await this.repository.findActionDetail(history.detailId, transaction);
      if (!detail) throw new BorrowError('REQUEST_NOT_FOUND');

      await this.repository.completeReturn(historyId, actorId, 'NORMAL', transaction);
      await this.assets.returnAsset(history.assetId, 'good', transaction);
      await this.claimReturnEvidence(historyId, mediaIds, actorId, transaction);
      await this.repository.refreshRequestStatus(detail.requestId, transaction);
      const actorName = await this.userName(actorId, transaction);
      await this.events.append({
        eventType: 'borrow_history.returned',
        aggregateType: 'BORROW_HISTORY',
        aggregateId: historyId,
        actorUserId: actorId,
        payload: {
          requestId: detail.requestId,
          requesterId: history.requesterId,
          requesterName: history.requesterName,
          actorName,
          detailId: history.detailId,
          assetId: history.assetId,
          assetCode: history.assetCode,
          assetModelName: history.assetModelName,
          expectedReturnDate: history.expectedReturnDate.toISOString(),
          returnCondition: 'NORMAL',
          deepLinkContext: {
            entityType: 'BORROW_REQUEST',
            entityId: detail.requestId,
          },
        },
      }, transaction);
    });
  }

  async returnDamaged(
    historyId: number,
    actorId: number,
    description: string,
    mediaIds?: number[],
  ): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const history = await this.repository.findHistoryForAction(historyId, transaction);
      if (!history) throw new BorrowError('REQUEST_NOT_FOUND');
      if (history.returnedAt || history.assetStatus !== 'borrowed') {
        throw new BorrowError('INVALID_ASSET_SELECTION');
      }
      const detail = await this.repository.findActionDetail(history.detailId, transaction);
      if (!detail) throw new BorrowError('REQUEST_NOT_FOUND');

      await this.repository.completeReturn(historyId, actorId, 'DAMAGED', transaction);
      await this.assets.returnAsset(history.assetId, 'damaged', transaction);
      const issue = await this.assetIssues.createConfirmedInTransaction(
        history.assetId,
        actorId,
        description,
        transaction,
      );
      await this.claimReturnEvidence(historyId, mediaIds, actorId, transaction);

      await this.repository.refreshRequestStatus(detail.requestId, transaction);
      const actorName = await this.userName(actorId, transaction);
      await this.events.append({
        eventType: 'borrow_history.returned_damaged',
        aggregateType: 'BORROW_HISTORY',
        aggregateId: historyId,
        actorUserId: actorId,
        payload: {
          requestId: detail.requestId,
          requesterId: history.requesterId,
          requesterName: history.requesterName,
          actorName,
          detailId: history.detailId,
          assetId: history.assetId,
          assetCode: history.assetCode,
          assetModelName: history.assetModelName,
          expectedReturnDate: history.expectedReturnDate.toISOString(),
          returnCondition: 'DAMAGED',
          deepLinkContext: {
            entityType: 'BORROW_REQUEST',
            entityId: detail.requestId,
          },
        },
      }, transaction);
      await this.events.append({
        eventType: 'asset_issue.created_from_damaged_return',
        aggregateType: 'ASSET_ISSUE',
        aggregateId: issue.id,
        actorUserId: actorId,
        payload: {
          issueId: issue.id,
          reporterId: actorId,
          reporterName: issue.reporter?.name ?? history.requesterName,
          actorName,
          assetId: issue.asset?.id ?? history.assetId,
          assetCode: issue.asset?.assetCode ?? history.assetCode,
          assetModelName: issue.asset?.modelName ?? history.assetModelName,
          issueDescription: issue.description,
          issueStatus: issue.status,
          issueResult: issue.result,
          issueNote: issue.note,
          deepLinkContext: {
            entityType: 'ASSET_ISSUE',
            entityId: issue.id,
          },
        },
      }, transaction);
      return issue.id;
    });
  }

  async withdraw(requestId: number, actorId: number): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const assetIds = await this.repository.withdraw(requestId, actorId, transaction);
      if (assetIds.length) {
        await this.assets.cancelApprovedRequest(assetIds, transaction);
      }
    });
  }

  listReviewQueue(query: ReviewQueueQuery) {
    return this.repository.listReviewQueue(query);
  }

  listHandoverQueue(query: PageQuery) {
    return this.repository.listHandoverQueue(query);
  }

  getHandoverQueueDetail(requestId: number) {
    return this.repository.findHandoverQueueRequest(requestId);
  }

  listReturnQueue(query: PageQuery) {
    return this.repository.listReturnQueue(query);
  }

  getReturnQueueDetail(requestId: number) {
    return this.repository.findReturnQueueRequest(requestId);
  }

  getReviewDetail(requestId: number) {
    return this.repository.findDetailForReview(requestId);
  }

  listCurrent(requesterId: number, query: PageQuery) {
    return this.repository.listCurrent(requesterId, query);
  }

  listHistory(query: BorrowHistoryQuery, requesterId?: number) {
    return this.repository.listHistory(query, requesterId);
  }

  listBorrowingActivity(query: BorrowingActivityQuery, requesterId?: number) {
    return this.repository.listBorrowingActivity(query, requesterId);
  }

  getHistoryDetail(historyId: number, requesterId: number, canViewAll: boolean) {
    return this.repository.findHistoryDetail(historyId, canViewAll ? undefined : requesterId);
  }

  private async approveDetailInTransaction(
    detailId: number,
    reviewerId: number,
    transaction: PrismaTransaction,
    bulkAction: boolean,
  ): Promise<BorrowActionDetail> {
    const detail = await this.repository.findActionDetail(detailId, transaction);
    if (!detail) throw new BorrowError('REQUEST_NOT_FOUND');
    if (
      detail.approvalStatus !== 'PENDING' ||
      detail.assetStatus !== 'available'
    ) {
      throw new BorrowError('INVALID_ASSET_SELECTION');
    }

    await this.assets.reserveForApprovedRequest([detail.assetId], transaction);
    await this.repository.approveDetail(detailId, reviewerId, transaction);
    await this.repository.refreshRequestStatus(detail.requestId, transaction);
    const actorName = await this.userName(reviewerId, transaction);
    await this.events.append({
      eventType: 'borrow_request_detail.approved',
      aggregateType: 'BORROW_REQUEST_DETAIL',
      aggregateId: detail.id,
      actorUserId: reviewerId,
      payload: {
        requestId: detail.requestId,
        requesterId: detail.requesterId,
        requesterName: detail.requesterName,
        actorName,
        detailId: detail.id,
        assetId: detail.assetId,
        assetCode: detail.assetCode,
        assetModelName: detail.assetModelName,
        expectedReturnDate: detail.expectedReturnDate.toISOString(),
        ...(bulkAction
          ? { notificationSuppressed: true, bulkAction: true }
          : {}),
        deepLinkContext: {
          entityType: 'BORROW_REQUEST',
          entityId: detail.requestId,
        },
      },
    }, transaction);
    return detail;
  }

  private async userName(
    userId: number,
    transaction: PrismaTransaction,
  ): Promise<string> {
    const user = await transaction.users.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name ?? 'User #' + userId;
  }

  private async claimHandoverEvidence(
    historyId: number,
    mediaIds: number[] | undefined,
    actorId: number,
    transaction: PrismaTransaction,
  ): Promise<void> {
    if (!mediaIds?.length) return;
    if (!this.mediaService) {
      throw new MediaError('MEDIA_CONFIG_MISSING', 'Media service is not configured');
    }
    await this.mediaService.claimHandoverEvidence(historyId, mediaIds, actorId, transaction);
  }

  private async claimReturnEvidence(
    historyId: number,
    mediaIds: number[] | undefined,
    actorId: number,
    transaction: PrismaTransaction,
  ): Promise<void> {
    if (!mediaIds?.length) return;
    if (!this.mediaService) {
      throw new MediaError('MEDIA_CONFIG_MISSING', 'Media service is not configured');
    }
    await this.mediaService.claimReturnEvidence(historyId, mediaIds, actorId, transaction);
  }
}
