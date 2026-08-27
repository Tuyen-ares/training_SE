import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CAMERA_PHASES, useCameraCapture } from './useCameraCapture'
import { CAMERA_OWNERS, cameraSession } from '../services/camera-session'

function makeTrack({ facingMode = 'user', deviceId = 'camera-a' } = {}) {
  const listeners = new Map()
  return {
    kind: 'video',
    readyState: 'live',
    stop: vi.fn(function stop() { this.readyState = 'ended' }),
    getSettings: vi.fn(() => ({ facingMode, deviceId })),
    addEventListener: vi.fn((name, listener) => listeners.set(name, listener)),
    removeEventListener: vi.fn((name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name)
    }),
    emit(name) { listeners.get(name)?.() },
  }
}

function makeStream(track) {
  return { getTracks: () => [track], getVideoTracks: () => [track] }
}

function makeVideo() {
  const listeners = new Map()
  return {
    srcObject: null,
    videoWidth: 1280,
    videoHeight: 720,
    readyState: 3,
    play: vi.fn(async () => {}),
    addEventListener: vi.fn((name, listener) => listeners.set(name, listener)),
    removeEventListener: vi.fn((name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name)
    }),
    emit(name) { listeners.get(name)?.() },
  }
}

function stubCanvas() {
  const context = { drawImage: vi.fn() }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })))
  return context
}

