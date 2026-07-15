export interface Role {
  id: number;
  name: string;
}

export interface CreateRoleDto {
  name: string;
}

export interface UpdateRoleDto {
  name?: string;
}
