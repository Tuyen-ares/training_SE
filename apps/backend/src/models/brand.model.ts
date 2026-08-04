export interface Brand {
  id: number;
  name: string;
}

export interface CreateBrandDto {
  name: string;
}

export interface UpdateBrandDto {
  name?: string;
}
