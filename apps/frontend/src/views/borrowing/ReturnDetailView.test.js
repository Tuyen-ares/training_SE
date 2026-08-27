import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReturnDetailView from './ReturnDetailView.vue'

const authStore = vi.hoisted(() => ({
  api: vi.fn(),
}))

const services = vi.hoisted(() => ({
  getReturnRequestDetail: vi.fn(),
  receiveNormalReturn: vi.fn(),
  receiveDamagedReturn: vi.fn(),
}))

const evidenceServices = vi.hoisted(() => ({
  EvidenceBatchError: class EvidenceBatchError extends Error {},
  submitEvidenceBatch: vi.fn(),
}))

const router = vi.hoisted(() => ({
  push: vi.fn(),
}))

vi.mock('../../stores/auth', () => ({ useAuthStore: () => authStore }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { requestId: '42' } }),
  useRouter: () => router,
}))
vi.mock('ant-design-vue', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))
vi.mock('../../services/borrowing/borrowing.service', () => services)
vi.mock('../../services/evidence-batch.service', () => evidenceServices)

const requestDetail = () => ({
  requestId: 42,
  requestCreatedAt: '2026-08-26T08:00:00.000Z',
  requester: {
    id: 7,
    userCode: 'BI00007',
    name: 'Requester',
    email: 'requester@example.test',
    avatarUrl: null,
    department: { id: 3, name: 'Operations' },
  },
  pendingCount: 1,
  returnedCount: 1,
  items: [{
    id: 101,
    detailId: 201,
    expectedReturnDate: '2026-09-01',
    borrowedAt: '2026-08-20T08:00:00.000Z',
    borrower: { id: 7, userCode: 'BI00007', name: 'Requester', avatarUrl: null },
    asset: {
      id: 12,
      assetCode: 'AST-0012',
      serialNumber: 'SER-0012',
      imageUrl: null,
      status: 'BORROWED',
      model: { id: 20, name: 'Laptop' },
    },
  }],
})

const ButtonStub = {
  props: ['disabled', 'loading'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
}

const ModalStub = {
  props: ['open'],
  emits: ['cancel', 'ok'],
  template: '<div v-if="open" class="modal-stub"><slot /><button data-test="confirm" @click="$emit(\'ok\')">Confirm</button></div>',
}

const WorkspaceLayoutStub = {
  template: '<div><slot name="context" /><slot /></div>',
}

const EvidencePickerStub = {
  methods: { reset() {} },
  template: '<div class="evidence-picker-stub" />',
}

const AssetIdentityStub = {
  props: ['identity'],
  template: '<div class="asset-identity-stub">{{ identity.modelName }}</div>',
}

describe('ReturnDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    services.getReturnRequestDetail.mockResolvedValue(requestDetail())
    services.receiveNormalReturn.mockResolvedValue({ returned: true })
    services.receiveDamagedReturn.mockResolvedValue({ issueId: 901 })
    evidenceServices.submitEvidenceBatch.mockImplementation(async ({ submitBusiness }) => {
      await submitBusiness([])
      return { returned: true }
    })
  })

  it('loads request histories and confirms one normal return with shared evidence flow', async () => {
    const wrapper = mount(ReturnDetailView, {
      global: {
        stubs: {
          WorkspaceLayout: WorkspaceLayoutStub,
          AssetIdentity: AssetIdentityStub,
          EvidenceMediaPicker: EvidencePickerStub,
          StatusTag: true,
          'a-alert': true,
          'a-avatar': true,
          'a-button': ButtonStub,
          'a-empty': true,
          'a-form-item': true,
          'a-modal': ModalStub,
          'a-result': true,
          'a-skeleton': true,
          'a-textarea': true,
        },
      },
    })

    await flushPromises()

    expect(services.getReturnRequestDetail).toHaveBeenCalledWith(authStore.api, 42)
    expect(wrapper.text()).toContain('REQ-0042')
    expect(wrapper.text()).toContain('Laptop')
    expect(wrapper.findAll('.asset-row')).toHaveLength(1)

    await wrapper.find('.asset-actions button').trigger('click')
    await wrapper.find('[data-test="confirm"]').trigger('click')
    await flushPromises()

    expect(evidenceServices.submitEvidenceBatch).toHaveBeenCalledWith(expect.objectContaining({
      purpose: 'RETURN',
    }))
    expect(services.receiveNormalReturn).toHaveBeenCalledWith(authStore.api, 101, [])
    expect(services.getReturnRequestDetail).toHaveBeenCalledTimes(2)
  })
})
