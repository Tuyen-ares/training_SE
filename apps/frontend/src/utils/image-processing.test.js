import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateResizeDimensions,
  processImageFile,
  validateImageFile,
} from './image-processing'

function imageFile(type = 'image/jpeg', name = 'photo.jpg', bytes) {
  const signatures = {
    'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/webp': [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
  }
  return new File([new Uint8Array(bytes || signatures[type] || [1, 2, 3])], name, {
    type,
    lastModified: 123,
  })
}

describe('image processing', () => {
  let toBlob
  let close

  beforeEach(() => {
    close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 2000, close }))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() })
    toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function callback(cb, type) {
      cb(new Blob([new Uint8Array([1, 2, 3])], { type }))
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('keeps aspect ratio, caps the long edge, and never upscales', () => {
    expect(calculateResizeDimensions(4000, 2000)).toEqual({ width: 1920, height: 960 })
    expect(calculateResizeDimensions(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('delegates EXIF orientation exactly once to the browser decoder', async () => {
    for (let orientation = 1; orientation <= 8; orientation += 1) {
      await processImageFile(imageFile('image/jpeg', `orientation-${orientation}.jpg`))
    }
    expect(createImageBitmap).toHaveBeenCalledTimes(8)
    for (const call of createImageBitmap.mock.calls) expect(call[1]).toEqual({ imageOrientation: 'from-image' })
    expect(close).toHaveBeenCalledTimes(8)
  })

  it('uses 0.85 for JPEG/WebP and preserves the source MIME and extension', async () => {
    const jpeg = await processImageFile(imageFile('image/jpeg', 'camera.jpeg'))
    const webp = await processImageFile(imageFile('image/webp', 'camera.bin'))
    expect(toBlob.mock.calls[0].slice(1)).toEqual(['image/jpeg', 0.85])
    expect(toBlob.mock.calls[1].slice(1)).toEqual(['image/webp', 0.85])
    expect(jpeg.type).toBe('image/jpeg')
    expect(jpeg.name).toBe('camera.jpg')
    expect(webp.type).toBe('image/webp')
    expect(webp.name).toBe('camera.webp')
  })

  it('keeps PNG output and transparency-capable encoding', async () => {
    const png = await processImageFile(imageFile('image/png', 'transparent.png'))
    expect(toBlob.mock.calls[0].slice(1)).toEqual(['image/png', undefined])
    expect(png.type).toBe('image/png')
  })

  it('rejects HEIC, empty MIME, and MIME/signature mismatches', async () => {
    await expect(validateImageFile(imageFile('image/heic', 'camera.heic'))).rejects.toMatchObject({ code: 'HEIC_UNSUPPORTED' })
    await expect(validateImageFile(imageFile('', 'camera.jpg'))).rejects.toMatchObject({ code: 'MIME_UNSUPPORTED' })
    await expect(validateImageFile(imageFile('image/png', 'fake.png', [0xff, 0xd8, 0xff]))).rejects.toMatchObject({ code: 'SIGNATURE_MISMATCH' })
  })

  it('rejects output larger than 10 MB', async () => {
    toBlob.mockImplementation((callback, type) => {
      callback(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type }))
    })
    await expect(processImageFile(imageFile())).rejects.toMatchObject({ code: 'OUTPUT_TOO_LARGE' })
  })
})
