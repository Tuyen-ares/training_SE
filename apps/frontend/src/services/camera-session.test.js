import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CAMERA_OWNERS, cameraSession } from './camera-session'

describe('cameraSession', () => {
  beforeEach(() => cameraSession.resetForTests())

  it('force-stops an owner once and releases only after teardown resolves', async () => {
    const teardown = vi.fn(async () => {})
    const lease = await cameraSession.acquire(CAMERA_OWNERS.MEDIA_CAPTURE, teardown)

    await cameraSession.forceStop(CAMERA_OWNERS.MEDIA_CAPTURE, 'preempted', lease.token)

    expect(teardown).toHaveBeenCalledTimes(1)
    expect(cameraSession.getActiveLease()).toBeNull()
  })

  it('waits for pending startup before releasing the lease', async () => {
    let resolvePending
    const pending = new Promise((resolve) => { resolvePending = resolve })
    const teardown = vi.fn(async () => {})
    const lease = await cameraSession.acquire(CAMERA_OWNERS.MEDIA_CAPTURE, teardown)
    cameraSession.trackPending(CAMERA_OWNERS.MEDIA_CAPTURE, lease.token, pending)

    let settled = false
    const forceStopPromise = cameraSession.forceStop(CAMERA_OWNERS.MEDIA_CAPTURE, 'close', lease.token).then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    resolvePending()
    await forceStopPromise
    expect(settled).toBe(true)
    expect(cameraSession.getActiveLease()).toBeNull()
  })

  it('does not let an old token release a newer owner lease', async () => {
    const first = await cameraSession.acquire(CAMERA_OWNERS.MEDIA_CAPTURE, async () => {})
    await cameraSession.forceStop(CAMERA_OWNERS.MEDIA_CAPTURE, 'close', first.token)
    const second = await cameraSession.acquire(CAMERA_OWNERS.QR_SCANNER, async () => {})

    expect(cameraSession.release(CAMERA_OWNERS.MEDIA_CAPTURE, first.token)).toBe(false)
    expect(cameraSession.getActiveLease().token).toBe(second.token)

    await cameraSession.forceStop(CAMERA_OWNERS.QR_SCANNER, 'close', second.token)
  })

  it('keeps a failed cleanup lease busy so another owner cannot acquire it', async () => {
    const lease = await cameraSession.acquire(CAMERA_OWNERS.MEDIA_CAPTURE, async () => { throw new Error('cleanup failed') })

    await expect(cameraSession.forceStop(CAMERA_OWNERS.MEDIA_CAPTURE, 'close', lease.token)).rejects.toMatchObject({ code: 'CAMERA_CLEANUP_FAILED' })
    await expect(cameraSession.acquire(CAMERA_OWNERS.QR_SCANNER, async () => {})).rejects.toMatchObject({ code: 'CAMERA_BUSY' })
  })
})

