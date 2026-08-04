import type {
  BorrowRequestDto,
  BorrowRequestListQuery,
  BorrowRequestPageDto,
  CreateBorrowRequestDto,
} from '@/models/borrow-lifecycle.model.js';
import type { IBorrowRequestRepository } from '@/repositories/borrow-request.repository.js';

export class BorrowRequestService {
  constructor(private readonly repository: IBorrowRequestRepository) {}

  create(requesterId: number, dto: CreateBorrowRequestDto): Promise<BorrowRequestDto> {
    return this.repository.createForRequester(requesterId, dto);
  }

  listMine(requesterId: number, query: BorrowRequestListQuery): Promise<BorrowRequestPageDto> {
    return this.repository.findPageForRequester(requesterId, query);
  }

  getMine(requestId: number, requesterId: number): Promise<BorrowRequestDto | null> {
    return this.repository.findDetailForRequester(requestId, requesterId);
  }
}
