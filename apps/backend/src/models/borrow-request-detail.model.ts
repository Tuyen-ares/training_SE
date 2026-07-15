export interface BorrowRequestDetail {
  id: number;
  borrow_request_id: number;
  asset_id: number;
  expected_return_date: Date;
}

export interface CreateBorrowRequestDetailDto {
  borrow_request_id: number;
  asset_id: number;
  expected_return_date: Date;
}

export interface UpdateBorrowRequestDetailDto {
  expected_return_date?: Date;
}
