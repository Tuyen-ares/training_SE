import type {
  BorrowRequestDto,
  BorrowRequestListQuery,
  BorrowRequestPageDto,
  CreateBorrowRequestDto,
} from '@/models/borrow-lifecycle.model.js';
import type { IBorrowRequestRepository } from '@/repositories/borrow-request.repository.js';
import type { NotificationService } from '@/services/notification.service.js';

export class BorrowRequestService {
  constructor(
    private readonly repository: IBorrowRequestRepository,
    private readonly notifications?: NotificationService,
  ) {}

  async create(requesterId: number, dto: CreateBorrowRequestDto): Promise<BorrowRequestDto> {
    const request = await this.repository.createForRequester(requesterId, dto);
    if (this.notifications) {
      await this.notifications.notifyPermissionHolders(
        ['borrow_request.view_all', 'borrow_request.approve'],
        {
          notificationType: 'BORROW_REQUEST_CREATED',
          title: 'New borrow request',
          message: `Borrow request #${request.id} requires review.`,
          relatedEntityType: 'BORROW_REQUEST',
          relatedEntityId: request.id,
        },
        [requesterId],
      );
    }
    return request;
  }

  listMine(requesterId: number, query: BorrowRequestListQuery): Promise<BorrowRequestPageDto> {
    return this.repository.findPageForRequester(requesterId, query);
  }

  getMine(requestId: number, requesterId: number): Promise<BorrowRequestDto | null> {
    return this.repository.findDetailForRequester(requestId, requesterId);
  }
}
