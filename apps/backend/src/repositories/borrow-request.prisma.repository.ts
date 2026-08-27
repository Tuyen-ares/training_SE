import type {
  BorrowDetailStatus,
  BorrowRequestDto,
  BorrowRequestListItemDto,
  BorrowRequestListQuery,
  BorrowRequestPageDto,
  BorrowRequestStatus,
  BorrowHistoryDto,
  BorrowHistoryDetailDto,
  BorrowRequesterDto,
  CreateBorrowRequestDto,
  HandoverQueueItemDto,
  HandoverQueueRequestDto,
  ReturnQueueRequestDto,
  PageDto,
  PageQuery,
  ReviewQueueQuery,
  BorrowHistoryQuery,
  BorrowingActivityQuery,
  BorrowingActivityRequestGroupDto,
  BorrowingActivityState,
} from '@/models/borrow-lifecycle.model.js';
import type { MediaEvidenceDto } from '@/models/media.model.js';
import { BorrowError } from '@/shared/app-error.js';
import { buildPublicMediaUrl } from '@/shared/media-url.js';
import {
  type borrow_requests_status,
  type PrismaClient,
} from '../../generated/prisma/index.js';
import type { BorrowActionDetail, BorrowTransaction, IBorrowRequestRepository } from './borrow-request.repository.js';

const mediaSelect = {
  id: true,
  storage_path: true,
  mime_type: true,
  size_bytes: true,
  uploaded_at: true,
} as const;

function mediaUrl(media: { storage_path: string } | null | undefined): string | null {
  return media ? buildPublicMediaUrl(media.storage_path) : null;
}

function mapEvidence(entries: Array<{ media_files: any }> | undefined): MediaEvidenceDto[] {
  return (entries ?? []).map(({ media_files: media }) => ({
    mediaId: media.id,
    mimeType: media.mime_type,
    sizeBytes: media.size_bytes,
    uploadedAt: media.uploaded_at ?? new Date(0),
    publicUrl: buildPublicMediaUrl(media.storage_path) ?? '',
  }));
}

const requestInclude = {
  users: {
    select: {
      id: true,
      user_code: true,
      name: true,
      email: true,
      avatar_url: true,
      avatar_media: { select: { storage_path: true } },
      department: { select: { id: true, name: true } },
    },
  },
  borrow_request_details: {
    include: {
      assets: {
        include: {
          asset_models: { select: { id: true, name: true } },
          image_media: { select: { storage_path: true } },
        },
      },
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
        include: { users: { select: { id: true, user_code: true, name: true, avatar_url: true, avatar_media: { select: { storage_path: true } } } } },
      },
      assets: {
        include: {
          asset_models: { select: { id: true, name: true } },
          image_media: { select: { storage_path: true } },
        },
      },
    },
  },
  handed_over_by_users: { select: { id: true, name: true } },
  received_by_users: { select: { id: true, name: true } },
  handover_evidence: { include: { media_files: { select: mediaSelect } } },
  return_evidence: { include: { media_files: { select: mediaSelect } } },
} as const;

const historyDetailInclude = {
  borrow_request_details: {
    include: {
      borrow_requests: {
        include: {
          users: {
            select: {
              id: true,
              user_code: true,
              name: true,
              email: true,
              avatar_url: true,
              avatar_media: { select: { storage_path: true } },
              department: { select: { id: true, name: true } },
            },
          },
        },
      },
      assets: {
        include: {
          asset_models: { select: { id: true, name: true } },
          image_media: { select: { storage_path: true } },
        },
      },
      approved_by_users: { select: { id: true, name: true } },
    },
  },
  handed_over_by_users: { select: { id: true, name: true } },
  received_by_users: { select: { id: true, name: true } },
  handover_evidence: { include: { media_files: { select: mediaSelect } } },
  return_evidence: { include: { media_files: { select: mediaSelect } } },
} as const;


const handoverQueueRequestInclude = {
  users: {
    select: {
      id: true,
      user_code: true,
      name: true,
      email: true,
      avatar_url: true,
      avatar_media: { select: { storage_path: true } },
      department: { select: { id: true, name: true } },
    },
  },
  borrow_request_details: {
    include: {
      assets: {
        include: {
          asset_models: { select: { id: true, name: true } },
          image_media: { select: { storage_path: true } },
        },
      },
      approved_by_users: { select: { id: true, name: true } },
      borrow_histories: { select: { id: true } },
    },
    orderBy: { id: 'asc' },
  },
} as const;

