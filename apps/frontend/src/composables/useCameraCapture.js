import { computed, onBeforeUnmount, ref } from 'vue'

import { captureVideoFrame } from './camera/camera-frame-capture'
import { CameraCaptureError, cameraErrorFrom, isFacing, oppositeFacing } from './camera/camera-errors'
import { createCameraStreamController } from './camera/camera-stream-controller'

export { CameraCaptureError } from './camera/camera-errors'

export const CAMERA_PHASES = Object.freeze({
  IDLE: 'idle', STARTING: 'starting', READY: 'ready', CAPTURING: 'capturing', REVIEW: 'review', ERROR: 'error',
})

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

  function clearReview() {
    if (reviewUrl.value) URL.revokeObjectURL(reviewUrl.value)
    reviewUrl.value = ''
    reviewFile.value = null
  }

  function setError(value) { error.value = value instanceof CameraCaptureError ? value : cameraErrorFrom(value) }

  const controller = createCameraStreamController({
    videoRef,
    onSettings(stream) {
      const track = stream?.getVideoTracks?.()[0] || stream?.getTracks?.().find((item) => item.kind === 'video')
      const settings = track?.getSettings?.() || {}
      activeDeviceId.value = typeof settings.deviceId === 'string' ? settings.deviceId : ''
      actualFacing.value = isFacing(settings.facingMode) ? settings.facingMode : null
      previewMirrored.value = actualFacing.value === 'user'
    },
    onStopped(reason) {
      activeDeviceId.value = ''
      actualFacing.value = null
      previewMirrored.value = false
      if (reason === 'track-ended') {
        setError(new CameraCaptureError('CAMERA_STREAM_ENDED', 'The camera stream ended unexpectedly. Try again or choose an image.'))
        phase.value = CAMERA_PHASES.ERROR
      } else if (reason === 'preempted' && !reviewFile.value) {
        setError(new CameraCaptureError('CAMERA_BUSY', 'The camera is being used by another workflow. Try again or choose an image.'))
        phase.value = CAMERA_PHASES.ERROR
      } else if (!reviewFile.value && reason !== 'capture' && reason !== 'capture-error') phase.value = CAMERA_PHASES.IDLE
    },
    onUnexpectedEnd(cleanupError) { setError(cleanupError); phase.value = CAMERA_PHASES.ERROR },
  })

  async function enumerateCameras() {
    if (!navigator.mediaDevices?.enumerateDevices) return (availableDevices.value = [])
    const devices = await navigator.mediaDevices.enumerateDevices()
    availableDevices.value = devices.filter((device) => device.kind === 'videoinput')
    return availableDevices.value
  }

  async function startWithConstraints(constraints, { preserveReview = false } = {}) {
    error.value = null
    phase.value = CAMERA_PHASES.STARTING
    try {
      const candidate = await controller.start(constraints)
      if (!candidate) {
        if (preserveReview && reviewFile.value && phase.value !== CAMERA_PHASES.ERROR) phase.value = CAMERA_PHASES.REVIEW
        return false
      }
      if (preserveReview) clearReview()
      phase.value = CAMERA_PHASES.READY
      await enumerateCameras().catch(() => { availableDevices.value = [] })
      return true
    } catch (startError) {
      setError(startError)
      phase.value = preserveReview && reviewFile.value ? CAMERA_PHASES.REVIEW : CAMERA_PHASES.ERROR
      return false
    }
  }

  function start() {
    if ([CAMERA_PHASES.READY, CAMERA_PHASES.STARTING, CAMERA_PHASES.CAPTURING].includes(phase.value)) return Promise.resolve(false)
    const preserveReview = phase.value === CAMERA_PHASES.REVIEW && Boolean(reviewFile.value)
    return startWithConstraints({ video: { facingMode: { ideal: requestedFacing.value } }, audio: false }, { preserveReview })
  }

  function retake() {
    if (phase.value !== CAMERA_PHASES.REVIEW || !reviewFile.value) return start()
    return startWithConstraints({ video: { facingMode: { ideal: requestedFacing.value } }, audio: false }, { preserveReview: true })
  }

  async function switchCamera() {
    if (!ready.value || !controller.current()) return false
    const previousDeviceId = activeDeviceId.value
    const previousFacing = actualFacing.value || requestedFacing.value
    const devices = await enumerateCameras().catch(() => [])
    const nextDevice = previousDeviceId ? devices.find((device) => device.deviceId && device.deviceId !== previousDeviceId) : devices[1]
    if (!nextDevice) { setError(new CameraCaptureError('CAMERA_NO_ALTERNATIVE', 'No other camera is available.')); return false }
    try { await controller.stop('switch') } catch (cleanupError) { setError(cleanupError); phase.value = CAMERA_PHASES.ERROR; return false }

    requestedFacing.value = oppositeFacing(previousFacing)
    if (await startWithConstraints({ video: { deviceId: { exact: nextDevice.deviceId } }, audio: false })) return true
    if (await startWithConstraints({ video: { facingMode: { ideal: requestedFacing.value } }, audio: false })) return true
    if (previousDeviceId && await startWithConstraints({ video: { deviceId: { exact: previousDeviceId } }, audio: false })) { requestedFacing.value = previousFacing; return true }
    if (await startWithConstraints({ video: { facingMode: { ideal: previousFacing } }, audio: false })) { requestedFacing.value = previousFacing; return true }
    setError(new CameraCaptureError('CAMERA_SWITCH_FAILED', 'The camera could not be switched or restored. Choose an image instead.'))
    phase.value = CAMERA_PHASES.ERROR
    return false
  }

  async function capture() {
    const candidate = controller.current()
    if (!ready.value || !candidate) return null
    phase.value = CAMERA_PHASES.CAPTURING
    let localReviewUrl = ''
    try {
      if (!controller.isCurrent(candidate)) throw new CameraCaptureError('CAMERA_VIDEO_NOT_READY', 'The camera preview is not ready yet.')
      const review = await captureVideoFrame(videoRef.value)
      if (!controller.isCurrent(candidate)) throw new CameraCaptureError('CAMERA_STREAM_ENDED', 'The camera stream ended unexpectedly. Try again or choose an image.')
      localReviewUrl = URL.createObjectURL(review)
      await controller.releaseCurrent('capture')
      reviewFile.value = review
      reviewUrl.value = localReviewUrl
      error.value = null
      phase.value = CAMERA_PHASES.REVIEW
      return review
    } catch (captureError) {
      if (localReviewUrl) URL.revokeObjectURL(localReviewUrl)
      try { await controller.releaseCurrent('capture-error') } catch (cleanupError) { captureError = cleanupError }
      setError(captureError)
      phase.value = CAMERA_PHASES.ERROR
      return null
    }
  }

  function acceptReview() {
    if (phase.value !== CAMERA_PHASES.REVIEW || !reviewFile.value) return null
    const file = reviewFile.value
    clearReview(); error.value = null; phase.value = CAMERA_PHASES.IDLE
    return file
  }

  function cancelReview() { clearReview(); error.value = null; phase.value = CAMERA_PHASES.IDLE }

  async function stop(reason = 'close') {
    try { await controller.stop(reason); return true } catch (cleanupError) { setError(cleanupError); phase.value = CAMERA_PHASES.ERROR; return false }
  }

  async function close() { const stopped = await stop('close'); if (stopped) cancelReview() }

  onBeforeUnmount(() => { void close() })

  return { requestedFacing, activeDeviceId, actualFacing, previewMirrored, availableDevices, phase, error, reviewFile, reviewUrl, videoRef, ready, start, retake, switchCamera, capture, acceptReview, cancelReview, stop, close, reset: close }
}
