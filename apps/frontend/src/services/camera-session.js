const MEDIA_CAPTURE_OWNER = 'media-capture'
const QR_SCANNER_OWNER = 'qr-scanner'

export const CAMERA_OWNERS = Object.freeze({
  MEDIA_CAPTURE: MEDIA_CAPTURE_OWNER,
  QR_SCANNER: QR_SCANNER_OWNER,
})

export class CameraSessionError extends Error {
  constructor(code, message, cause) {
    super(message)
    this.name = 'CameraSessionError'
    this.code = code
    this.cause = cause
  }
}

let activeLease = null
let leaseSequence = 0
let acquisitionQueue = Promise.resolve()

function createToken() {
  leaseSequence += 1
  return `camera-lease-${leaseSequence}`
}

function matchesLease(lease, owner, token) {
  return Boolean(lease && lease.owner === owner && lease.token === token)
}

function normalizeCleanupError(error) {
  if (error instanceof CameraSessionError) return error
  return new CameraSessionError(
    'CAMERA_CLEANUP_FAILED',
    'Không thể giải phóng camera. Vui lòng thử lại sau.',
    error,
  )
}

async function waitForPending(lease) {
  while (lease.pending.size) {
    await Promise.allSettled([...lease.pending])
  }
}

function release(owner, token) {
  if (!matchesLease(activeLease, owner, token)) return false
  activeLease = null
  return true
}

async function forceStop(owner, reason = 'forced-stop', token) {
  const lease = activeLease
  if (!matchesLease(lease, owner, token)) return false
  if (lease.forceStopPromise) return lease.forceStopPromise

  lease.state = 'stopping'
  const attempt = (async () => {
    let cleanupError = null
    try {
      await lease.teardown(reason)
    } catch (error) {
      cleanupError = normalizeCleanupError(error)
    }

    await waitForPending(lease)

    if (cleanupError) {
      lease.state = 'cleanup-failed'
      throw cleanupError
    }

    release(owner, token)
    return true
  })()
  lease.forceStopPromise = attempt

  try {
    return await attempt
  } finally {
    if (lease.forceStopPromise === attempt) lease.forceStopPromise = null
  }
}

function trackPending(owner, token, pending) {
  const lease = activeLease
  if (!matchesLease(lease, owner, token)) return pending

  let tracked
  tracked = Promise.resolve(pending)
    .then(() => undefined, () => undefined)
    .finally(() => lease.pending.delete(tracked))
  lease.pending.add(tracked)
  return pending
}

async function acquire(owner, teardown) {
  const request = acquisitionQueue.then(async () => {
    if (activeLease) {
      try {
        await forceStop(activeLease.owner, 'preempted', activeLease.token)
      } catch (error) {
        throw new CameraSessionError(
          'CAMERA_BUSY',
          'Camera is busy and could not be released safely.',
          error,
        )
      }
    }

    if (activeLease) {
      throw new CameraSessionError('CAMERA_BUSY', 'Camera is currently in use.')
    }

    if (typeof teardown !== 'function') {
      throw new TypeError('A camera owner must provide a teardown callback.')
    }

    const lease = {
      owner,
      token: createToken(),
      teardown,
      pending: new Set(),
      state: 'active',
      forceStopPromise: null,
    }
    activeLease = lease

    return {
      owner: lease.owner,
      token: lease.token,
    }
  })

  acquisitionQueue = request.catch(() => {})
  return request
}

function getActiveLease() {
  if (!activeLease) return null
  return {
    owner: activeLease.owner,
    token: activeLease.token,
    state: activeLease.state,
  }
}

function isCurrent(owner, token) {
  return matchesLease(activeLease, owner, token) && activeLease.state === 'active'
}

function stopCurrent(reason) {
  if (!activeLease) return Promise.resolve(false)
  return forceStop(activeLease.owner, reason, activeLease.token).catch((error) => {
    // Global lifecycle events cannot surface an async error to the caller.
    // Keeping the failed lease active prevents a second owner from racing it.
    return error
  })
}

function handlePageHide() {
  void stopCurrent('pagehide')
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') void stopCurrent('visibility-hidden')
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', handlePageHide)
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibilityChange)

export { acquire, release, forceStop, trackPending, getActiveLease, isCurrent }

export const cameraSession = {
  acquire,
  release,
  forceStop,
  trackPending,
  getActiveLease,
  isCurrent,
  // Test-only reset. Production code never needs to bypass an owner teardown.
  resetForTests() {
    activeLease = null
    acquisitionQueue = Promise.resolve()
  },
}
