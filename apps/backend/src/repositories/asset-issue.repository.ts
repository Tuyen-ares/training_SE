import type {
  AssetIssue,
  AssetIssueListQuery,
  AssetIssuePage,
  AssetIssueRepairUpdate,
  AssetIssueStatus,
  CreateAssetIssueReport,
} from '@/models/asset-issue.model.js';
import type { Prisma } from '../../generated/prisma/index.js';

export type AssetIssueTransaction = Pick<
  Prisma.TransactionClient,
  'asset_issues'
>;

export interface IAssetIssueRepository {
  createReport(data: CreateAssetIssueReport, transaction: AssetIssueTransaction): Promise<AssetIssue>;
  createConfirmed(
    data: CreateAssetIssueReport,
    handledBy: number,
    transaction: AssetIssueTransaction,
  ): Promise<AssetIssue>;
  isCurrentBorrower(assetId: number, userId: number): Promise<boolean>;
  findPage(query: AssetIssueListQuery): Promise<AssetIssuePage>;
  findById(id: number, transaction?: AssetIssueTransaction): Promise<AssetIssue | null>;
  transition(
    id: number,
    expectedStatus: AssetIssueStatus,
    nextStatus: AssetIssueStatus,
    actorId: number,
    transaction: AssetIssueTransaction,
  ): Promise<boolean>;
  updateRepair(
    id: number,
    data: AssetIssueRepairUpdate,
    transaction: AssetIssueTransaction,
  ): Promise<AssetIssue>;
  completeRepair(
    id: number,
    status: 'COMPLETED' | 'FAILED',
    actorId: number,
    data: AssetIssueRepairUpdate,
    transaction: AssetIssueTransaction,
  ): Promise<AssetIssue>;
}
