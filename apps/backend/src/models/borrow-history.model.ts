export interface BorrowHistory {
  id: number;
  borrow_request_detail_id: number;
  borrow_date: Date;
  return_date: Date | null;
}

export interface CreateBorrowHistoryDto {
  borrow_request_detail_id: number;
  return_date?: Date | null;
}

export interface UpdateBorrowHistoryDto {
  return_date?: Date | null;
}
