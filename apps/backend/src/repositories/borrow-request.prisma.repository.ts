import type {
  BorrowDetailStatus,
  BorrowRequestDto,
  BorrowRequestListItemDto,
  BorrowRequestListQuery,
  BorrowRequestPageDto,
  BorrowRequestStatus,
  BorrowHistoryDto,
  CreateBorrowRequestDto,
  PageDto,
  PageQuery,
  ReviewQueueQuery,
  BorrowHistoryQuery,
} from '@/models/borrow-lifecycle.model.js';
import { BorrowError } from '@/shared/app-error.js';
import {
  type borrow_requests_status,
  type PrismaClient,
} from '../../generated/prisma/index.js';
import type { BorrowActionDetail, BorrowTransaction, IBorrowRequestRepository } from './borrow-request.repository.js';

const requestInclude = {
  users: { select: { id: true, name: true, avatar_url: true } },
  borrow_request_details: {
    include: {
      assets: { include: { asset_models: { select: { id: true, name: true } } } },
      approved_by_users: { select: { id: true, name: true } },
    },
  },
} as const;

const dateOnlyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const historyInclude = {
  borrow_request_details: {
    include: {
      borrow_requests: {
        include: { users: { select: { id: true, name: true, avatar_url: true } } },
      },
      assets: { include: { asset_models: { select: { id: true, name: true } } } },
    },
  },
  handed_over_by_users: { select: { id: true, name: true } },
  received_by_users: { select: { id: true, name: true } },
} as const;

function mapHistory(history: any): BorrowHistoryDto {
  const detail = history.borrow_request_details;
  return {
    id: history.id,
    detailId: detail.id,
    asset: {
      id: detail.assets.id,
      serialNumber: detail.assets.serial_number,
      qrCode: detail.assets.qr_code,
      imageUrl: detail.assets.image_url,
      status: detail.assets.status.toUpperCase(),
      model: { id: detail.assets.asset_models.id, name: detail.assets.asset_models.name },
    },
    borrower: {
      id: detail.borrow_requests.users.id,
      name: detail.borrow_requests.users.name,
      avatarUrl: detail.borrow_requests.users.avatar_url,
    },
    expectedReturnDate: dateOnlyFormatter.format(detail.expected_return_date),
    handedOverBy: history.handed_over_by_users,
    borrowedAt: history.borrow_date,
    receivedBy: history.received_by_users,
    returnedAt: history.return_date,
    returnCondition: history.return_condition,
  };
}

function mapRequest(request: any): BorrowRequestDto {
  return {
    id: request.id,
    requester: {
      id: request.users.id,
      name: request.users.name,
      avatarUrl: request.users.avatar_url,
    },
    status: request.status.toUpperCase() as BorrowRequestStatus,
    note: request.note,
    createdAt: request.created_at,
    details: request.borrow_request_details.map((detail: any) => ({
      id: detail.id,
      asset: {
        id: detail.assets.id,
        serialNumber: detail.assets.serial_number,
        qrCode: detail.assets.qr_code,
        imageUrl: detail.assets.image_url,
        status: detail.assets.status.toUpperCase(),
        model: { id: detail.assets.asset_models.id, name: detail.assets.asset_models.name },
      },
      expectedReturnDate: dateOnlyFormatter.format(detail.expected_return_date),
      note: detail.note,
      approvalStatus: detail.approval_status as BorrowDetailStatus,
      approvedBy: detail.approved_by_users
        ? { id: detail.approved_by_users.id, name: detail.approved_by_users.name }
        : null,
      approvedAt: detail.approved_at,
      rejectionReason: detail.rejection_reason,
    })),
  };
}

function mapListItem(request: any): BorrowRequestListItemDto {
  const details = request.borrow_request_details;
  return {
    id: request.id,
    status: request.status.toUpperCase() as BorrowRequestStatus,
    createdAt: request.created_at,
    detailCount: details.length,
    pendingCount: details.filter((detail: any) => detail.approval_status === 'PENDING').length,
    approvedCount: details.filter((detail: any) => detail.approval_status === 'APPROVED').length,
    rejectedCount: details.filter((detail: any) => detail.approval_status === 'REJECTED').length,
  };
}

