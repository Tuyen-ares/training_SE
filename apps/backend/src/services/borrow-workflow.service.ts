import type { AssetService } from '@/services/assets.service.js';
import type { IBorrowRequestRepository } from '@/repositories/borrow-request.repository.js';
import { BorrowError } from '@/shared/app-error.js';
import type { ApproveAllResultDto, PageQuery } from '@/models/borrow-lifecycle.model.js';
import { ConflictError } from '@/shared/app-error.js';

export class BorrowWorkflowService {
  constructor(
    private readonly repository: IBorrowRequestRepository,
    private readonly assets: AssetService,
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
      return this.repository.createHistory(detailId, actorId, transaction);
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
      }
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

  listReviewQueue(query: PageQuery) {
    return this.repository.listReviewQueue(query);
  }

  listCurrent(requesterId: number, query: PageQuery) {
    return this.repository.listCurrent(requesterId, query);
  }

  listHistory(query: PageQuery, requesterId?: number) {
    return this.repository.listHistory(query, requesterId);
  }
}
