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
  roles: AuthRoleRecord[];
  permissionCodes: string[];
}

export interface CreateAuthUserData {
  departmentId: number;
  roleId: number;
  name: string;
  passwordHash: string;
  email: string;
  phone: string;
}

export interface IAuthRepository {
  emailExists(email: string): Promise<boolean>;
  phoneExists(phone: string): Promise<boolean>;
  departmentExists(departmentId: number): Promise<boolean>;
  findRoleIdByName(name: string): Promise<number | null>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: number): Promise<AuthUserRecord | null>;
  createUserWithRole(data: CreateAuthUserData): Promise<void>;
}
