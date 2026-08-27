import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HandoverDetailView from './HandoverDetailView.vue'

const authStore = vi.hoisted(() => ({
  api: vi.fn(),
}))

const services = vi.hoisted(() => ({
  getHandoverRequestDetail: vi.fn(),
  handoverBorrowDetail: vi.fn(),
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
  approvedCount: 2,
  handedOverCount: 1,
  items: [{
    detailId: 101,
    expectedReturnDate: '2026-09-01',
    asset: {
      id: 12,
      assetCode: 'AST-0012',
      serialNumber: 'SER-0012',
      imageUrl: null,
      status: 'RESERVED',
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

describe('HandoverDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    services.getHandoverRequestDetail.mockResolvedValue(requestDetail())
    services.handoverBorrowDetail.mockResolvedValue({ historyId: 9001 })
    evidenceServices.submitEvidenceBatch.mockImplementation(async ({ submitBusiness }) => {
      await submitBusiness([])
      return {}
    })
  })

  it('loads a request detail and confirms one asset with the shared evidence flow', async () => {
    const wrapper = mount(HandoverDetailView, {
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
          'a-modal': ModalStub,
          'a-result': true,
          'a-skeleton': true,
        },
      },
    })

    await flushPromises()

    expect(services.getHandoverRequestDetail).toHaveBeenCalledWith(authStore.api, 42)
    expect(wrapper.text()).toContain('REQ-0042')
    expect(wrapper.text()).toContain('Laptop')
    expect(wrapper.findAll('.asset-row')).toHaveLength(1)

    await wrapper.find('.asset-action button').trigger('click')
    await wrapper.find('[data-test="confirm"]').trigger('click')
    await flushPromises()

    expect(evidenceServices.submitEvidenceBatch).toHaveBeenCalledWith(expect.objectContaining({
      purpose: 'HANDOVER',
    }))
    expect(services.handoverBorrowDetail).toHaveBeenCalledWith(authStore.api, 101, [])
    expect(services.getHandoverRequestDetail).toHaveBeenCalledTimes(2)
  })
})
