import type {
  AssetIssue,
  AssetIssueListQuery,
  AssetIssuePage,
  AssetIssueRepairUpdate,
  AssetIssueStatus,
  CreateAssetIssueReport,
} from '@/models/asset-issue.model.js';
import type { MediaEvidenceDto } from '@/models/media.model.js';
import { buildPublicMediaUrl } from '@/shared/media-url.js';
import type {
  AssetIssueTransaction,
  IAssetIssueRepository,
} from '@/repositories/asset-issue.repository.js';
import type { PrismaClient } from '../../generated/prisma/index.js';

const issueSelect = {
  id: true,
  asset_id: true,
  reported_by: true,
  description: true,
  status: true,
  handled_by: true,
  vendor_id: true,
  start_date: true,
  end_date: true,
  cost: true,
  result: true,
  note: true,
  created_at: true,
  updated_at: true,
  assets: {
    select: {
      id: true,
      asset_code: true,
      serial_number: true,
      status: true,
      asset_models: { select: { name: true } },
    },
  },
  reported_by_users: { select: { id: true, name: true } },
  handled_by_users: { select: { id: true, name: true } },
  vendors: { select: { id: true, name: true } },
  repair_evidence: {
    include: {
      media_files: {
        select: {
          id: true,
          storage_path: true,
          mime_type: true,
          size_bytes: true,
          uploaded_at: true,
        },
      },
    },
  },
} as const;

function mapEvidence(entries: Array<{ media_files: any }> | undefined): MediaEvidenceDto[] {
  return (entries ?? []).map(({ media_files: media }) => ({
    mediaId: media.id,
    mimeType: media.mime_type,
    sizeBytes: media.size_bytes,
    uploadedAt: media.uploaded_at ?? new Date(0),
    publicUrl: buildPublicMediaUrl(media.storage_path) ?? '',
  }));
}

function mapIssue(issue: any): AssetIssue {
  return {
    id: issue.id,
    assetId: issue.asset_id,
    reportedBy: issue.reported_by,
    description: issue.description ?? '',
    status: issue.status ?? 'REPORTED',
    handledBy: issue.handled_by_users
      ? { id: issue.handled_by_users.id, name: issue.handled_by_users.name }
      : null,
    vendor: issue.vendors ? { id: issue.vendors.id, name: issue.vendors.name } : null,
    startDate: issue.start_date,
    endDate: issue.end_date,
    cost: issue.cost?.toString() ?? null,
    result: issue.result,
    note: issue.note,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    asset: issue.assets ? {
      id: issue.assets.id,
      assetCode: issue.assets.asset_code,
      serialNumber: issue.assets.serial_number,
      status: issue.assets.status.toUpperCase(),
      modelName: issue.assets.asset_models.name,
    } : null,
    reporter: issue.reported_by_users
      ? { id: issue.reported_by_users.id, name: issue.reported_by_users.name }
      : null,
    repairEvidence: mapEvidence(issue.repair_evidence),
  };
}

export class PrismaAssetIssueRepository implements IAssetIssueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createReport(data: CreateAssetIssueReport, transaction: AssetIssueTransaction): Promise<AssetIssue> {
    const issue = await transaction.asset_issues.create({
      data: {
        asset_id: data.assetId,
        reported_by: data.reportedBy,
        description: data.description,
        status: 'REPORTED',
      },
      select: issueSelect,
    });
    return mapIssue(issue);
  }

  async isCurrentBorrower(assetId: number, userId: number): Promise<boolean> {
    const history = await this.prisma.borrow_histories.findFirst({
      where: {
        return_date: null,
        borrow_request_details: {
          asset_id: assetId,
          borrow_requests: { user_id: userId },
        },
      },
      select: { id: true },
    });
    return history !== null;
  }

  async findPage(query: AssetIssueListQuery): Promise<AssetIssuePage> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.assetId ? { asset_id: query.assetId } : {}),
    };
    const [issues, total] = await this.prisma.$transaction([
      this.prisma.asset_issues.findMany({
        where,
        select: issueSelect,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.asset_issues.count({ where }),
    ]);
    return {
      items: issues.map(mapIssue),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findById(id: number, transaction?: AssetIssueTransaction): Promise<AssetIssue | null> {
    const database = transaction ?? this.prisma;
    const issue = await database.asset_issues.findUnique({ where: { id }, select: issueSelect });
    return issue ? mapIssue(issue) : null;
  }

  async transition(
    id: number,
    expectedStatus: AssetIssueStatus,
    nextStatus: AssetIssueStatus,
    actorId: number,
    transaction: AssetIssueTransaction,
  ): Promise<boolean> {
    const result = await transaction.asset_issues.updateMany({
      where: { id, status: expectedStatus },
      data: {
        status: nextStatus,
        handled_by: actorId,
        ...(nextStatus === 'IN_REPAIR' ? { start_date: new Date() } : {}),
        updated_at: new Date(),
      },
    });
    return result.count === 1;
  }

  async updateRepair(
    id: number,
    data: AssetIssueRepairUpdate,
    transaction: AssetIssueTransaction,
  ): Promise<AssetIssue> {
    const issue = await transaction.asset_issues.update({
      where: { id },
      data: {
        ...(data.vendorId !== undefined ? { vendor_id: data.vendorId } : {}),
        cost: data.cost,
        result: data.result,
        note: data.note,
        start_date: data.startDate,
        end_date: data.endDate,
        updated_at: new Date(),
      },
      select: issueSelect,
    });
    return mapIssue(issue);
  }

  async createConfirmed(
    data: CreateAssetIssueReport,
    handledBy: number,
    transaction: AssetIssueTransaction,
  ): Promise<AssetIssue> {
    const issue = await transaction.asset_issues.create({
      data: {
        asset_id: data.assetId,
        reported_by: data.reportedBy,
        handled_by: handledBy,
        description: data.description,
        status: 'CONFIRMED',
      },
      select: issueSelect,
    });
    return mapIssue(issue);
  }

  async completeRepair(
    id: number,
    status: 'COMPLETED' | 'FAILED',
    actorId: number,
    data: AssetIssueRepairUpdate,
    transaction: AssetIssueTransaction,
  ): Promise<AssetIssue> {
    const issue = await transaction.asset_issues.update({
      where: { id },
      data: {
        status,
        handled_by: actorId,
        ...(data.vendorId !== undefined ? { vendor_id: data.vendorId } : {}),
        cost: data.cost,
        result: data.result,
        note: data.note,
        start_date: data.startDate,
        end_date: new Date(),
        updated_at: new Date(),
      },
      select: issueSelect,
    });
    return mapIssue(issue);
  }

}
