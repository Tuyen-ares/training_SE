export interface AuthRoleRecord {
  id: number;
  name: string;
}

export interface AuthUserRecord {
  id: number;
  userCode: string;
  departmentId: number;
  name: string;
  avatarUrl: string | null;
  passwordHash: string;
  email: string;
  phone: string;
  isActive: boolean;
  roles: AuthRoleRecord[];
  permissionCodes: string[];
}

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: number): Promise<AuthUserRecord | null>;
}
