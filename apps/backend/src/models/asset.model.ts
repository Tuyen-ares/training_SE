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
  asset_code: string;
  asset_model_id: number;
  serial_number: string | null;
  status: AssetStatus;
  qr_code: string;
  image_url: string | null;
  image_media_id?: number | null;
  department_id: number | null;
  created_at: Date;
}

export interface CreateAssetDto {
  asset_model_id: number;
  serial_number?: string | null;
  image_url?: string | null;
  image_media_id?: number | null;
  department_id?: number | null;
}

export interface UpdateAssetDto {
  asset_model_id?: number;
  serial_number?: string | null;
  image_url?: string | null;
  image_media_id?: number | null;
  department_id?: number | null;
}

export interface AssetMutationDto {
  id: number;
  assetCode: string;
  assetModelId: number;
  serialNumber: string | null;
  status: string;
  qrCode: string;
  imageUrl: string | null;
  imageMediaId?: number | null;
  departmentId: number | null;
  createdAt: string;
}

export interface AssetListQuery {
  q?: string;
  status?: AssetStatus;
  modelId?: number;
  typeId?: number;
  brandId?: number;
  departmentId?: number;
  page: number;
  pageSize: number;
}

export interface AssetModelSummaryDto {
  id: number;
  name: string;
}

export interface AssetListItemDto {
  id: number;
  assetCode: string;
  serialNumber: string | null;
  qrCode: string;
  imageUrl: string | null;
  imageMediaId?: number | null;
  status: string;
  model: AssetModelSummaryDto;
  brand: AssetModelSummaryDto;
  type: AssetModelSummaryDto;
  department: AssetModelSummaryDto | null;
}

export interface AssetListDto {
  items: AssetListItemDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AssetDetailDto extends AssetListItemDto {
  brand: AssetModelSummaryDto;
  type: AssetModelSummaryDto;
  department: AssetModelSummaryDto | null;
  actions: {
    canReportIssue: boolean;
  };
}

export type AssetDetailRecordDto = Omit<AssetDetailDto, 'actions'>;
