import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import EvidenceMediaPicker from './EvidenceMediaPicker.vue'

vi.mock('../../utils/image-processing', () => ({
  duplicateKey: (file) => [file.name, file.size, file.lastModified, file.type].join(':'),
  processImageFile: vi.fn(async (file) => new File([file], `processed-${file.name}`, { type: file.type })),
}))

function rawFile(index) {
  return new File([new Uint8Array([index])], `photo-${index}.jpg`, { type: 'image/jpeg', lastModified: index })
}

function item(index) {
  const file = rawFile(index)
  return { localId: `${index}`, file, previewUrl: `blob:${index}`, duplicateKey: [file.name, file.size, file.lastModified, file.type].join(':') }
}

async function selectFiles(wrapper, selector, files) {
  const input = wrapper.find(selector).element
  Object.defineProperty(input, 'files', { configurable: true, value: files })
  await wrapper.find(selector).trigger('change')
}

describe('EvidenceMediaPicker', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((file) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
    })
  })

  it('uses the live camera modal and a multiple library input', () => {
    const wrapper = mount(EvidenceMediaPicker)
    const inputs = wrapper.findAll('input.evidence-input')
    expect(inputs).toHaveLength(1)
    expect(inputs[0].attributes('capture')).toBeUndefined()
    expect(inputs[0].attributes('multiple')).toBeDefined()
    expect(wrapper.findComponent({ name: 'CameraCaptureModal' }).props('defaultFacing')).toBe('environment')
  })

  it('rejects an entire 5-file selection when only 2 slots remain', async () => {
    const existing = Array.from({ length: 8 }, (_, index) => item(index))
    const wrapper = mount(EvidenceMediaPicker, { props: { modelValue: existing } })
    await selectFiles(wrapper, 'input[multiple]', Array.from({ length: 5 }, (_, index) => rawFile(index + 20)))
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.text()).toContain('Bạn chỉ còn 2 vị trí')
  })

  it('drops duplicates before count validation and reports them', async () => {
    const existing = [item(1)]
    const wrapper = mount(EvidenceMediaPicker, { props: { modelValue: existing } })
    await selectFiles(wrapper, 'input[multiple]', [rawFile(1), rawFile(2)])
    const emitted = wrapper.emitted('update:modelValue').at(-1)[0]
    expect(emitted).toHaveLength(2)
    expect(wrapper.text()).toContain('Đã bỏ qua 1 ảnh trùng')
  })

  it('revokes preview URLs when items are removed and on unmount', async () => {
    const wrapper = mount(EvidenceMediaPicker, { props: { modelValue: [item(1), item(2)] } })
    await wrapper.find('figure button').trigger('click')
    await wrapper.setProps({ modelValue: [item(2)] })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2')
  })
})
