export interface AssetType {
  id: number;
  name: string;
  normalized_prefix: string;
}

export interface CreateAssetTypeDto {
  name: string;
  normalized_prefix?: string;
}

export interface UpdateAssetTypeDto {
  name?: string;
  normalized_prefix?: string;
}
