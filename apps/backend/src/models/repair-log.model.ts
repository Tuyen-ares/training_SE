export interface RepairLog {
  id: number;
  asset_id: number;
  handled_by: number;
  start_date: Date;
  end_date: Date | null;
  cost: number;
  note: string | null;
}

export interface CreateRepairLogDto {
  asset_id: number;
  handled_by: number;
  end_date?: Date | null;
  cost?: number;
  note?: string | null;
}

export interface UpdateRepairLogDto {
  handled_by?: number;
  start_date?: Date;
  end_date?: Date | null;
  cost?: number;
  note?: string | null;
}
