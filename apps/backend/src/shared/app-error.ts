export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export type AuthErrorCode =
  | 'EMAIL_IN_USE'
  | 'PHONE_IN_USE'
  | 'INVALID_DEPARTMENT'
  | 'INVALID_CREDENTIALS';

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}
