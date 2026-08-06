import type {
  AssetIssue,
  AssetIssueListQuery,
  AssetIssuePage,
  AssetIssueRepairUpdate,
  AssetIssueStatus,
} from '@/models/asset-issue.model.js';
import type { IAssetRepository } from '@/repositories/asset.repository.js';
import type { IAssetIssueRepository } from '@/repositories/asset-issue.repository.js';
import type { INotificationRepository } from '@/repositories/notification.repository.js';
import { AssetIssueError } from '@/shared/app-error.js';

export interface ReportAssetIssueInput {
  assetId: number;
  reporterId: number;
  permissionCodes: string[];
  description: string;
}

export class AssetIssueService {
  constructor(
    private readonly assetRepository: IAssetRepository,
    private readonly issueRepository: IAssetIssueRepository,
    private readonly notificationRepository?: INotificationRepository,
  ) {}

  canReport(
    assetId: number,
    actor: { userId: number; permissionCodes: string[] },
  ): Promise<boolean> | boolean {
    if (actor.permissionCodes.includes('asset_issue.report')) {
      return true;
    }
    return this.issueRepository.isCurrentBorrower(assetId, actor.userId);
  }

  async report(input: ReportAssetIssueInput): Promise<AssetIssue> {
    const asset = await this.assetRepository.findById(input.assetId);
    if (!asset) {
      throw new AssetIssueError('ASSET_NOT_FOUND');
    }

    const canReport = await this.canReport(input.assetId, {
      userId: input.reporterId,
      permissionCodes: input.permissionCodes,
    });
    if (!canReport) {
      throw new AssetIssueError('REPORT_FORBIDDEN');
    }

    const issue = await this.issueRepository.createReport({
      assetId: input.assetId,
      reportedBy: input.reporterId,
      description: input.description,
    });
    if (this.notificationRepository) {
      const recipients = await this.notificationRepository.findActiveUserIdsByPermissions([
        'repair_log.view',
        'repair_log.update',
      ]);
      await Promise.all(recipients
        .filter((id) => id !== input.reporterId)
        .map((recipientUserId) => this.notificationRepository!.create({
          recipientUserId,
          notificationType: 'ASSET_ISSUE_REPORTED',
          title: 'New asset issue reported',
          message: `Asset issue #${issue.id} requires review.`,
          relatedEntityType: 'ASSET_ISSUE',
          relatedEntityId: issue.id,
        })));
    }
    return issue;
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
    return this.changeStatusWithAsset(id, actorId, 'REPORTED', 'CONFIRMED', 'damaged');
  }

  reject(id: number, actorId: number, note?: string): Promise<AssetIssue> {
    return this.issueRepository.transaction(async (transaction) => {
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
    data: AssetIssueRepairUpdate,
  ): Promise<AssetIssue> {
    return this.issueRepository.transaction(async (transaction) => {
      const issue = await this.requireIssue(id, transaction, 'CONFIRMED');
      const assetChanged = await this.issueRepository.transitionAsset(
        issue.assetId, 'damaged', 'in_repair', transaction,
      );
      if (!assetChanged) throw new AssetIssueError('INVALID_ISSUE_STATE');
      const changed = await this.issueRepository.transition(
        id, 'CONFIRMED', 'IN_REPAIR', actorId, transaction,
      );
      if (!changed) throw new AssetIssueError('INVALID_ISSUE_STATE');
      if (Object.keys(data).length) await this.issueRepository.updateRepair(id, data, transaction);
      await this.notifyReporter(issue, 'ASSET_REPAIR_STARTED', 'Asset repair started', transaction);
      return (await this.issueRepository.findById(id, transaction))!;
    });
  }

  updateRepair(id: number, data: AssetIssueRepairUpdate): Promise<AssetIssue> {
    return this.issueRepository.transaction(async (transaction) => {
      const issue = await this.requireIssue(id, transaction, 'IN_REPAIR');
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
    data: AssetIssueRepairUpdate,
  ): Promise<AssetIssue> {
    return this.issueRepository.transaction(async (transaction) => {
      const issue = await this.requireIssue(id, transaction, 'IN_REPAIR');
      const assetChanged = await this.issueRepository.transitionAsset(
        issue.assetId,
        'in_repair',
        status === 'COMPLETED' ? 'available' : 'damaged',
        transaction,
      );
      if (!assetChanged) throw new AssetIssueError('INVALID_ISSUE_STATE');
      const updated = await this.issueRepository.completeRepair(
        id, status, actorId, data, transaction,
      );
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
    assetNext: 'damaged',
  ): Promise<AssetIssue> {
    return this.issueRepository.transaction(async (transaction) => {
      const issue = await this.requireIssue(id, transaction, expected);
      const asset = await this.assetRepository.findById(issue.assetId, transaction);
      if (!asset || !['available', 'borrowed'].includes(asset.status)) {
        throw new AssetIssueError('INVALID_ISSUE_STATE');
      }
      const assetChanged = await this.issueRepository.transitionAsset(
        issue.assetId, asset.status as 'available' | 'borrowed', assetNext, transaction,
      );
      if (!assetChanged) throw new AssetIssueError('INVALID_ISSUE_STATE');
      const changed = await this.issueRepository.transition(id, expected, next, actorId, transaction);
      if (!changed) throw new AssetIssueError('INVALID_ISSUE_STATE');
      await this.notifyReporter(issue, 'ASSET_ISSUE_CONFIRMED', 'Asset issue confirmed', transaction);
      return (await this.issueRepository.findById(id, transaction))!;
    });
  }

  private async requireIssue(
    id: number,
    transaction: Parameters<IAssetIssueRepository['findById']>[1],
    expectedStatus: AssetIssueStatus,
  ): Promise<AssetIssue> {
    const issue = await this.issueRepository.findById(id, transaction);
    if (!issue) throw new AssetIssueError('ISSUE_NOT_FOUND');
    if (issue.status !== expectedStatus) throw new AssetIssueError('INVALID_ISSUE_STATE');
    return issue;
  }

  private async notifyReporter(
    issue: AssetIssue,
    notificationType: string,
    title: string,
    transaction: Parameters<IAssetIssueRepository['findById']>[1],
  ): Promise<void> {
    if (!issue.reportedBy || !this.notificationRepository || !transaction) return;
    await this.notificationRepository.create({
      recipientUserId: issue.reportedBy,
      notificationType,
      title,
      message: `${title} for issue #${issue.id}.`,
      relatedEntityType: 'ASSET_ISSUE',
      relatedEntityId: issue.id,
    }, transaction);
  }
}
