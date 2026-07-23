export type AssetStatus =
  | 'available'
  | 'reserved'
  | 'borrowed'
  | 'damaged'
  | 'in_repair'
  | 'retired';

export type ReturnCondition = 'good' | 'damaged';
export type RepairResult = 'repaired' | 'failed';

export interface Asset {
  id: number;
  asset_model_id: number;
  serial_number: string | null;
  status: AssetStatus;
  qr_code: string;
  created_at: Date;
}

export interface CreateAssetDto {
  asset_model_id: number;
  serial_number?: string | null;
}

export interface UpdateAssetDto {
  asset_model_id?: number;
  serial_number?: string | null;
}
