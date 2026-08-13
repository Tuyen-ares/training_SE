export interface LoginInputDto {
  email: string;
  password: string;
}

export interface AuthenticatedUserDto {
  id: number;
  userCode: string;
  name: string;
  avatarUrl: string | null;
  email: string;
  phone: string;
  departmentId: number;
  roles: Array<{
    id: number;
    name: string;
  }>;
  permissionCodes: string[];
}

export interface AccessTokenPayload {
  sub: number;
  permissionCodes: string[];
}

export interface RefreshTokenPayload {
  sub: number;
  jti: string;
  familyId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface LoginResult extends TokenPair {
  user: AuthenticatedUserDto;
}

export interface RefreshResult extends TokenPair {
  user: AuthenticatedUserDto;
}
