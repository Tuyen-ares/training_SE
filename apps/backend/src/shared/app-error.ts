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
  | 'INVALID_ISSUE_STATE'
  | 'VENDOR_PERMISSION_REQUIRED'
  | 'VENDOR_NOT_FOUND'
  | 'VENDOR_INACTIVE';

export class AssetIssueError extends Error {
  constructor(public readonly code: AssetIssueErrorCode) {
    super(code);
    this.name = 'AssetIssueError';
  }
}

export type AuthErrorCode =
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
  | 'INVALID_PERMISSION_SET'
  | 'DEFAULT_ROLE_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'ROLE_NOT_FOUND'
  | 'ROLE_NAME_IN_USE'
  | 'SYSTEM_ROLE_RENAME_FORBIDDEN'
  | 'ESSENTIAL_ADMIN_REQUIRED'
  | 'ESSENTIAL_PERMISSION_MISSING';

export class RbacError extends Error {
  constructor(public readonly code: RbacErrorCode) {
    super(code);
    this.name = 'RbacError';
  }
}

export type RegistrationErrorCode =
  | 'EMAIL_IN_USE'
  | 'PHONE_IN_USE'
  | 'PENDING_EMAIL_EXISTS'
  | 'PENDING_PHONE_EXISTS'
  | 'REQUEST_NOT_FOUND'
  | 'REQUEST_ALREADY_REVIEWED'
  | 'INVALID_DEPARTMENT'
  | 'INVALID_ROLE_SET'
  | 'PASSWORD_HASH_MISSING';

export class RegistrationError extends Error {
  constructor(public readonly code: RegistrationErrorCode) {
    super(code);
    this.name = 'RegistrationError';
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
