import type {
  AssetIssue,
  CreateAssetIssueReport,
} from '@/models/asset-issue.model.js';

export interface IAssetIssueRepository {
  createReport(data: CreateAssetIssueReport): Promise<AssetIssue>;
  isCurrentBorrower(assetId: number, userId: number): Promise<boolean>;
}
