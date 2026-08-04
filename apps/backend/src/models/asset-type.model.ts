export interface AssetType {
  id: number;
  name: string;
}

export interface CreateAssetTypeDto {
  name: string;
}

export interface UpdateAssetTypeDto {
  name?: string;
}
