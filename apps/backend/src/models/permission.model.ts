export interface Permission {
  id: number;
  name: string;
  code: string;
}

export interface CreatePermissionDto {
  name: string;
  code: string;
}

export interface UpdatePermissionDto {
  name?: string;
  code?: string;
}
