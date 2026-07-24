export interface AuthRoleRecord {
  id: number;
  name: string;
}

export interface AuthUserRecord {
  id: number;
  departmentId: number;
  name: string;
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