const returnQueueRequestInclude = {
  users: {
    select: {
      id: true,
      user_code: true,
      name: true,
      email: true,
      avatar_url: true,
      avatar_media: { select: { storage_path: true } },
      department: { select: { id: true, name: true } },
    },
  },
  borrow_request_details: {
    include: {
      assets: {
        include: {
          asset_models: { select: { id: true, name: true } },
          image_media: { select: { storage_path: true } },
        },
      },
      borrow_histories: {
        include: {
          handed_over_by_users: { select: { id: true, name: true } },
          received_by_users: { select: { id: true, name: true } },
          handover_evidence: { include: { media_files: { select: mediaSelect } } },
          return_evidence: { include: { media_files: { select: mediaSelect } } },
        },
      },
    },
    orderBy: { id: 'asc' },
  },
} as const;

const borrowingActivityRequestInclude = (state: BorrowingActivityState) => {
  const returnDateFilter = state === 'CURRENT'
    ? { return_date: null }
    : { return_date: { not: null } };
  return {
    users: requestInclude.users,
    borrow_request_details: {
      where: { borrow_histories: returnDateFilter },
      include: {
        assets: requestInclude.borrow_request_details.include.assets,
        borrow_histories: {
          include: {
            handed_over_by_users: { select: { id: true, name: true } },
            received_by_users: { select: { id: true, name: true } },
            handover_evidence: { include: { media_files: { select: mediaSelect } } },
            return_evidence: { include: { media_files: { select: mediaSelect } } },
          },
        },
      },
      orderBy: { id: 'asc' },
    },
  } as const;
};

function mapHistory(history: any): BorrowHistoryDto {
  const detail = history.borrow_request_details;
  return {
    id: history.id,
    detailId: detail.id,
    asset: {
      id: detail.assets.id,
      assetCode: detail.assets.asset_code,
      serialNumber: detail.assets.serial_number,
      qrCode: detail.assets.qr_code,
      imageUrl: mediaUrl(detail.assets.image_media) ?? detail.assets.image_url,
      status: detail.assets.status.toUpperCase(),
      model: { id: detail.assets.asset_models.id, name: detail.assets.asset_models.name },
    },
    borrower: {
      id: detail.borrow_requests.users.id,
      userCode: detail.borrow_requests.users.user_code,
      name: detail.borrow_requests.users.name,
      avatarUrl: mediaUrl(detail.borrow_requests.users.avatar_media) ?? detail.borrow_requests.users.avatar_url,
    },
    expectedReturnDate: dateOnlyFormatter.format(detail.expected_return_date),
    handedOverBy: history.handed_over_by_users,
    borrowedAt: history.borrow_date,
    receivedBy: history.received_by_users,
    returnedAt: history.return_date,
    returnCondition: history.return_condition,
    handoverEvidence: mapEvidence(history.handover_evidence),
    returnEvidence: mapEvidence(history.return_evidence),
  };
}

function mapHistoryDetail(history: any): BorrowHistoryDetailDto {
  const detail = history.borrow_request_details;
  const request = detail.borrow_requests;
  const asset = detail.assets;
  return {
    id: history.id,
    request: {
      id: request.id,
      status: request.status.toUpperCase() as BorrowRequestStatus,
      note: request.note,
      createdAt: request.created_at,
      requester: {
        id: request.users.id,
        userCode: request.users.user_code,
        name: request.users.name,
        email: request.users.email,
        avatarUrl: mediaUrl(request.users.avatar_media) ?? request.users.avatar_url,
        department: request.users.department
          ? { id: request.users.department.id, name: request.users.department.name }
          : null,
      },
    },
    asset: {
      id: asset.id,
      assetCode: asset.asset_code,
      serialNumber: asset.serial_number,
      qrCode: asset.qr_code,
      imageUrl: mediaUrl(asset.image_media) ?? asset.image_url,
      status: asset.status.toUpperCase(),
      model: { id: asset.asset_models.id, name: asset.asset_models.name },
    },
    expectedReturnDate: dateOnlyFormatter.format(detail.expected_return_date),
    approvalStatus: detail.approval_status as BorrowDetailStatus,
    approvedBy: detail.approved_by_users
      ? { id: detail.approved_by_users.id, name: detail.approved_by_users.name }
      : null,
    approvedAt: detail.approved_at,
    rejectionReason: detail.rejection_reason,
    handedOverBy: history.handed_over_by_users,
    borrowedAt: history.borrow_date,
    receivedBy: history.received_by_users,
    returnedAt: history.return_date,
    returnCondition: history.return_condition,
    handoverEvidence: mapEvidence(history.handover_evidence),
    returnEvidence: mapEvidence(history.return_evidence),
  };
}

