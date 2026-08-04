export interface AssetIssue {
  id: number;
  assetId: number;
  reportedBy: number | null;
  description: string;
  status: string;
  createdAt: Date | null;
}

export interface CreateAssetIssueReport {
  assetId: number;
  reportedBy: number;
  description: string;
}