describe('useCameraCapture', () => {
  let getUserMedia
  let enumerateDevices

  beforeEach(() => {
    cameraSession.resetForTests()
    getUserMedia = vi.fn()
    enumerateDevices = vi.fn(async () => [
      { kind: 'videoinput', deviceId: 'camera-a', label: 'Front camera' },
      { kind: 'videoinput', deviceId: 'camera-b', label: 'Back camera' },
    ])
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia, enumerateDevices },
    })
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:camera-review'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('requires ready video, captures without mirroring, then releases before review', async () => {
    const track = makeTrack({ facingMode: 'user', deviceId: 'camera-a' })
    getUserMedia.mockResolvedValue(makeStream(track))
    const video = makeVideo()
    const canvasContext = stubCanvas()
    const capture = useCameraCapture({ defaultFacing: 'user' })
    capture.videoRef.value = video

    await capture.start()
    expect(capture.phase.value).toBe(CAMERA_PHASES.READY)
    expect(capture.actualFacing.value).toBe('user')
    expect(capture.previewMirrored.value).toBe(true)
    expect(cameraSession.getActiveLease().owner).toBe(CAMERA_OWNERS.MEDIA_CAPTURE)

    const file = await capture.capture()

    expect(file.type).toBe('image/jpeg')
    expect(capture.phase.value).toBe(CAMERA_PHASES.REVIEW)
    expect(cameraSession.getActiveLease()).toBeNull()
    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(video.srcObject).toBeNull()
    expect(canvasContext.drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720)
  })

  it('acquires a new lease before retake and clears review only after the new stream is ready', async () => {
    const firstTrack = makeTrack({ facingMode: 'environment', deviceId: 'camera-b' })
    getUserMedia.mockResolvedValueOnce(makeStream(firstTrack))
    stubCanvas()
    const capture = useCameraCapture({ defaultFacing: 'environment' })
    capture.videoRef.value = makeVideo()
    await capture.start()
    await capture.capture()
    expect(capture.phase.value).toBe(CAMERA_PHASES.REVIEW)

    let leaseDuringRequest
    const secondTrack = makeTrack({ facingMode: 'environment', deviceId: 'camera-b' })
    getUserMedia.mockImplementationOnce(async () => {
      leaseDuringRequest = cameraSession.getActiveLease()
      return makeStream(secondTrack)
    })
    await capture.retake()

    expect(leaseDuringRequest.owner).toBe(CAMERA_OWNERS.MEDIA_CAPTURE)
    expect(capture.phase.value).toBe(CAMERA_PHASES.READY)
    expect(capture.reviewFile.value).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:camera-review')
  })

  it('routes unexpected track end through coordinator teardown and release', async () => {
    const track = makeTrack({ facingMode: 'environment', deviceId: 'camera-a' })
    getUserMedia.mockResolvedValue(makeStream(track))
    const capture = useCameraCapture()
    capture.videoRef.value = makeVideo()
    await capture.start()

    track.emit('ended')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(capture.phase.value).toBe(CAMERA_PHASES.ERROR)
    expect(capture.error.value.code).toBe('CAMERA_STREAM_ENDED')
    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(cameraSession.getActiveLease()).toBeNull()
  })

  it('keeps review when retake cannot acquire the camera', async () => {
    const track = makeTrack()
    getUserMedia.mockResolvedValue(makeStream(track))
    stubCanvas()
    const capture = useCameraCapture()
    capture.videoRef.value = makeVideo()
    await capture.start()
    await capture.capture()
    const review = capture.reviewFile.value
    await cameraSession.acquire(CAMERA_OWNERS.QR_SCANNER, async () => { throw new Error('camera remains busy') })
    getUserMedia.mockClear()

    await capture.retake()

    expect(getUserMedia).not.toHaveBeenCalled()
    expect(capture.phase.value).toBe(CAMERA_PHASES.REVIEW)
    expect(capture.reviewFile.value).toBe(review)
    cameraSession.resetForTests()
  })

  it('keeps the lease after track cleanup fails and releases it on retry', async () => {
    const track = makeTrack()
    track.stop
      .mockImplementationOnce(() => { throw new Error('hardware stop failed') })
      .mockImplementationOnce(() => { throw new Error('hardware still busy') })
    getUserMedia.mockResolvedValue(makeStream(track))
    const capture = useCameraCapture()
    capture.videoRef.value = makeVideo()
    await capture.start()

    await expect(capture.stop()).resolves.toBe(false)
    expect(cameraSession.getActiveLease()).toMatchObject({ owner: CAMERA_OWNERS.MEDIA_CAPTURE })
    await expect(cameraSession.acquire(CAMERA_OWNERS.QR_SCANNER, async () => {})).rejects.toMatchObject({ code: 'CAMERA_BUSY' })

    await expect(capture.stop()).resolves.toBe(true)
    expect(track.stop).toHaveBeenCalledTimes(3)
    expect(cameraSession.getActiveLease()).toBeNull()
  })

  it('stops a stale stream that resolves after another owner preempts startup', async () => {
    let resolveStream
    getUserMedia.mockReturnValue(new Promise((resolve) => { resolveStream = resolve }))
    const capture = useCameraCapture()
    capture.videoRef.value = makeVideo()
    const startup = capture.start()
    await Promise.resolve()
    await Promise.resolve()

    const scannerAcquisition = cameraSession.acquire(CAMERA_OWNERS.QR_SCANNER, async () => {})
    const staleTrack = makeTrack()
    resolveStream(makeStream(staleTrack))
    const scannerLease = await scannerAcquisition
    await startup

    expect(staleTrack.stop).toHaveBeenCalledTimes(1)
    expect(cameraSession.getActiveLease()).toMatchObject({ token: scannerLease.token, owner: CAMERA_OWNERS.QR_SCANNER })
    await cameraSession.forceStop(CAMERA_OWNERS.QR_SCANNER, 'close', scannerLease.token)
  })

  it('restores the previous device when both switch attempts fail', async () => {
    const originalTrack = makeTrack({ facingMode: 'user', deviceId: 'camera-a' })
    const restoredTrack = makeTrack({ facingMode: 'user', deviceId: 'camera-a' })
    getUserMedia
      .mockResolvedValueOnce(makeStream(originalTrack))
      .mockRejectedValueOnce(Object.assign(new Error('exact failed'), { name: 'NotReadableError' }))
      .mockRejectedValueOnce(Object.assign(new Error('facing failed'), { name: 'NotReadableError' }))
      .mockResolvedValueOnce(makeStream(restoredTrack))
    const capture = useCameraCapture({ defaultFacing: 'user' })
    capture.videoRef.value = makeVideo()
    await capture.start()

    await expect(capture.switchCamera()).resolves.toBe(true)

    expect(getUserMedia).toHaveBeenCalledTimes(4)
    expect(getUserMedia.mock.calls[3][0]).toEqual({ video: { deviceId: { exact: 'camera-a' } }, audio: false })
    expect(capture.requestedFacing.value).toBe('user')
    expect(capture.phase.value).toBe(CAMERA_PHASES.READY)
  })
})
