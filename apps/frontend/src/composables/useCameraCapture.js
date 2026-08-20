import { computed, onBeforeUnmount, ref } from 'vue'

import { MEDIA_LIMITS } from '../constants/media'
import { CAMERA_OWNERS, cameraSession } from '../services/camera-session'
import { calculateResizeDimensions } from '../utils/image-processing'

export const CAMERA_PHASES = Object.freeze({
  IDLE: 'idle',
  STARTING: 'starting',
  READY: 'ready',
  CAPTURING: 'capturing',
  REVIEW: 'review',
  ERROR: 'error',
})

const READY_TIMEOUT_MS = 5000
const OWNER = CAMERA_OWNERS.MEDIA_CAPTURE
const VALID_FACING = ['user', 'environment']

export class CameraCaptureError extends Error {
  constructor(code, message, cause) {
    super(message)
    this.name = 'CameraCaptureError'
    this.code = code
    this.cause = cause
  }
}

function isFacing(value) {
  return VALID_FACING.includes(value)
}

function stopStreamTracks(stream) {
  if (!stream?.getTracks) return
  for (const track of stream.getTracks()) {
    try { track.stop?.() } catch { /* keep cleaning the remaining tracks */ }
  }
}

function cameraErrorFrom(error, fallbackCode = 'CAMERA_START_FAILED') {
  if (error instanceof CameraCaptureError) return error

  const codeByName = {
    NotAllowedError: 'CAMERA_PERMISSION_DENIED',
    PermissionDeniedError: 'CAMERA_PERMISSION_DENIED',
    NotFoundError: 'CAMERA_NOT_FOUND',
    DevicesNotFoundError: 'CAMERA_NOT_FOUND',
    NotReadableError: 'CAMERA_BUSY',
    TrackStartError: 'CAMERA_BUSY',
    OverconstrainedError: 'CAMERA_CONSTRAINT_FAILED',
    ConstraintNotSatisfiedError: 'CAMERA_CONSTRAINT_FAILED',
    AbortError: 'CAMERA_ABORTED',
    SecurityError: 'CAMERA_INSECURE_CONTEXT',
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

function cameraApiError() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return new CameraCaptureError('CAMERA_UNSUPPORTED', 'Live camera preview is not supported in this browser. Choose an image instead.')
  }
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return new CameraCaptureError('CAMERA_INSECURE_CONTEXT', 'Live camera preview requires a secure browser context. Choose an image instead.')
  }
  return null
}

function oppositeFacing(facing) {
  return facing === 'user' ? 'environment' : 'user'
}

