export interface AssetIssue {
  id: number;
  assetId: number;
  reportedBy: number | null;
  description: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  handledBy: { id: number; name: string } | null;
  vendor: { id: number; name: string } | null;
  startDate: Date | null;
  endDate: Date | null;
  cost: string | null;
  result: string | null;
  note: string | null;
  asset: {
    id: number;
    serialNumber: string | null;
    status: string;
    modelName: string;
  } | null;
  reporter: { id: number; name: string } | null;
}

export interface CreateAssetIssueReport {
  assetId: number;
  reportedBy: number;
  description: string;
}

export const ASSET_ISSUE_STATUSES = [
  'REPORTED',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'IN_REPAIR',
  'COMPLETED',
  'FAILED',
] as const;

export type AssetIssueStatus = (typeof ASSET_ISSUE_STATUSES)[number];

export interface AssetIssueListQuery {
  page: number;
  pageSize: number;
  status?: AssetIssueStatus;
  assetId?: number;
}

export interface AssetIssuePage {
  items: AssetIssue[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AssetIssueRepairUpdate {
  vendorId?: number | null;
  cost?: number | null;
  result?: string | null;
  note?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}
