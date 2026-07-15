export type BorrowRequestStatus = 'pending' | 'approved' | 'rejected';

export interface BorrowRequest {
  id: number;
  user_id: number;
  status: BorrowRequestStatus;
  created_at: Date;
  approved_by: number | null;
  approved_at: Date | null;
  note: string | null;
}

export interface CreateBorrowRequestDto {
  user_id: number;
  note?: string | null;
}

export interface UpdateBorrowRequestDto {
  status?: BorrowRequestStatus;
  approved_by?: number | null;
  approved_at?: Date | null;
  note?: string | null;
}
