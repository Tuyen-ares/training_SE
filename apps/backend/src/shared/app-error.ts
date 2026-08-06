export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InvalidStateTransitionError extends ConflictError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

export type AssetIssueErrorCode =
  | 'ASSET_NOT_FOUND'
  | 'ISSUE_NOT_FOUND'
  | 'REPORT_FORBIDDEN'
  | 'INVALID_ISSUE_STATE';

export class AssetIssueError extends Error {
  constructor(public readonly code: AssetIssueErrorCode) {
    super(code);
    this.name = 'AssetIssueError';
  }
}

export type AuthErrorCode =
  | 'EMAIL_IN_USE'
  | 'PHONE_IN_USE'
  | 'INVALID_DEPARTMENT'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_REUSED';

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

export type UserErrorCode =
  | 'EMAIL_IN_USE'
  | 'PHONE_IN_USE'
  | 'INVALID_DEPARTMENT'
  | 'INVALID_ROLE_SET'
  | 'USER_NOT_FOUND';

export class UserError extends Error {
  constructor(public readonly code: UserErrorCode) {
    super(code);
    this.name = 'UserError';
  }
}

export type RbacErrorCode =
  | 'INVALID_ROLE_SET'
  | 'DEFAULT_ROLE_NOT_FOUND'
  | 'USER_NOT_FOUND';

export class RbacError extends Error {
  constructor(public readonly code: RbacErrorCode) {
    super(code);
    this.name = 'RbacError';
  }
}

export type BorrowErrorCode =
  | 'REQUEST_NOT_FOUND'
  | 'REQUEST_FORBIDDEN'
  | 'INVALID_ASSET_SELECTION';

export class BorrowError extends Error {
  constructor(public readonly code: BorrowErrorCode) {
    super(code);
    this.name = 'BorrowError';
  }
}
