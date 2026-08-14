export interface Department {
  id: number;
  name: string;
  isActive: boolean;
}

export interface CreateDepartmentDto {
  name: string;
}

export interface UpdateDepartmentDto {
  name: string;
}
