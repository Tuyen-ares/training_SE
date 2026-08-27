import type {
  BorrowRequestDto,
  BorrowRequestListQuery,
  BorrowRequestPageDto,
  CreateBorrowRequestDto,
} from '@/models/borrow-lifecycle.model.js';
import type { IBorrowRequestRepository } from '@/repositories/borrow-request.repository.js';
import type { PrismaClient } from '../../generated/prisma/index.js';
import type { DomainEventWriter } from '@/notifications/domain-event.js';

export class BorrowRequestService {
  constructor(
    private readonly repository: IBorrowRequestRepository,
    private readonly events: DomainEventWriter,
    private readonly prisma: PrismaClient,
  ) {}

  async create(requesterId: number, dto: CreateBorrowRequestDto): Promise<BorrowRequestDto> {
    return this.prisma.$transaction(async (transaction) => {
      const request = await this.repository.createForRequester(requesterId, dto, transaction);
      await this.events.append({
        eventType: 'borrow_request.created',
        aggregateType: 'BORROW_REQUEST',
        aggregateId: request.id,
        actorUserId: requesterId,
        payload: {
          requestId: request.id,
          requesterId,
          requesterName: request.requester.name,
          actorName: request.requester.name,
          items: request.details.map((detail) => ({
            detailId: detail.id,
            assetId: detail.asset.id,
            assetCode: detail.asset.assetCode,
            assetModelName: detail.asset.model.name,
            expectedReturnDate: detail.expectedReturnDate,
          })),
          deepLinkContext: {
            entityType: 'BORROW_REQUEST',
            entityId: request.id,
          },
        },
      }, transaction);
      return request;
    });
  }

  listMine(requesterId: number, query: BorrowRequestListQuery): Promise<BorrowRequestPageDto> {
    return this.repository.findPageForRequester(requesterId, query);
  }

  getMine(requestId: number, requesterId: number): Promise<BorrowRequestDto | null> {
    return this.repository.findDetailForRequester(requestId, requesterId);
  }
}