function mapHandoverQueueItem(detail: any): HandoverQueueItemDto {
  return {
    detailId: detail.id,
    asset: {
      id: detail.assets.id,
      assetCode: detail.assets.asset_code,
      serialNumber: detail.assets.serial_number,
      qrCode: detail.assets.qr_code,
      imageUrl: mediaUrl(detail.assets.image_media) ?? detail.assets.image_url,
      status: detail.assets.status.toUpperCase(),
      model: { id: detail.assets.asset_models.id, name: detail.assets.asset_models.name },
    },
    expectedReturnDate: dateOnlyFormatter.format(detail.expected_return_date),
    approvedBy: detail.approved_by_users
      ? { id: detail.approved_by_users.id, name: detail.approved_by_users.name }
      : null,
    approvedAt: detail.approved_at,
  };
}

function mapBorrowRequester(user: any): BorrowRequesterDto {
  return {
    id: user.id,
    userCode: user.user_code,
    name: user.name,
    email: user.email,
    avatarUrl: mediaUrl(user.avatar_media) ?? user.avatar_url,
    department: user.department
      ? { id: user.department.id, name: user.department.name }
      : null,
  };
}

function mapHandoverQueueRequest(request: any): HandoverQueueRequestDto {
  const approvedDetails = request.borrow_request_details
    .filter((detail: any) => detail.approval_status === 'APPROVED');
  const pendingDetails = approvedDetails.filter((detail: any) =>
    detail.assets.status === 'reserved' && !detail.borrow_histories,
  );
  return {
    requestId: request.id,
    requestCreatedAt: request.created_at,
    requester: mapBorrowRequester(request.users),
    pendingCount: pendingDetails.length,
    approvedCount: approvedDetails.length,
    handedOverCount: approvedDetails.filter((detail: any) => detail.borrow_histories).length,
    items: pendingDetails.map(mapHandoverQueueItem),
  };
}

function mapReturnQueueRequest(request: any): ReturnQueueRequestDto {
  const detailsWithHistory = request.borrow_request_details
    .filter((detail: any) => detail.borrow_histories);
  const pendingDetails = detailsWithHistory
    .filter((detail: any) => !detail.borrow_histories.return_date);
  return {
    requestId: request.id,
    requestCreatedAt: request.created_at,
    requester: mapBorrowRequester(request.users),
    pendingCount: pendingDetails.length,
    returnedCount: detailsWithHistory.length - pendingDetails.length,
    items: pendingDetails.map((detail: any) => mapHistory({
      ...detail.borrow_histories,
      borrow_request_details: { ...detail, borrow_requests: request },
    })),
  };
}

function mapBorrowingActivityGroup(request: any): BorrowingActivityRequestGroupDto {
  const items = request.borrow_request_details.map((detail: any) => mapHistory({
    ...detail.borrow_histories,
    borrow_request_details: { ...detail, borrow_requests: request },
  }));
  return {
    requestId: request.id,
    requestCreatedAt: request.created_at,
    requester: mapBorrowRequester(request.users),
    itemCount: items.length,
    items,
  };
}

