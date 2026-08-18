import { z } from 'zod';
import { BaseController } from '@/shared/base.controller.js';
import type { AssetIssueService } from '@/services/asset-issue.service.js';
import type { AssetService } from '@/services/assets.service.js';
import type {
  Asset,
  AssetMutationDto,
  AssetListQuery,
  AssetStatus,
  CreateAssetDto,
  UpdateAssetDto,
} from '@/models/asset.model.js';
import type { Request, Response } from 'express';
import { AssetIssueError, ConflictError, MediaError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const assetStatusSchema = z
  .string()
  .trim()
  .transform((status) => status.toUpperCase())
  .pipe(
    z.enum([
      'AVAILABLE',
      'RESERVED',
      'BORROWED',
      'DAMAGED',
      'IN_REPAIR',
      'RETIRED',
    ]),
  )
  .transform((status) => status.toLowerCase() as AssetStatus);

const assetListQuerySchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().trim().max(200).optional(),
    ),
  status: z.preprocess(
    (value) => (typeof value === 'string' ? value : value),
    assetStatusSchema.optional(),
  ),
  modelId: z.coerce.number().int().positive().optional(),
  typeId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const reportIssueSchema = z.strictObject({
  description: z.string().trim().min(1).max(1000),
});

class AssetController extends BaseController<Asset, CreateAssetDto, UpdateAssetDto> {
  protected readonly createSchema: z.ZodType<CreateAssetDto> = z
    .strictObject({
      assetModelId: z.number().int().positive(),
      serialNumber: z.string().trim().min(1).max(100).nullable().optional(),
      imageUrl: z.string().url().max(500).nullable().optional(),
      imageMediaId: z.number().int().positive().nullable().optional(),
      departmentId: z.number().int().positive().nullable().optional(),
    })
    .refine((data) => !(data.imageMediaId !== undefined && data.imageUrl !== undefined), {
      message: 'Use imageMediaId or imageUrl, not both',
    })
    .transform((data) => ({
      asset_model_id: data.assetModelId,
      ...(data.serialNumber !== undefined ? { serial_number: data.serialNumber } : {}),
      ...(data.imageUrl !== undefined ? { image_url: data.imageUrl } : {}),
      ...(data.imageMediaId !== undefined ? { image_media_id: data.imageMediaId } : {}),
      ...(data.departmentId !== undefined ? { department_id: data.departmentId } : {}),
    }));

  protected readonly updateSchema: z.ZodType<UpdateAssetDto> = z
    .strictObject({
      assetModelId: z.number().int().positive().optional(),
      serialNumber: z.string().trim().min(1).max(100).nullable().optional(),
      imageUrl: z.string().url().max(500).nullable().optional(),
      imageMediaId: z.number().int().positive().nullable().optional(),
      departmentId: z.number().int().positive().nullable().optional(),
    })
    .refine((data) => !(data.imageMediaId !== undefined && data.imageUrl !== undefined), {
      message: 'Use imageMediaId or imageUrl, not both',
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one asset field is required',
    })
    .transform((data) => ({
      ...(data.assetModelId !== undefined ? { asset_model_id: data.assetModelId } : {}),
      ...(data.serialNumber !== undefined ? { serial_number: data.serialNumber } : {}),
      ...(data.imageUrl !== undefined ? { image_url: data.imageUrl } : {}),
      ...(data.imageMediaId !== undefined ? { image_media_id: data.imageMediaId } : {}),
      ...(data.departmentId !== undefined ? { department_id: data.departmentId } : {}),
    }));

  protected readonly resourceName = 'Asset';

  constructor(
    private readonly assetService: AssetService,
    private readonly assetIssueService: AssetIssueService,
  ) {
    super(assetService);
  }

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = parseRequestBody(this.createSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      const result = await this.assetService.create(parsed.data, req.auth.sub);
      if (result.error || !result.data) return ApiResponse.conflict(res, result.error);
      return ApiResponse.created(res, this.serialize(result.data));
    } catch (error) {
      if (error instanceof MediaError) {
        if (error.code === 'MEDIA_FORBIDDEN') return ApiResponse.forbidden(res, 'You do not have access to this media');
        if (error.code === 'MEDIA_CONFIG_MISSING' || error.code === 'MEDIA_STORAGE_ACCESS' || error.code === 'MEDIA_STORAGE_UNAVAILABLE') {
          return ApiResponse.serviceUnavailable(res, 'Media storage is currently unavailable');
        }
        return ApiResponse.badRequest(res, { imageMediaId: [error.message] });
      }
      if (error instanceof ConflictError) return ApiResponse.conflict(res, error.message);
      return ApiResponse.internalError(res);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return ApiResponse.badRequest(res, { id: ['Asset id must be a positive integer'] });
    const parsed = parseRequestBody(this.updateSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      const asset = await this.assetService.update(id, parsed.data, req.auth.sub);
      if (!asset) return ApiResponse.notFound(res, 'Asset not found');
      return ApiResponse.ok(res, this.serialize(asset));
    } catch (error) {
      if (error instanceof MediaError) {
        if (error.code === 'MEDIA_FORBIDDEN') return ApiResponse.forbidden(res, 'You do not have access to this media');
        if (error.code === 'MEDIA_CONFIG_MISSING' || error.code === 'MEDIA_STORAGE_ACCESS' || error.code === 'MEDIA_STORAGE_UNAVAILABLE') {
          return ApiResponse.serviceUnavailable(res, 'Media storage is currently unavailable');
        }
        return ApiResponse.badRequest(res, { imageMediaId: [error.message] });
      }
      if (error instanceof ConflictError) return ApiResponse.conflict(res, error.message);
      return ApiResponse.internalError(res);
    }
  };

