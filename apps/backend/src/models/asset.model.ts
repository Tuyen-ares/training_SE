export type AssetStatus = 'available' | 'borrowed' | 'damaged' | 'in_repair';

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
  qr_code: string;
  serial_number?: string | null;
  status?: AssetStatus;
}

export interface UpdateAssetDto {
  asset_model_id?: number;
  serial_number?: string | null;
  status?: AssetStatus;
  qr_code?: string;
}
