export interface UserRoleDto {
  id: number;
  name: string;
}

export interface UserDepartmentDto {
  id: number;
  name: string;
}

export interface UserResponseDto {
  id: number;
  userCode: string;
  departmentId: number;
  department: UserDepartmentDto;
  name: string;
  avatarUrl: string | null;
  avatarMediaId?: number | null;
  email: string;
  phone: string;
  isActive: boolean;
  roles: UserRoleDto[];
}

export interface CreateUserInputDto {
  departmentId: number;
  name: string;
  avatarUrl?: string | null;
  avatarMediaId?: number | null;
  email: string;
  phone: string;
  password: string;
  roleIds?: number[];
}

export interface UpdateUserInputDto {
  departmentId?: number;
  name?: string;
  avatarUrl?: string | null;
  avatarMediaId?: number | null;
  email?: string;
  phone?: string;
  password?: string;
  roleIds?: number[];
}

export interface UpdateSelfProfileInputDto {
  name?: string;
  avatarUrl?: string | null;
  avatarMediaId?: number | null;
  phone?: string;
}

export interface ChangePasswordInputDto {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserData {
  departmentId: number;
  name: string;
  avatarUrl?: string | null;
  avatarMediaId?: number | null;
  email: string;
  phone: string;
  passwordHash: string;
}

export interface UpdateUserData {
  departmentId?: number;
  name?: string;
  avatarUrl?: string | null;
  avatarMediaId?: number | null;
  email?: string;
  phone?: string;
  passwordHash?: string;
}

export type UserStatusFilter = 'active' | 'inactive' | 'all';
