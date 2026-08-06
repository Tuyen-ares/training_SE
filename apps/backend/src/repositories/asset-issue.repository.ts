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
  'asset_issues' | 'assets' | 'notifications'
>;

export interface IAssetIssueRepository {
  transaction<T>(work: (transaction: AssetIssueTransaction) => Promise<T>): Promise<T>;
  createReport(data: CreateAssetIssueReport, transaction?: AssetIssueTransaction): Promise<AssetIssue>;
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
  transitionAsset(
    assetId: number,
    expectedStatus: 'available' | 'borrowed' | 'damaged' | 'in_repair',
    nextStatus: 'available' | 'damaged' | 'in_repair',
    transaction: AssetIssueTransaction,
  ): Promise<boolean>;
}
