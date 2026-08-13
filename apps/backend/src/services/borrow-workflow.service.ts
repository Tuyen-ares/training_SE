import type { AssetService } from '@/services/assets.service.js';
import type { IBorrowRequestRepository } from '@/repositories/borrow-request.repository.js';
import { BorrowError } from '@/shared/app-error.js';
import type { ApproveAllResultDto, BorrowHistoryQuery, PageQuery, ReviewQueueQuery } from '@/models/borrow-lifecycle.model.js';
import { ConflictError } from '@/shared/app-error.js';
import type { INotificationRepository } from '@/repositories/notification.repository.js';

export class BorrowWorkflowService {
  constructor(
    private readonly repository: IBorrowRequestRepository,
    private readonly assets: AssetService,
    private readonly notifications?: INotificationRepository,
  ) {}

  async approve(detailId: number, reviewerId: number): Promise<void> {
    await this.repository.transaction(async (transaction) => {
      const detail = await this.repository.findActionDetail(detailId, transaction);
      if (!detail) throw new BorrowError('REQUEST_NOT_FOUND');
      if (detail.approvalStatus !== 'PENDING' || detail.assetStatus !== 'available') {
        throw new BorrowError('INVALID_ASSET_SELECTION');
      }

      await this.assets.reserveForApprovedRequest([detail.assetId], transaction);
      await this.repository.approveDetail(detailId, reviewerId, transaction);
      await this.repository.refreshRequestStatus(detail.requestId, transaction);
      await this.notifyRequester(
        detail.requesterId,
        'BORROW_DETAIL_APPROVED',
        'Borrow request item approved',
        `An item in borrow request #${detail.requestId} was approved.`,
        detail.requestId,
        transaction,
      );
    });
  }

  async approveAll(requestId: number, reviewerId: number): Promise<ApproveAllResultDto> {
    const detailIds = await this.repository.findPendingDetailIdsForRequest(requestId);
    if (!detailIds) throw new BorrowError('REQUEST_NOT_FOUND');

    const result: ApproveAllResultDto = { requestId, approved: [], skipped: [] };
    for (const detailId of detailIds) {
      try {
        // Each detail keeps the same atomic reservation + approval transaction
        // as the single-detail action. A conflict must not roll back prior wins.
        await this.approve(detailId, reviewerId);
        result.approved.push({ detailId, approvalStatus: 'APPROVED' });
      } catch (error) {
        if (!(error instanceof BorrowError) && !(error instanceof ConflictError)) throw error;
        const reason = error instanceof ConflictError || error.code === 'INVALID_ASSET_SELECTION'
          ? 'ASSET_NOT_AVAILABLE'
          : 'DETAIL_NOT_PENDING';
        result.skipped.push({ detailId, approvalStatus: 'PENDING', reason });
      }
    }
    return result;
  }

  async reject(detailId: number, reviewerId: number, reason: string): Promise<void> {
    await this.repository.transaction(async (transaction) => {
      const detail = await this.repository.findActionDetail(detailId, transaction);
      if (!detail) throw new BorrowError('REQUEST_NOT_FOUND');
      if (detail.approvalStatus !== 'PENDING') {
        throw new BorrowError('INVALID_ASSET_SELECTION');
      }

      await this.repository.rejectDetail(detailId, reviewerId, reason, transaction);
      await this.repository.refreshRequestStatus(detail.requestId, transaction);
      await this.notifyRequester(
        detail.requesterId,
        'BORROW_DETAIL_REJECTED',
        'Borrow request item rejected',
        `An item in borrow request #${detail.requestId} was rejected.`,
        detail.requestId,
        transaction,
      );
    });
  }

  async handover(detailId: number, actorId: number): Promise<number> {
    return this.repository.transaction(async (transaction) => {
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
      await this.notifyRequester(
        detail.requesterId,
        'ASSET_HANDED_OVER',
        'Asset handover confirmed',
        `Asset handover for borrow request #${detail.requestId} was confirmed.`,
        detail.requestId,
        transaction,
      );
      return historyId;
    });
  }

