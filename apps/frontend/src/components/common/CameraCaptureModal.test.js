import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CameraCaptureModal from './CameraCaptureModal.vue'

describe('CameraCaptureModal', () => {
  it('renders camera actions and keeps the capture action disabled until ready', () => {
    const wrapper = mount(CameraCaptureModal, {
      global: {
        stubs: {
          'a-modal': { template: '<div><slot /></div>' },
          'a-button': { template: '<button :disabled="disabled"><slot /></button>', props: ['disabled', 'loading'] },
        },
      },
    })

    expect(wrapper.text()).toContain('Camera chưa mở.')
    expect(wrapper.text()).toContain('Chụp ảnh')
    expect(wrapper.findAll('button').some((button) => button.text() === 'Chụp ảnh' && button.attributes('disabled') !== undefined)).toBe(true)
  })
})

