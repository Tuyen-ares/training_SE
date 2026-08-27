const VALID_FACING = ['user', 'environment']

export class CameraCaptureError extends Error {
  constructor(code, message, cause) {
    super(message)
    this.name = 'CameraCaptureError'
    this.code = code
    this.cause = cause
  }
}

export function isFacing(value) {
  return VALID_FACING.includes(value)
}

export function oppositeFacing(facing) {
  return facing === 'user' ? 'environment' : 'user'
}

export function cameraErrorFrom(error, fallbackCode = 'CAMERA_START_FAILED') {
  if (error instanceof CameraCaptureError) return error

  const codeByName = {
    NotAllowedError: 'CAMERA_PERMISSION_DENIED', PermissionDeniedError: 'CAMERA_PERMISSION_DENIED',
    NotFoundError: 'CAMERA_NOT_FOUND', DevicesNotFoundError: 'CAMERA_NOT_FOUND',
    NotReadableError: 'CAMERA_BUSY', TrackStartError: 'CAMERA_BUSY',
    OverconstrainedError: 'CAMERA_CONSTRAINT_FAILED', ConstraintNotSatisfiedError: 'CAMERA_CONSTRAINT_FAILED',
    AbortError: 'CAMERA_ABORTED', SecurityError: 'CAMERA_INSECURE_CONTEXT',
  }
  const code = error?.code || codeByName[error?.name] || fallbackCode
  const messages = {
    CAMERA_PERMISSION_DENIED: 'Camera permission was denied. Allow camera access or choose an image instead.',
    CAMERA_NOT_FOUND: 'No camera was found. Choose an image instead.',
    CAMERA_BUSY: 'The camera is busy or unavailable. Close other camera apps and try again.',
    CAMERA_CONSTRAINT_FAILED: 'That camera is unavailable. Try another camera or choose an image.',
    CAMERA_ABORTED: 'Camera startup was interrupted. Try again or choose an image.',
    CAMERA_INSECURE_CONTEXT: 'Live camera preview requires a secure browser context. Choose an image instead.',
    CAMERA_START_FAILED: 'The camera could not be started. Try again or choose an image.',
    CAMERA_CLEANUP_FAILED: 'The camera could not be released safely. Try again later or choose an image.',
  }
  return new CameraCaptureError(code, messages[code] || messages.CAMERA_START_FAILED, error)
}

export function cameraApiError() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return new CameraCaptureError('CAMERA_UNSUPPORTED', 'Live camera preview is not supported in this browser. Choose an image instead.')
  }
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return new CameraCaptureError('CAMERA_INSECURE_CONTEXT', 'Live camera preview requires a secure browser context. Choose an image instead.')
  }
  return null
}