  async returnNormal(
    historyId: number,
    actorId: number,
  ): Promise<void> {
    await this.repository.transaction(async (transaction) => {
      const history = await this.repository.findHistoryForAction(historyId, transaction);
      if (!history) throw new BorrowError('REQUEST_NOT_FOUND');
      if (history.returnedAt || history.assetStatus !== 'borrowed') {
        throw new BorrowError('INVALID_ASSET_SELECTION');
      }

      await this.repository.completeReturn(historyId, actorId, 'NORMAL', transaction);
      await this.assets.returnAsset(history.assetId, 'good', transaction);
      const detail = await this.repository.findActionDetail(history.detailId, transaction);
      if (detail) {
        await this.repository.refreshRequestStatus(detail.requestId, transaction);
        await this.notifyRequester(
          history.requesterId,
          'ASSET_RETURNED',
          'Asset return confirmed',
          `An asset return for borrow request #${detail.requestId} was confirmed.`,
          detail.requestId,
          transaction,
        );
      }
    });
  }

  async returnDamaged(
    historyId: number,
    actorId: number,
    description: string,
  ): Promise<number> {
    return this.repository.transaction(async (transaction) => {
      const history = await this.repository.findHistoryForAction(historyId, transaction);
      if (!history) throw new BorrowError('REQUEST_NOT_FOUND');
      if (history.returnedAt || history.assetStatus !== 'borrowed') {
        throw new BorrowError('INVALID_ASSET_SELECTION');
      }

      await this.repository.completeReturn(historyId, actorId, 'DAMAGED', transaction);
      await this.assets.returnAsset(history.assetId, 'damaged', transaction);
      const issueId = await this.repository.createConfirmedIssueForDamagedReturn(
        history.assetId,
        actorId,
        description,
        transaction,
      );

      const detail = await this.repository.findActionDetail(history.detailId, transaction);
      if (detail) {
        await this.repository.refreshRequestStatus(detail.requestId, transaction);
        await this.notifyRequester(
          history.requesterId,
          'ASSET_RETURNED_DAMAGED',
          'Damaged asset return confirmed',
          `A damaged asset return for borrow request #${detail.requestId} was confirmed.`,
          detail.requestId,
          transaction,
        );
      }
      await this.notifyIssueHandlers(issueId, actorId, transaction);
      return issueId;
    });
  }

  async withdraw(requestId: number, actorId: number): Promise<void> {
    await this.repository.transaction(async (transaction) => {
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

  listReturnQueue(query: PageQuery) {
    return this.repository.listReturnQueue(query);
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

  getHistoryDetail(historyId: number, requesterId: number, canViewAll: boolean) {
    return this.repository.findHistoryDetail(historyId, canViewAll ? undefined : requesterId);
  }

  private async notifyRequester(
    recipientUserId: number,
    notificationType: string,
    title: string,
    message: string,
    requestId: number,
    transaction: Parameters<IBorrowRequestRepository['findActionDetail']>[1],
  ): Promise<void> {
    if (!this.notifications) return;
    await this.notifications.create({
      recipientUserId,
      notificationType,
      title,
      message,
      relatedEntityType: 'BORROW_REQUEST',
      relatedEntityId: requestId,
    }, transaction);
  }

  private async notifyIssueHandlers(
    issueId: number,
    excludedUserId: number,
    transaction: Parameters<IBorrowRequestRepository['findActionDetail']>[1],
  ): Promise<void> {
    if (!this.notifications) return;
    const recipients = await this.notifications.findActiveUserIdsByPermissions([
      'asset_issue.view',
      'asset_issue.update',
    ]);
    await Promise.all(recipients
      .filter((recipientUserId) => recipientUserId !== excludedUserId)
      .map((recipientUserId) => this.notifications!.create({
        recipientUserId,
        notificationType: 'ASSET_ISSUE_CONFIRMED',
        title: 'Asset issue confirmed from damaged return',
        message: `Asset issue #${issueId} was confirmed from a damaged return.`,
        relatedEntityType: 'ASSET_ISSUE',
        relatedEntityId: issueId,
      }, transaction)));
  }
}
