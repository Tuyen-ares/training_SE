import type {
  AssetIssue,
  AssetIssueListQuery,
  AssetIssuePage,
  AssetIssueRepairUpdate,
  AssetIssueStatus,
} from '@/models/asset-issue.model.js';
import type { AssetService } from '@/services/assets.service.js';
import type { IAssetIssueRepository, AssetIssueTransaction } from '@/repositories/asset-issue.repository.js';
import type { NotificationService } from '@/services/notification.service.js';
import type { VendorService } from '@/services/vendor.service.js';
import type { VendorTransaction } from '@/repositories/vendor.repository.js';
import type { PrismaClient } from '../../generated/prisma/index.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';
import { AssetIssueError } from '@/shared/app-error.js';
import { MediaError } from '@/shared/app-error.js';
import type { MediaService } from '@/services/media.service.js';

export interface ReportAssetIssueInput {
  assetId: number;
  reporterId: number;
  permissionCodes: string[];
  description: string;
}

export class AssetIssueService {
  constructor(
    private readonly assets: AssetService,
    private readonly issueRepository: IAssetIssueRepository,
    private readonly vendors: VendorService,
    private readonly notifications: NotificationService,
    private readonly prisma: PrismaClient,
    private readonly mediaService?: MediaService,
  ) {}

  canReport(
    assetId: number,
    actor: { userId: number; permissionCodes: string[] },
  ): Promise<boolean> | boolean {
    if (actor.permissionCodes.includes('asset_issue.report')) return true;
    return this.issueRepository.isCurrentBorrower(assetId, actor.userId);
  }

  async report(input: ReportAssetIssueInput): Promise<AssetIssue> {
    const asset = await this.assets.getById(input.assetId);
    if (!asset) throw new AssetIssueError('ASSET_NOT_FOUND');

    const canReport = await this.canReport(input.assetId, {
      userId: input.reporterId,
      permissionCodes: input.permissionCodes,
    });
    if (!canReport) throw new AssetIssueError('REPORT_FORBIDDEN');

    return this.prisma.$transaction(async (transaction) => {
      const issue = await this.issueRepository.createReport({
        assetId: input.assetId,
        reportedBy: input.reporterId,
        description: input.description,
      }, transaction);
      await this.notifications.notifyPermissionHoldersInTransaction(
        ['asset_issue.view', 'asset_issue.update'],
        {
          notificationType: 'ASSET_ISSUE_REPORTED',
          title: 'New asset issue reported',
          message: `Asset issue #${issue.id} requires review.`,
          relatedEntityType: 'ASSET_ISSUE',
          relatedEntityId: issue.id,
        },
        [input.reporterId],
        transaction,
      );
      return issue;
    });
  }

  createConfirmedInTransaction(
    assetId: number,
    actorId: number,
    description: string,
    transaction: PrismaTransaction,
  ): Promise<AssetIssue> {
    return this.issueRepository.createConfirmed(
      { assetId, reportedBy: actorId, description },
      actorId,
      transaction,
    );
  }

  list(query: AssetIssueListQuery): Promise<AssetIssuePage> {
    return this.issueRepository.findPage(query);
  }

  async getById(id: number): Promise<AssetIssue> {
    const issue = await this.issueRepository.findById(id);
    if (!issue) throw new AssetIssueError('ISSUE_NOT_FOUND');
    return issue;
  }

  confirm(id: number, actorId: number): Promise<AssetIssue> {
    return this.prisma.$transaction((transaction) =>
      this.changeStatusWithAsset(id, actorId, 'REPORTED', 'CONFIRMED', transaction),
    );
  }

  reject(id: number, actorId: number, note?: string): Promise<AssetIssue> {
    return this.prisma.$transaction(async (transaction) => {
      const issue = await this.requireIssue(id, transaction, 'REPORTED');
      const changed = await this.issueRepository.transition(
        id, 'REPORTED', 'REJECTED', actorId, transaction,
      );
      if (!changed) throw new AssetIssueError('INVALID_ISSUE_STATE');
      if (note) await this.issueRepository.updateRepair(id, { note }, transaction);
      await this.notifyReporter(issue, 'ASSET_ISSUE_REJECTED', 'Asset issue rejected', transaction);
      return (await this.issueRepository.findById(id, transaction))!;
    });
  }

  startRepair(
    id: number,
    actorId: number,
    permissionCodes: string[],
    data: AssetIssueRepairUpdate,
  ): Promise<AssetIssue> {
    this.assertVendorChangePermission(data, permissionCodes);
    return this.prisma.$transaction(async (transaction) => {
      const issue = await this.requireIssue(id, transaction, 'CONFIRMED');
      await this.lockAndValidateVendorChange(issue, data, transaction);
      await this.assets.startRepair(issue.assetId, transaction);
      const changed = await this.issueRepository.transition(
        id, 'CONFIRMED', 'IN_REPAIR', actorId, transaction,
      );
      if (!changed) throw new AssetIssueError('INVALID_ISSUE_STATE');
      if (Object.keys(data).length) await this.issueRepository.updateRepair(id, data, transaction);
      await this.notifyReporter(issue, 'ASSET_REPAIR_STARTED', 'Asset repair started', transaction);
      return (await this.issueRepository.findById(id, transaction))!;
    });
  }