export class PrismaBorrowRequestRepository implements IBorrowRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createForRequester(requesterId: number, dto: CreateBorrowRequestDto): Promise<BorrowRequestDto> {
    const assetIds = dto.items.map((item) => item.assetId);
    if (new Set(assetIds).size !== assetIds.length) throw new BorrowError('INVALID_ASSET_SELECTION');

    return this.prisma.$transaction(async (transaction) => {
      const availableCount = await transaction.assets.count({
        where: { id: { in: assetIds }, status: 'available' },
      });
      if (availableCount !== assetIds.length) throw new BorrowError('INVALID_ASSET_SELECTION');

      const request = await transaction.borrow_requests.create({
        data: {
          user_id: requesterId,
          note: dto.note ?? null,
          borrow_request_details: {
            create: dto.items.map((item) => ({
              asset_id: item.assetId,
              expected_return_date: item.expectedReturnDate,
              note: item.note ?? null,
            })),
          },
        },
        include: requestInclude,
      });
      return mapRequest(request);
    });
  }

  async findPageForRequester(requesterId: number, query: BorrowRequestListQuery): Promise<BorrowRequestPageDto> {
    const where = { user_id: requesterId, ...(query.status ? { status: query.status.toLowerCase() as any } : {}) };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.borrow_requests.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { borrow_request_details: { select: { approval_status: true } } },
      }),
      this.prisma.borrow_requests.count({ where }),
    ]);
    return { items: requests.map(mapListItem), page: query.page, pageSize: query.pageSize, total };
  }

  async findDetailForRequester(requestId: number, requesterId: number): Promise<BorrowRequestDto | null> {
    const request = await this.prisma.borrow_requests.findFirst({
      where: { id: requestId, user_id: requesterId },
      include: requestInclude,
    });
    return request ? mapRequest(request) : null;
  }

  async findDetailForReview(requestId: number): Promise<BorrowRequestDto | null> {
    const request = await this.prisma.borrow_requests.findUnique({
      where: { id: requestId },
      include: requestInclude,
    });
    return request ? mapRequest(request) : null;
  }

  transaction<T>(work: (transaction: BorrowTransaction) => Promise<T>): Promise<T> { return this.prisma.$transaction(work); }

  async findActionDetail(detailId: number, transaction: BorrowTransaction): Promise<BorrowActionDetail | null> {
    const detail = await transaction.borrow_request_details.findUnique({ where: { id: detailId }, include: { borrow_requests: true, assets: true, borrow_histories: true } });
    return detail ? { id: detail.id, requestId: detail.borrow_request_id, requesterId: detail.borrow_requests.user_id, approvalStatus: detail.approval_status, assetId: detail.asset_id, assetStatus: detail.assets.status, historyId: detail.borrow_histories?.id ?? null } : null;
  }

  async findPendingDetailIdsForRequest(requestId: number): Promise<number[] | null> {
    const request = await this.prisma.borrow_requests.findUnique({
      where: { id: requestId },
      select: {
        status: true,
        borrow_request_details: {
          where: { approval_status: 'PENDING' },
          select: { id: true },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!request) return null;
    if (request.status === 'cancelled' || request.status === 'completed') return [];
    return request.borrow_request_details.map(({ id }) => id);
  }

  async approveDetail(detailId: number, reviewerId: number, transaction: BorrowTransaction): Promise<void> {
    await transaction.borrow_request_details.update({ where: { id: detailId }, data: { approval_status: 'APPROVED', approved_by: reviewerId, approved_at: new Date(), rejection_reason: null } });
  }

  async rejectDetail(detailId: number, reviewerId: number, reason: string, transaction: BorrowTransaction): Promise<void> {
    await transaction.borrow_request_details.update({ where: { id: detailId }, data: { approval_status: 'REJECTED', approved_by: reviewerId, approved_at: new Date(), rejection_reason: reason } });
  }

  async createHistory(detailId: number, handedOverBy: number, transaction: BorrowTransaction): Promise<number> {
    const history = await transaction.borrow_histories.create({ data: { borrow_request_detail_id: detailId, handed_over_by: handedOverBy } });
    return history.id;
  }

  async findHistoryForAction(historyId: number, transaction: BorrowTransaction) {
    const history = await transaction.borrow_histories.findUnique({ where: { id: historyId }, include: { borrow_request_details: { include: { assets: true } } } });
    return history ? { id: history.id, detailId: history.borrow_request_detail_id, assetId: history.borrow_request_details.asset_id, assetStatus: history.borrow_request_details.assets.status, returnedAt: history.return_date } : null;
  }

  async completeReturn(historyId: number, receiverId: number, condition: string, transaction: BorrowTransaction): Promise<void> {
    await transaction.borrow_histories.update({ where: { id: historyId }, data: { received_by: receiverId, return_date: new Date(), return_condition: condition } });
  }

  async refreshRequestStatus(requestId: number, transaction: BorrowTransaction): Promise<void> {
    const details = await transaction.borrow_request_details.findMany({ where: { borrow_request_id: requestId }, include: { borrow_histories: true } });
    const statuses = details.map((detail) => detail.approval_status);
    let status: borrow_requests_status = 'pending';
    if (statuses.every((value) => value === 'REJECTED')) {
      status = 'rejected';
    } else if (statuses.every((value) => value === 'APPROVED')) {
      status = 'approved';
    } else if (statuses.some((value) => value === 'APPROVED')) {
      status = 'partially_approved';
    }

    const approvedDetails = details.filter(
      (detail) => detail.approval_status === 'APPROVED',
    );
    const everyApprovedDetailReturned = approvedDetails.every(
      (detail) => detail.borrow_histories?.return_date,
    );
    if (
      approvedDetails.length > 0 &&
      statuses.every((value) => value !== 'PENDING') &&
      everyApprovedDetailReturned
    ) {
      status = 'completed';
    }

    await transaction.borrow_requests.update({
      where: { id: requestId },
      data: { status },
    });
  }

  async withdraw(requestId: number, requesterId: number, transaction: BorrowTransaction): Promise<number[]> {
    const request = await transaction.borrow_requests.findFirst({ where: { id: requestId, user_id: requesterId }, include: { borrow_request_details: { include: { assets: true, borrow_histories: true } } } });
    if (!request) throw new BorrowError('REQUEST_NOT_FOUND');
    if (request.borrow_request_details.some((detail) => detail.borrow_histories || detail.assets.status === 'borrowed')) throw new BorrowError('INVALID_ASSET_SELECTION');
    await transaction.borrow_requests.update({ where: { id: requestId }, data: { status: 'cancelled' } });
    return request.borrow_request_details.filter((detail) => detail.assets.status === 'reserved').map((detail) => detail.asset_id);
  }

  async listReviewQueue(query: ReviewQueueQuery): Promise<PageDto<BorrowRequestDto>> {
    const where = { borrow_request_details: { some: { approval_status: query.approvalStatus } } };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.borrow_requests.findMany({
        where,
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: requestInclude,
      }),
      this.prisma.borrow_requests.count({ where }),
    ]);
    return { items: requests.map(mapRequest), ...query, total };
  }

  async listCurrent(requesterId: number, query: PageQuery): Promise<PageDto<BorrowHistoryDto>> {
    const where = {
      return_date: null,
      borrow_request_details: { borrow_requests: { user_id: requesterId } },
    };
    const [histories, total] = await this.prisma.$transaction([
      this.prisma.borrow_histories.findMany({
        where,
        include: historyInclude,
        orderBy: [{ borrow_date: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.borrow_histories.count({ where }),
    ]);
    return { items: histories.map(mapHistory), ...query, total };
  }

  async listHistory(query: BorrowHistoryQuery, requesterId?: number): Promise<PageDto<BorrowHistoryDto>> {
    const returnFilter = query.state === 'CURRENT'
      ? { return_date: null }
      : query.state === 'RETURNED'
        ? { return_date: { not: null } }
        : {};
    const where = {
      ...returnFilter,
      ...(requesterId
        ? { borrow_request_details: { borrow_requests: { user_id: requesterId } } }
        : {}),
    };
    const [histories, total] = await this.prisma.$transaction([
      this.prisma.borrow_histories.findMany({
        where,
        include: historyInclude,
        orderBy: [{ borrow_date: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.borrow_histories.count({ where }),
    ]);
    return { items: histories.map(mapHistory), ...query, total };
  }
}
