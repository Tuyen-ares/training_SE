export interface AssetModel {
  id: number;
  brand_id: number;
  asset_type_id: number;
  name: string;
}

export interface CreateAssetModelDto {
  brand_id: number;
  asset_type_id: number;
  name: string;
}

export interface UpdateAssetModelDto {
  brand_id?: number;
  asset_type_id?: number;
  name?: string;
}
