import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HandoverReturnView from './HandoverReturnView.vue'

const authStore = vi.hoisted(() => ({
  api: vi.fn(),
  hasPermission: vi.fn(() => true),
}))

const queueServices = vi.hoisted(() => ({
  handoverBorrowDetail: vi.fn(),
  listHandoverQueue: vi.fn(),
  listReturnQueue: vi.fn(),
  receiveDamagedReturn: vi.fn(),
  receiveNormalReturn: vi.fn(),
}))

const evidenceServices = vi.hoisted(() => ({
  EvidenceBatchError: class EvidenceBatchError extends Error {},
  submitEvidenceBatch: vi.fn(),
}))

vi.mock('../../stores/auth', () => ({ useAuthStore: () => authStore }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }))
vi.mock('ant-design-vue', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))
vi.mock('../../services/borrowing/borrowing.service', () => queueServices)
vi.mock('../../services/evidence-batch.service', () => evidenceServices)

const AppTableStub = {
  name: 'AppTable',
  props: ['dataSource', 'rowKey'],
  template: '<div class="app-table-stub">{{ dataSource.length }}</div>',
}

const TabsStub = {
  emits: ['change'],
  template: '<div><button data-test="pending-return" @click="$emit(\'change\', \'return\')">Pending Return</button><slot /></div>',
}

const WorkspaceLayoutStub = {
  template: '<div><slot name="context" /><slot /></div>',
}

const EvidenceMediaPickerStub = {
  methods: { reset() {} },
  template: '<div />',
}

const deferred = () => {
  let resolve
  const promise = new Promise((nextResolve) => { resolve = nextResolve })
  return { promise, resolve }
}

const page = (items) => ({ items, page: 1, pageSize: 20, total: items.length })

describe('HandoverReturnView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore.hasPermission.mockReturnValue(true)
  })

  it('keeps the return queue when an older handover reload resolves later', async () => {
    const handoverRequest = deferred()
    const returnRequest = deferred()
    const handoverItem = { detailId: 11, requester: { name: 'Handover user' }, asset: {} }
    const returnItem = { id: 22, borrower: { name: 'Return user' }, asset: {} }

    queueServices.listHandoverQueue.mockReturnValueOnce(handoverRequest.promise)
    queueServices.listReturnQueue.mockReturnValueOnce(returnRequest.promise)

    const wrapper = mount(HandoverReturnView, {
      global: {
        stubs: {
          AppTable: AppTableStub,
          EvidenceMediaPicker: EvidenceMediaPickerStub,
          WorkspaceLayout: WorkspaceLayoutStub,
          'a-alert': true,
          'a-avatar': true,
          'a-button': true,
          'a-empty': true,
          'a-form-item': true,
          'a-modal': true,
          'a-table-column': true,
          'a-tabs': TabsStub,
          'a-tab-pane': true,
          'a-textarea': true,
        },
      },
    })

    const initialTableUid = wrapper.findComponent(AppTableStub).vm.$.uid
    await wrapper.get('[data-test="pending-return"]').trigger('click')

    const returnTable = wrapper.findComponent(AppTableStub)
    expect(returnTable.vm.$.uid).not.toBe(initialTableUid)
    expect(queueServices.listReturnQueue).toHaveBeenCalledWith(authStore.api, { page: 1, pageSize: 20 })

    returnRequest.resolve(page([returnItem]))
    await flushPromises()
    expect(wrapper.findComponent(AppTableStub).props('dataSource')).toEqual([returnItem])
    expect(wrapper.findComponent(AppTableStub).props('rowKey')).toBe('id')

    handoverRequest.resolve(page([handoverItem]))
    await flushPromises()
    expect(wrapper.findComponent(AppTableStub).props('dataSource')).toEqual([returnItem])
    expect(wrapper.findComponent(AppTableStub).props('rowKey')).toBe('id')
  })
})
