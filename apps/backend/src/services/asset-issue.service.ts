import type { AssetIssue } from '@/models/asset-issue.model.js';
import type { IAssetRepository } from '@/repositories/asset.repository.js';
import type { IAssetIssueRepository } from '@/repositories/asset-issue.repository.js';
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

    return this.issueRepository.createReport({
      assetId: input.assetId,
      reportedBy: input.reporterId,
      description: input.description,
    });
  }
}
