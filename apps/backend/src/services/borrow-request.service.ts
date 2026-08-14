import type {
  BorrowRequestDto,
  BorrowRequestListQuery,
  BorrowRequestPageDto,
  CreateBorrowRequestDto,
} from '@/models/borrow-lifecycle.model.js';
import type { IBorrowRequestRepository } from '@/repositories/borrow-request.repository.js';
import type { PrismaClient } from '../../generated/prisma/index.js';
import type { NotificationService } from '@/services/notification.service.js';

export class BorrowRequestService {
  constructor(
    private readonly repository: IBorrowRequestRepository,
    private readonly notifications: NotificationService,
    private readonly prisma: PrismaClient,
  ) {}

  async create(requesterId: number, dto: CreateBorrowRequestDto): Promise<BorrowRequestDto> {
    return this.prisma.$transaction(async (transaction) => {
      const request = await this.repository.createForRequester(requesterId, dto, transaction);
      await this.notifications.notifyPermissionHoldersInTransaction(
        ['borrow_request.view_all', 'borrow_request.approve'],
        {
          notificationType: 'BORROW_REQUEST_CREATED',
          title: 'New borrow request',
          message: `Borrow request #${request.id} requires review.`,
          relatedEntityType: 'BORROW_REQUEST',
          relatedEntityId: request.id,
        },
        [requesterId],
        transaction,
      );
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
