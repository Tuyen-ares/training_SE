import type {
  AssetIssue,
  CreateAssetIssueReport,
} from '@/models/asset-issue.model.js';
import type { IAssetIssueRepository } from '@/repositories/asset-issue.repository.js';
import type { PrismaClient } from '../../generated/prisma/index.js';

export class PrismaAssetIssueRepository implements IAssetIssueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createReport(data: CreateAssetIssueReport): Promise<AssetIssue> {
    const issue = await this.prisma.asset_issues.create({
      data: {
        asset_id: data.assetId,
        reported_by: data.reportedBy,
        description: data.description,
        status: 'REPORTED',
      },
      select: {
        id: true,
        asset_id: true,
        reported_by: true,
        description: true,
        status: true,
        created_at: true,
      },
    });

    return {
      id: issue.id,
      assetId: issue.asset_id,
      reportedBy: issue.reported_by,
      description: issue.description ?? '',
      status: issue.status ?? 'REPORTED',
      createdAt: issue.created_at,
    };
  }

  async isCurrentBorrower(assetId: number, userId: number): Promise<boolean> {
    const history = await this.prisma.borrow_histories.findFirst({
      where: {
        return_date: null,
        borrow_request_details: {
          asset_id: assetId,
          borrow_requests: { user_id: userId },
        },
      },
      select: { id: true },
    });
    return history !== null;
  }
}
