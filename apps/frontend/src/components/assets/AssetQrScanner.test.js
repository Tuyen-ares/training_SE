import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const start = vi.fn(async () => {})
const stop = vi.fn(async () => {})
const clear = vi.fn(async () => {})
const scanFile = vi.fn(async () => 'https://example.test/qr/ASSET-1')

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn(function Html5Qrcode() {
    return { start, stop, clear, scanFile }
  }),
}))

import AssetQrScanner from './AssetQrScanner.vue'
import { CAMERA_OWNERS, cameraSession } from '../../services/camera-session'

describe('AssetQrScanner', () => {
  beforeEach(() => {
    cameraSession.resetForTests()
    start.mockClear()
    stop.mockClear()
    clear.mockClear()
  })

  it('holds the QR lease around start and releases it after stop and clear', async () => {
    const wrapper = mount(AssetQrScanner, { global: { stubs: { 'a-alert': true, 'a-button': true } } })

    await wrapper.vm.start()
    expect(start).toHaveBeenCalledTimes(1)
    expect(cameraSession.getActiveLease().owner).toBe(CAMERA_OWNERS.QR_SCANNER)

    await wrapper.vm.stop()
    expect(stop).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledTimes(1)
    expect(cameraSession.getActiveLease()).toBeNull()
  })
})