  protected override serialize(asset: Asset): AssetMutationDto {
    return {
      id: asset.id,
      assetCode: asset.asset_code,
      assetModelId: asset.asset_model_id,
      serialNumber: asset.serial_number,
      qrCode: asset.qr_code,
      status: asset.status.toUpperCase(),
      imageUrl: asset.image_url,
      imageMediaId: asset.image_media_id,
      departmentId: asset.department_id,
      createdAt: asset.created_at.toISOString(),
    };
  }

  getAll = async (req: Request, res: Response): Promise<void> => {
    const parsed = assetListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return ApiResponse.badRequest(res, {
        query: ['Invalid asset list query'],
      });
    }

    try {
      return ApiResponse.ok(res, await this.assetService.getReadPage(parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return ApiResponse.badRequest(res, {
        id: ['Asset id must be a positive integer'],
      });
    }
    if (!req.auth) return ApiResponse.unauthorized(res);

    try {
      const asset = await this.assetService.getReadDetail(id);
      if (!asset) return ApiResponse.notFound(res, 'Asset not found');
      const canReportIssue = await this.assetIssueService.canReport(id, {
        userId: req.auth.sub,
        permissionCodes: req.auth.permissionCodes,
      });
      return ApiResponse.ok(res, { ...asset, actions: { canReportIssue } });
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  reportDamaged = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return ApiResponse.badRequest(res, {
        id: ['Asset id must be a positive integer'],
      });
    }

    const parsed = parseRequestBody(reportIssueSchema, req.body);
    if (parsed.success === false) {
      return ApiResponse.badRequest(res, parsed.errors);
    }
    if (!req.auth) return ApiResponse.unauthorized(res);

    try {
      const issue = await this.assetIssueService.report({
        assetId: id,
        reporterId: req.auth.sub,
        permissionCodes: req.auth.permissionCodes,
        description: parsed.data.description,
      });
      return ApiResponse.created(res, issue);
    } catch (error) {
      if (error instanceof AssetIssueError) {
        if (error.code === 'ASSET_NOT_FOUND') {
          return ApiResponse.notFound(res, 'Asset not found');
        }
        return ApiResponse.forbidden(res, 'You cannot report an issue for this asset');
      }
      if (error instanceof ConflictError) {
        return ApiResponse.conflict(res, error.message);
      }
      return ApiResponse.internalError(res);
    }
  };

  retire = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return ApiResponse.badRequest(res, { id: ['Asset id must be a positive integer'] });
    }
    try {
      const retired = await this.assetService.retire(id);
      if (!retired) return ApiResponse.notFound(res, 'Asset not found');
      return ApiResponse.noContent(res);
    } catch (error) {
      if (error instanceof ConflictError) return ApiResponse.conflict(res, error.message);
      return ApiResponse.internalError(res);
    }
  };

  getByQr = async (req: Request, res: Response): Promise<void> => {
    const rawQrCode = req.params.qrCode;
    const qrCode = typeof rawQrCode === 'string' ? rawQrCode.trim() : '';
    if (!qrCode) return ApiResponse.badRequest(res, { qrCode: ['QR code is required'] });
    try {
      const asset = await this.assetService.getReadDetailByQr(qrCode);
      if (!asset) return ApiResponse.notFound(res, 'Asset not found');
      if (!req.auth) return ApiResponse.unauthorized(res);
      const canReportIssue = await this.assetIssueService.canReport(asset.id, {
        userId: req.auth.sub,
        permissionCodes: req.auth.permissionCodes,
      });
      return ApiResponse.ok(res, { ...asset, actions: { canReportIssue } });
    } catch {
      return ApiResponse.internalError(res);
    }
  };

}

export default AssetController;
