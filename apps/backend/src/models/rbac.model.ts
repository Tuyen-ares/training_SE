export interface RoleOptionDto {
  id: number;
  name: string;
  isSystem?: boolean;
}

export interface RoleSummaryDto {
  id: number;
  name: string;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
}

export interface PermissionDto {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface RoleDetailDto extends RoleSummaryDto {
  permissions: PermissionDto[];
}

export interface CreateRoleInputDto {
  name: string;
  permissionIds: number[];
}

export interface UpdateRoleInputDto {
  name: string;
}

export interface ReplaceRolePermissionsInputDto {
  permissionIds: number[];
}

export interface ReplaceUserRolesInputDto {
  roleIds: number[];
}
