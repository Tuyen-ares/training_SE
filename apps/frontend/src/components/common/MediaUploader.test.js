import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import MediaUploader from './MediaUploader.vue'

const upload = vi.fn()
const retry = vi.fn()
const bestEffortCancel = vi.fn()

vi.mock('../../stores/auth', () => ({ useAuthStore: () => ({ api: vi.fn() }) }))
vi.mock('../../composables/useMediaUpload', async () => {
  const { ref } = await import('vue')
  return {
    useMediaUpload: () => ({
      loading: ref(false),
      error: ref(''),
      previewUrl: ref(''),
      upload,
      retry,
      bestEffortCancel,
    }),
  }
})
vi.mock('../../utils/image-processing', () => ({ processImageFile: vi.fn(async (file) => file) }))

describe('MediaUploader', () => {
  it('opens the live camera modal and keeps a separate single-file library input', () => {
    const wrapper = mount(MediaUploader, { props: { purpose: 'USER_AVATAR', captureFacing: 'user' } })
    const inputs = wrapper.findAll('input.media-input')
    expect(wrapper.text()).toContain('Chụp ảnh')
    expect(wrapper.text()).toContain('Chọn ảnh')
    expect(inputs).toHaveLength(1)
    expect(inputs[0].attributes('capture')).toBeUndefined()
    expect(inputs.every((input) => input.attributes('multiple') === undefined)).toBe(true)
  })

  it('passes the environment preference to the camera modal for asset images', () => {
    const wrapper = mount(MediaUploader, { props: { purpose: 'ASSET_IMAGE', captureFacing: 'environment' } })
    expect(wrapper.findComponent({ name: 'CameraCaptureModal' }).props('defaultFacing')).toBe('environment')
  })

  it('does not replace the current model when a new upload fails', async () => {
    upload.mockRejectedValueOnce(new Error('upload failed'))
    const wrapper = mount(MediaUploader, { props: { purpose: 'ASSET_IMAGE', modelValue: 41 } })
    const input = wrapper.findAll('input[type="file"]')[1].element
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' })] })
    await wrapper.findAll('input[type="file"]')[1].trigger('change')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(bestEffortCancel).not.toHaveBeenCalledWith(41)
  })
})