function mapRequest(request: any): BorrowRequestDto {
  return {
    id: request.id,
    requester: {
      id: request.users.id,
      userCode: request.users.user_code,
      name: request.users.name,
      email: request.users.email,
      avatarUrl: mediaUrl(request.users.avatar_media) ?? request.users.avatar_url,
      department: request.users.department
        ? { id: request.users.department.id, name: request.users.department.name }
        : null,
    },
    status: request.status.toUpperCase() as BorrowRequestStatus,
    note: request.note,
    createdAt: request.created_at,
    details: request.borrow_request_details.map((detail: any) => ({
      id: detail.id,
      asset: {
        id: detail.assets.id,
        assetCode: detail.assets.asset_code,
        serialNumber: detail.assets.serial_number,
        qrCode: detail.assets.qr_code,
      imageUrl: mediaUrl(detail.assets.image_media) ?? detail.assets.image_url,
        status: detail.assets.status.toUpperCase(),
        model: { id: detail.assets.asset_models.id, name: detail.assets.asset_models.name },
      },
      expectedReturnDate: dateOnlyFormatter.format(detail.expected_return_date),
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

  async createForRequester(
    requesterId: number,
    dto: CreateBorrowRequestDto,
    transaction: BorrowTransaction,
  ): Promise<BorrowRequestDto> {
    const assetIds = dto.items.map((item) => item.assetId);
    if (new Set(assetIds).size !== assetIds.length) throw new BorrowError('INVALID_ASSET_SELECTION');

    const availableCount = await transaction.assets.count({
      where: { id: { in: assetIds }, status: 'available' },
    });
    if (availableCount !== assetIds.length) throw new BorrowError('INVALID_ASSET_SELECTION');

    const request = await transaction.borrow_requests.create({
      data: {
        user_id: requesterId,
        note: dto.note,
        borrow_request_details: {
          create: dto.items.map((item) => ({
            asset_id: item.assetId,
            expected_return_date: item.expectedReturnDate,
          })),
        },
      },
      include: requestInclude,
    });
    return mapRequest(request);
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

  async findActionDetail(detailId: number, transaction: BorrowTransaction): Promise<BorrowActionDetail | null> {
    const detail = await transaction.borrow_request_details.findUnique({
      where: { id: detailId },
      include: {
        borrow_requests: { include: { users: { select: { id: true, name: true } } } },
        assets: { include: { asset_models: { select: { name: true } } } },
        borrow_histories: true,
      },
    });
    return detail
      ? {
          id: detail.id,
          requestId: detail.borrow_request_id,
          requesterId: detail.borrow_requests.user_id,
          requesterName: detail.borrow_requests.users.name,
          approvalStatus: detail.approval_status,
          assetId: detail.asset_id,
          assetCode: detail.assets.asset_code,
          assetModelName: detail.assets.asset_models.name,
          expectedReturnDate: detail.expected_return_date,
          assetStatus: detail.assets.status,
          historyId: detail.borrow_histories?.id ?? null,
        }
      : null;
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
    const history = await transaction.borrow_histories.findUnique({
      where: { id: historyId },
      include: {
        borrow_request_details: {
          include: {
            assets: { include: { asset_models: { select: { name: true } } } },
            borrow_requests: { include: { users: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    return history
      ? {
          id: history.id,
          detailId: history.borrow_request_detail_id,
          assetId: history.borrow_request_details.asset_id,
          assetCode: history.borrow_request_details.assets.asset_code,
          assetModelName: history.borrow_request_details.assets.asset_models.name,
          expectedReturnDate: history.borrow_request_details.expected_return_date,
          assetStatus: history.borrow_request_details.assets.status,
          requesterId: history.borrow_request_details.borrow_requests.user_id,
          requesterName: history.borrow_request_details.borrow_requests.users.name,
          returnedAt: history.return_date,
        }
      : null;
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
    const orderBy = [{ created_at: 'asc' as const }, { id: 'asc' as const }];

    if (query.approvalStatus !== 'ALL') {
      const where = { borrow_request_details: { some: { approval_status: query.approvalStatus } } };
      const [requests, total] = await this.prisma.$transaction([
        this.prisma.borrow_requests.findMany({
          where,
          orderBy,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          include: requestInclude,
        }),
        this.prisma.borrow_requests.count({ where }),
      ]);
      return { items: requests.map(mapRequest), ...query, total };
    }

    const pendingWhere = {
      borrow_request_details: { some: { approval_status: 'PENDING' as const } },
    };
    const nonPendingWhere = {
      AND: [
        { borrow_request_details: { some: {} } },
        { borrow_request_details: { none: { approval_status: 'PENDING' as const } } },
      ],
    };
    const offset = (query.page - 1) * query.pageSize;
    const [pendingTotal, nonPendingTotal] = await this.prisma.$transaction([
      this.prisma.borrow_requests.count({ where: pendingWhere }),
      this.prisma.borrow_requests.count({ where: nonPendingWhere }),
    ]);
    const pendingTake = Math.min(query.pageSize, Math.max(0, pendingTotal - offset));
    const nonPendingTake = query.pageSize - pendingTake;
    const nonPendingSkip = Math.max(0, offset - pendingTotal);
    const [pendingRequests, nonPendingRequests] = await this.prisma.$transaction([
      this.prisma.borrow_requests.findMany({
        where: pendingWhere,
        orderBy,
        skip: Math.min(offset, pendingTotal),
        take: pendingTake,
        include: requestInclude,
      }),
      this.prisma.borrow_requests.findMany({
        where: nonPendingWhere,
        orderBy,
        skip: nonPendingSkip,
        take: nonPendingTake,
        include: requestInclude,
      }),
    ]);
    return {
      items: [...pendingRequests, ...nonPendingRequests].map(mapRequest),
      ...query,
      total: pendingTotal + nonPendingTotal,
    };
  }

  async listHandoverQueue(query: PageQuery): Promise<PageDto<HandoverQueueRequestDto>> {
    const where = {
      borrow_request_details: {
        some: {
          approval_status: 'APPROVED',
          assets: { status: 'reserved' as const },
          borrow_histories: null,
        },
      },
    };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.borrow_requests.findMany({
        where,
        include: handoverQueueRequestInclude,
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.borrow_requests.count({ where }),
    ]);
    return { items: requests.map(mapHandoverQueueRequest), ...query, total };
  }

  async findHandoverQueueRequest(requestId: number): Promise<HandoverQueueRequestDto | null> {
    const request = await this.prisma.borrow_requests.findUnique({
      where: { id: requestId },
      include: handoverQueueRequestInclude,
    });
    return request ? mapHandoverQueueRequest(request) : null;
  }

  async listReturnQueue(query: PageQuery): Promise<PageDto<ReturnQueueRequestDto>> {
    const where = {
      borrow_request_details: {
        some: { borrow_histories: { return_date: null } },
      },
    };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.borrow_requests.findMany({
        where,
        include: returnQueueRequestInclude,
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.borrow_requests.count({ where }),
    ]);
    return { items: requests.map(mapReturnQueueRequest), ...query, total };
  }

  async findReturnQueueRequest(requestId: number): Promise<ReturnQueueRequestDto | null> {
    const request = await this.prisma.borrow_requests.findUnique({
      where: { id: requestId },
      include: returnQueueRequestInclude,
    });
    return request ? mapReturnQueueRequest(request) : null;
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

  async listBorrowingActivity(
    query: BorrowingActivityQuery,
    requesterId?: number,
  ): Promise<PageDto<BorrowingActivityRequestGroupDto>> {
    const returnDateFilter = query.state === 'CURRENT'
      ? { return_date: null }
      : { return_date: { not: null } };
    const where = {
      ...(requesterId !== undefined ? { user_id: requesterId } : {}),
      borrow_request_details: {
        some: { borrow_histories: returnDateFilter },
      },
    };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.borrow_requests.findMany({
        where,
        include: borrowingActivityRequestInclude(query.state),
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.borrow_requests.count({ where }),
    ]);
    return { items: requests.map(mapBorrowingActivityGroup), ...query, total };
  }

  async findHistoryDetail(historyId: number, requesterId?: number): Promise<BorrowHistoryDetailDto | null> {
    const history = await this.prisma.borrow_histories.findFirst({
      where: {
        id: historyId,
        ...(requesterId !== undefined
          ? { borrow_request_details: { borrow_requests: { user_id: requesterId } } }
          : {}),
      },
      include: historyDetailInclude,
    });
    return history ? mapHistoryDetail(history) : null;
  }
}
