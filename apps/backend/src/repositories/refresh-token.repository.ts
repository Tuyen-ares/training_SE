export interface RefreshTokenIdentity {
  jti: string;
  userId: number;
  familyId: string;
}

export interface CreateRefreshTokenData extends RefreshTokenIdentity {
  expiresAt: Date;
}

export type RefreshTokenRotationResult = 'ROTATED' | 'INVALID' | 'REUSED';

export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<void>;
  findByJti(jti: string): Promise<CreateRefreshTokenData | null>;
  rotate(
    current: RefreshTokenIdentity,
    replacement: CreateRefreshTokenData,
  ): Promise<RefreshTokenRotationResult>;
  revokeFamily(familyId: string): Promise<void>;
}