  updateRepair(
    id: number,
    data: AssetIssueRepairUpdate,
    permissionCodes: string[],
  ): Promise<AssetIssue> {
    this.assertVendorChangePermission(data, permissionCodes);
    return this.prisma.$transaction(async (transaction) => {
      const issue = await this.requireIssue(id, transaction, 'IN_REPAIR');
      await this.lockAndValidateVendorChange(issue, data, transaction);
      const effectiveStart = data.startDate ?? issue.startDate;
      if (data.endDate && effectiveStart && data.endDate < effectiveStart) {
        throw new AssetIssueError('INVALID_ISSUE_STATE');
      }
      return this.issueRepository.updateRepair(id, data, transaction);
    });
  }

  finishRepair(
    id: number,
    actorId: number,
    status: 'COMPLETED' | 'FAILED',
    permissionCodes: string[],
    data: AssetIssueRepairUpdate,
    mediaIds?: number[],
  ): Promise<AssetIssue> {
    if (status === 'FAILED' && mediaIds?.length) {
      throw new MediaError('EVIDENCE_NOT_ALLOWED', 'Failed repairs cannot include after-repair evidence');
    }
    this.assertVendorChangePermission(data, permissionCodes);
    return this.prisma.$transaction(async (transaction) => {
      const issue = await this.requireIssue(id, transaction, 'IN_REPAIR');
      await this.lockAndValidateVendorChange(issue, data, transaction);
      await this.assets.completeRepair(
        issue.assetId,
        status === 'COMPLETED' ? 'repaired' : 'failed',
        transaction,
      );
      const updated = await this.issueRepository.completeRepair(
        id, status, actorId, data, transaction,
      );
      if (status === 'COMPLETED' && mediaIds?.length) {
        if (!this.mediaService) {
          throw new MediaError('MEDIA_CONFIG_MISSING', 'Media service is not configured');
        }
        await this.mediaService.claimRepairEvidence(id, mediaIds, actorId, transaction);
      }
      await this.notifyReporter(
        issue,
        status === 'COMPLETED' ? 'ASSET_REPAIR_COMPLETED' : 'ASSET_REPAIR_FAILED',
        status === 'COMPLETED' ? 'Asset repair completed' : 'Asset repair failed',
        transaction,
      );
      return updated;
    });
  }

  private async changeStatusWithAsset(
    id: number,
    actorId: number,
    expected: AssetIssueStatus,
    next: AssetIssueStatus,
    transaction: PrismaTransaction,
  ): Promise<AssetIssue> {
    const issue = await this.requireIssue(id, transaction, expected);
    const asset = await this.assets.getByIdInTransaction(issue.assetId, transaction);
    if (!asset || !['available', 'borrowed'].includes(asset.status)) {
      throw new AssetIssueError('INVALID_ISSUE_STATE');
    }
    const expectedAssetStatus = asset.status === 'available' ? 'available' : 'borrowed';
    await this.assets.confirmDamageInTransaction(issue.assetId, expectedAssetStatus, transaction);
    const changed = await this.issueRepository.transition(id, expected, next, actorId, transaction);
    if (!changed) throw new AssetIssueError('INVALID_ISSUE_STATE');
    await this.notifyReporter(issue, 'ASSET_ISSUE_CONFIRMED', 'Asset issue confirmed', transaction);
    return (await this.issueRepository.findById(id, transaction))!;
  }

  private async requireIssue(
    id: number,
    transaction: AssetIssueTransaction,
    expectedStatus: AssetIssueStatus,
  ): Promise<AssetIssue> {
    const issue = await this.issueRepository.findById(id, transaction);
    if (!issue) throw new AssetIssueError('ISSUE_NOT_FOUND');
    if (issue.status !== expectedStatus) throw new AssetIssueError('INVALID_ISSUE_STATE');
    return issue;
  }

  private assertVendorChangePermission(
    data: AssetIssueRepairUpdate,
    permissionCodes: string[],
  ): void {
    const changesVendor = Object.prototype.hasOwnProperty.call(data, 'vendorId');
    if (changesVendor && !permissionCodes.includes('vendor.view')) {
      throw new AssetIssueError('VENDOR_PERMISSION_REQUIRED');
    }
  }

  private async lockAndValidateVendorChange(
    issue: AssetIssue,
    data: AssetIssueRepairUpdate,
    transaction: VendorTransaction,
  ): Promise<void> {
    if (!Object.prototype.hasOwnProperty.call(data, 'vendorId')) return;
    const targetId = data.vendorId ?? issue.vendor?.id;
    if (targetId === undefined) return;
    const vendor = await this.vendors.lockForAssignmentInTransaction(targetId, transaction);
    if (!vendor) throw new AssetIssueError('VENDOR_NOT_FOUND');
    if (data.vendorId !== null && !vendor.isActive) {
      throw new AssetIssueError('VENDOR_INACTIVE');
    }
  }

  private async notifyReporter(
    issue: AssetIssue,
    notificationType: string,
    title: string,
    transaction: PrismaTransaction,
  ): Promise<void> {
    if (issue.reportedBy === null) return;
    await this.notifications.createInTransaction({
      recipientUserId: issue.reportedBy,
      notificationType,
      title,
      message: `${title} for issue #${issue.id}.`,
      relatedEntityType: 'ASSET_ISSUE',
      relatedEntityId: issue.id,
    }, transaction);
  }
}
