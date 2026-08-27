import { CAMERA_OWNERS, cameraSession } from '../../services/camera-session'
import { CameraCaptureError, cameraApiError, cameraErrorFrom, isFacing } from './camera-errors'

const READY_TIMEOUT_MS = 5000
const OWNER = CAMERA_OWNERS.MEDIA_CAPTURE

function stopStaleStream(stream) {
  for (const track of stream?.getTracks?.() || []) {
    try { track.stop?.() } catch { /* stale streams have no lease to retain */ }
  }
}

export function createCameraStreamController({ videoRef, onSettings, onStopped, onUnexpectedEnd }) {
  let operation = null

  const isCurrent = (candidate) => operation === candidate && cameraSession.isCurrent(OWNER, candidate.token)

  function removeTrackListeners(candidate) {
    for (const { track, listener } of candidate.trackListeners) {
      try { track.removeEventListener?.('ended', listener) } catch { /* already detached */ }
    }
    candidate.trackListeners = []
  }

  function waitForReady(candidate, video) {
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (callback, value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        video.removeEventListener?.('loadedmetadata', check)
        video.removeEventListener?.('canplay', check)
        candidate.cancelReadiness = null
        callback(value)
      }
      const check = () => {
        if (!isCurrent(candidate)) return finish(reject, new CameraCaptureError('CAMERA_STOPPED', 'Camera startup was interrupted.'))
        if (video.videoWidth > 0 && video.videoHeight > 0) finish(resolve)
      }
      const timer = setTimeout(() => finish(reject, new CameraCaptureError('CAMERA_VIDEO_NOT_READY', 'The camera preview did not become ready. Try again or choose an image.')), READY_TIMEOUT_MS)
      candidate.cancelReadiness = () => finish(reject, new CameraCaptureError('CAMERA_STOPPED', 'Camera startup was interrupted.'))
      video.addEventListener?.('loadedmetadata', check)
      video.addEventListener?.('canplay', check)
      check()
    })
  }

  async function teardown(candidate, reason) {
    if (candidate.teardownPromise) return candidate.teardownPromise
    const attempt = (async () => {
      candidate.intentional = true
      candidate.cancelReadiness?.()
      removeTrackListeners(candidate)
      let stopError = null
      for (const track of candidate.stream?.getTracks?.() || []) {
        try { track.stop?.() } catch (error) { stopError ||= error }
      }
      if (stopError) throw stopError

      const stream = candidate.stream
      candidate.stream = null
      const ownsVideo = operation === candidate
      if (ownsVideo) operation = null
      const video = videoRef.value
      if (video && ownsVideo && (video.srcObject === stream || video.srcObject)) video.srcObject = null
      onStopped(reason)
    })()
    candidate.teardownPromise = attempt
    try { return await attempt } finally {
      if (candidate.teardownPromise === attempt) candidate.teardownPromise = null
    }
  }

  function registerTrackListeners(candidate, stream) {
    const tracks = stream?.getVideoTracks?.() || stream?.getTracks?.().filter((track) => track.kind === 'video') || []
    for (const track of tracks) {
      const listener = () => {
        if (!isCurrent(candidate) || candidate.intentional || candidate.trackEnded) return
        candidate.trackEnded = true
        void cameraSession.forceStop(OWNER, 'track-ended', candidate.token).catch(onUnexpectedEnd)
      }
      track.addEventListener?.('ended', listener)
      candidate.trackListeners.push({ track, listener })
    }
  }

  async function release(candidate, reason) {
    try { await teardown(candidate, reason) } catch (error) { throw cameraErrorFrom(error, 'CAMERA_CLEANUP_FAILED') }
    cameraSession.release(OWNER, candidate.token)
  }

  async function start(constraints) {
    const apiError = cameraApiError()
    if (apiError) throw apiError
    const candidate = { token: null, stream: null, intentional: false, trackEnded: false, trackListeners: [], cancelReadiness: null, teardownPromise: null }
    let lease
    try {
      lease = await cameraSession.acquire(OWNER, (reason) => teardown(candidate, reason))
      candidate.token = lease.token
      operation = candidate
      const pending = Promise.resolve().then(() => navigator.mediaDevices.getUserMedia(constraints))
      const tracked = pending.then((stream) => {
        if (!isCurrent(candidate)) { stopStaleStream(stream); return null }
        return stream
      })
      cameraSession.trackPending(OWNER, candidate.token, tracked)
      const stream = await tracked
      if (!stream || !isCurrent(candidate)) return null
      candidate.stream = stream
      const video = videoRef.value
      if (!video) throw new CameraCaptureError('CAMERA_VIDEO_MISSING', 'Camera preview is unavailable. Try again or choose an image.')
      video.srcObject = stream
      const playResult = video.play?.()
      if (playResult?.then) await playResult
      await waitForReady(candidate, video)
      if (!isCurrent(candidate)) return null
      onSettings(stream)
      registerTrackListeners(candidate, stream)
      return candidate
    } catch (error) {
      if (!lease) throw cameraErrorFrom(error, 'CAMERA_BUSY')
      if (!cameraSession.getActiveLease() || cameraSession.getActiveLease()?.token !== candidate.token) return null
      const normalized = cameraErrorFrom(error)
      await release(candidate, 'error')
      throw normalized
    }
  }

  async function stop(reason = 'close') {
    const candidate = operation
    if (!candidate) return true
    const lease = cameraSession.getActiveLease()
    if (lease?.owner === OWNER && lease.token === candidate.token) await release(candidate, reason)
    return true
  }

  return {
    isCurrent,
    start,
    stop,
    releaseCurrent: (reason) => operation ? release(operation, reason) : Promise.resolve(),
    current: () => operation,
  }
}