export function useCameraCapture({ defaultFacing = 'environment' } = {}) {
  const requestedFacing = ref(isFacing(defaultFacing) ? defaultFacing : 'environment')
  const activeDeviceId = ref('')
  const actualFacing = ref(null)
  const previewMirrored = ref(false)
  const availableDevices = ref([])
  const phase = ref(CAMERA_PHASES.IDLE)
  const error = ref(null)
  const reviewFile = ref(null)
  const reviewUrl = ref('')
  const videoRef = ref(null)
  const ready = computed(() => phase.value === CAMERA_PHASES.READY)

  let operation = null
  let operationSequence = 0

  function clearReview() {
    if (reviewUrl.value) URL.revokeObjectURL(reviewUrl.value)
    reviewUrl.value = ''
    reviewFile.value = null
  }

  function setError(nextError) {
    error.value = nextError instanceof CameraCaptureError
      ? nextError
      : cameraErrorFrom(nextError)
  }

  function isCurrentOperation(candidate) {
    return operation === candidate && !candidate.tornDown && cameraSession.isCurrent(OWNER, candidate.token)
  }

  function updateActualCameraSettings(stream) {
    const track = stream?.getVideoTracks?.()[0] || stream?.getTracks?.().find((item) => item.kind === 'video')
    const settings = track?.getSettings?.() || {}
    activeDeviceId.value = typeof settings.deviceId === 'string' ? settings.deviceId : ''
    actualFacing.value = isFacing(settings.facingMode) ? settings.facingMode : null
    previewMirrored.value = actualFacing.value === 'user'
  }

  function removeTrackListeners(candidate) {
    for (const { track, listener } of candidate.trackListeners) {
      try { track.removeEventListener?.('ended', listener) } catch { /* already detached */ }
    }
    candidate.trackListeners = []
  }

  function registerTrackListeners(candidate, stream) {
    const tracks = stream?.getVideoTracks?.() || stream?.getTracks?.().filter((track) => track.kind === 'video') || []
    for (const track of tracks) {
      const listener = () => {
        if (!isCurrentOperation(candidate) || candidate.intentional || candidate.trackEnded) return
        candidate.trackEnded = true
        candidate.generation += 1
        void cameraSession.forceStop(OWNER, 'track-ended', candidate.token).catch((cleanupError) => {
          setError(cleanupError)
          phase.value = CAMERA_PHASES.ERROR
        })
      }
      track.addEventListener?.('ended', listener)
      candidate.trackListeners.push({ track, listener })
    }
  }

  function waitForVideoReady(candidate, video) {
    return new Promise((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => finishReject(new CameraCaptureError('CAMERA_VIDEO_NOT_READY', 'The camera preview did not become ready. Try again or choose an image.')), READY_TIMEOUT_MS)

      function cleanup() {
        clearTimeout(timer)
        video.removeEventListener?.('loadedmetadata', check)
        video.removeEventListener?.('canplay', check)
        candidate.cancelReadiness = null
      }

      function finishResolve() {
        if (settled) return
        settled = true
        cleanup()
        resolve()
      }

      function finishReject(nextError) {
        if (settled) return
        settled = true
        cleanup()
        reject(nextError)
      }

      function check() {
        if (!isCurrentOperation(candidate)) {
          finishReject(new CameraCaptureError('CAMERA_STOPPED', 'Camera startup was interrupted.'))
          return
        }
        if (video.videoWidth > 0 && video.videoHeight > 0) finishResolve()
      }

      candidate.cancelReadiness = () => finishReject(new CameraCaptureError('CAMERA_STOPPED', 'Camera startup was interrupted.'))
      video.addEventListener?.('loadedmetadata', check)
      video.addEventListener?.('canplay', check)
      check()
    })
  }

  async function teardownOperation(candidate, reason) {
    if (candidate.teardownPromise) return candidate.teardownPromise

    candidate.teardownPromise = (async () => {
      candidate.intentional = true
      candidate.cancelReadiness?.()
      removeTrackListeners(candidate)

      const stream = candidate.stream
      candidate.stream = null
      candidate.tornDown = true
      const ownsVideoElement = operation === candidate
      if (operation === candidate) operation = null

      let stopError = null
      const tracks = stream?.getTracks?.() || []
      for (const track of tracks) {
        try { track.stop?.() } catch (trackError) { stopError ||= trackError }
      }

      const video = videoRef.value
      if (video && ownsVideoElement && (video.srcObject === stream || video.srcObject)) video.srcObject = null
      activeDeviceId.value = ''
      actualFacing.value = null
      previewMirrored.value = false

      if (reason === 'track-ended') {
        setError(new CameraCaptureError('CAMERA_STREAM_ENDED', 'The camera stream ended unexpectedly. Try again or choose an image.'))
        phase.value = CAMERA_PHASES.ERROR
      } else if (reason === 'preempted' && !reviewFile.value) {
        setError(new CameraCaptureError('CAMERA_BUSY', 'The camera is being used by another workflow. Try again or choose an image.'))
        phase.value = CAMERA_PHASES.ERROR
      } else if (!reviewFile.value && reason !== 'capture' && reason !== 'capture-error') {
        phase.value = CAMERA_PHASES.IDLE
      }

      if (stopError) throw stopError
    })()

    return candidate.teardownPromise
  }

  async function releaseOperation(candidate, reason) {
    try {
      await teardownOperation(candidate, reason)
    } catch (cleanupError) {
      throw cameraErrorFrom(cleanupError, 'CAMERA_CLEANUP_FAILED')
    }
    cameraSession.release(OWNER, candidate.token)
  }

  async function enumerateCameras() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      availableDevices.value = []
      return []
    }
    const devices = await navigator.mediaDevices.enumerateDevices()
    availableDevices.value = devices.filter((device) => device.kind === 'videoinput')
    return availableDevices.value
  }

  async function startWithConstraints(constraints, { preserveReview = false } = {}) {
    const apiError = cameraApiError()
    if (apiError) {
      setError(apiError)
      phase.value = preserveReview && reviewFile.value ? CAMERA_PHASES.REVIEW : CAMERA_PHASES.ERROR
      return false
    }

    error.value = null
    phase.value = CAMERA_PHASES.STARTING
    const candidate = { token: null, generation: ++operationSequence, stream: null, tornDown: false, intentional: false, trackEnded: false, trackListeners: [], cancelReadiness: null, teardownPromise: null }
    let lease

    try {
      let ownerTeardown = () => Promise.resolve()
      ownerTeardown = (reason) => teardownOperation(candidate, reason)
      lease = await cameraSession.acquire(OWNER, ownerTeardown)
      candidate.token = lease.token
      operation = candidate

      const pending = Promise.resolve().then(() => navigator.mediaDevices.getUserMedia(constraints))
      const tracked = pending.then((stream) => {
        if (!isCurrentOperation(candidate)) {
          stopStreamTracks(stream)
          return null
        }
        return stream
      })
      cameraSession.trackPending(OWNER, candidate.token, tracked)
      const stream = await tracked
      if (!stream || !isCurrentOperation(candidate)) return false

      candidate.stream = stream
      const video = videoRef.value
      if (!video) throw new CameraCaptureError('CAMERA_VIDEO_MISSING', 'Camera preview is unavailable. Try again or choose an image.')
      video.srcObject = stream
      const playResult = video.play?.()
      if (playResult?.then) await playResult
      await waitForVideoReady(candidate, video)
      if (!isCurrentOperation(candidate)) return false

      updateActualCameraSettings(stream)
      registerTrackListeners(candidate, stream)
      if (preserveReview) clearReview()
      phase.value = CAMERA_PHASES.READY
      await enumerateCameras().catch(() => { availableDevices.value = [] })
      return true
    } catch (startError) {
      if (!lease) {
        setError(cameraErrorFrom(startError, 'CAMERA_BUSY'))
        phase.value = preserveReview && reviewFile.value ? CAMERA_PHASES.REVIEW : CAMERA_PHASES.ERROR
        return false
      }
      if (candidate.tornDown || !cameraSession.isCurrent(OWNER, candidate.token)) {
        if (preserveReview && reviewFile.value && phase.value !== CAMERA_PHASES.ERROR) phase.value = CAMERA_PHASES.REVIEW
        return false
      }

      const normalized = cameraErrorFrom(startError)
      try {
        await releaseOperation(candidate, 'error')
      } catch (cleanupError) {
        setError(cleanupError)
        phase.value = CAMERA_PHASES.ERROR
        return false
      }
      setError(normalized)
      phase.value = preserveReview && reviewFile.value ? CAMERA_PHASES.REVIEW : CAMERA_PHASES.ERROR
      return false
    }
  }

  async function start() {
    if (phase.value === CAMERA_PHASES.READY || phase.value === CAMERA_PHASES.STARTING || phase.value === CAMERA_PHASES.CAPTURING) return false
    const preserveReview = phase.value === CAMERA_PHASES.REVIEW && Boolean(reviewFile.value)
    return startWithConstraints({ video: { facingMode: { ideal: requestedFacing.value } }, audio: false }, { preserveReview })
  }

  async function retake() {
    if (phase.value !== CAMERA_PHASES.REVIEW || !reviewFile.value) return start()
    return startWithConstraints({ video: { facingMode: { ideal: requestedFacing.value } }, audio: false }, { preserveReview: true })
  }

  async function switchCamera() {
    if (!ready.value || !operation) return false
    const oldOperation = operation
    const previousDeviceId = activeDeviceId.value
    const previousFacing = actualFacing.value || requestedFacing.value
    const devices = await enumerateCameras().catch(() => [])
    const nextDevice = previousDeviceId
      ? devices.find((device) => device.deviceId && device.deviceId !== previousDeviceId)
      : devices[1]
    if (!nextDevice) {
      setError(new CameraCaptureError('CAMERA_NO_ALTERNATIVE', 'No other camera is available.'))
      return false
    }

    try {
      await cameraSession.forceStop(OWNER, 'switch', oldOperation.token)
    } catch (switchCleanupError) {
      setError(switchCleanupError)
      phase.value = CAMERA_PHASES.ERROR
      return false
    }

    requestedFacing.value = oppositeFacing(previousFacing)
    const switched = await startWithConstraints({ video: { deviceId: { exact: nextDevice.deviceId } }, audio: false })
    if (switched) return true

    const fallback = await startWithConstraints({ video: { facingMode: { ideal: requestedFacing.value } }, audio: false })
    if (fallback) return true

    const restoredByDevice = previousDeviceId
      ? await startWithConstraints({ video: { deviceId: { exact: previousDeviceId } }, audio: false })
      : false
    if (restoredByDevice) {
      requestedFacing.value = previousFacing
      return true
    }

    const restoredByFacing = await startWithConstraints({ video: { facingMode: { ideal: previousFacing } }, audio: false })
    if (restoredByFacing) {
      requestedFacing.value = previousFacing
      return true
    }

    setError(new CameraCaptureError('CAMERA_SWITCH_FAILED', 'The camera could not be switched or restored. Choose an image instead.'))
    phase.value = CAMERA_PHASES.ERROR
    return false
  }

  async function capture() {
    if (!ready.value || !operation) return null
    const candidate = operation
    const video = videoRef.value
    phase.value = CAMERA_PHASES.CAPTURING
    let review
    let localReviewUrl = ''

    try {
      if (!video || !video.videoWidth || !video.videoHeight || !isCurrentOperation(candidate)) {
        throw new CameraCaptureError('CAMERA_VIDEO_NOT_READY', 'The camera preview is not ready yet.')
      }
      const dimensions = calculateResizeDimensions(video.videoWidth, video.videoHeight, MEDIA_LIMITS.maxImageEdgePixels)
      const canvas = document.createElement('canvas')
      canvas.width = dimensions.width
      canvas.height = dimensions.height
      const context = canvas.getContext('2d')
      if (!context) throw new CameraCaptureError('CAMERA_ENCODE_FAILED', 'The image could not be created. Try again.')
      context.drawImage(video, 0, 0, dimensions.width, dimensions.height)
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((nextBlob) => nextBlob ? resolve(nextBlob) : reject(new CameraCaptureError('CAMERA_ENCODE_FAILED', 'The image could not be created. Try again.')), 'image/jpeg', 0.95)
      })
      if (!isCurrentOperation(candidate)) throw new CameraCaptureError('CAMERA_STREAM_ENDED', 'The camera stream ended unexpectedly. Try again or choose an image.')
      review = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
      localReviewUrl = URL.createObjectURL(review)
      await releaseOperation(candidate, 'capture')
      reviewFile.value = review
      reviewUrl.value = localReviewUrl
      error.value = null
      phase.value = CAMERA_PHASES.REVIEW
      return review
    } catch (captureError) {
      if (localReviewUrl) URL.revokeObjectURL(localReviewUrl)
      if (!candidate.tornDown && cameraSession.isCurrent(OWNER, candidate.token)) {
        try { await releaseOperation(candidate, 'capture-error') } catch (cleanupError) { captureError = cleanupError }
      }
      setError(captureError)
      phase.value = CAMERA_PHASES.ERROR
      return null
    }
  }

  function acceptReview() {
    if (phase.value !== CAMERA_PHASES.REVIEW || !reviewFile.value) return null
    const file = reviewFile.value
    clearReview()
    error.value = null
    phase.value = CAMERA_PHASES.IDLE
    return file
  }

  function cancelReview() {
    clearReview()
    error.value = null
    phase.value = CAMERA_PHASES.IDLE
  }

  async function stop(reason = 'close') {
    const candidate = operation
    if (candidate && cameraSession.isCurrent(OWNER, candidate.token)) {
      try { await releaseOperation(candidate, reason) } catch (cleanupError) {
        setError(cleanupError)
        phase.value = CAMERA_PHASES.ERROR
        return false
      }
    }
    return true
  }

  async function close() {
    await stop('close')
    cancelReview()
  }

  onBeforeUnmount(() => {
    void close()
  })

  return {
    requestedFacing,
    activeDeviceId,
    actualFacing,
    previewMirrored,
    availableDevices,
    phase,
    error,
    reviewFile,
    reviewUrl,
    videoRef,
    ready,
    start,
    retake,
    switchCamera,
    capture,
    acceptReview,
    cancelReview,
    stop,
    close,
    reset: close,
  }
}
