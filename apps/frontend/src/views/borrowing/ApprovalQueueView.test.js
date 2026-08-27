import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ApprovalQueueView from './ApprovalQueueView.vue'

const authStore = vi.hoisted(() => ({
  api: vi.fn(),
  hasPermission: vi.fn(() => true),
}))

const queueServices = vi.hoisted(() => ({
  listReviewQueue: vi.fn(),
}))

vi.mock('../../stores/auth', () => ({ useAuthStore: () => authStore }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../../services/borrowing/borrowing.service', () => queueServices)

const AppTableStub = {
  name: 'AppTable',
  props: ['dataSource', 'rowKey'],
  template: '<div class="app-table-stub">{{ dataSource.length }}</div>',
}

const SelectStub = {
  name: 'SelectStub',
  props: ['value', 'options'],
  emits: ['change'],
  template: '<button data-test="status-filter" @click="$emit(\'change\', \'ALL\')">{{ value }}</button>',
}

const WorkspaceLayoutStub = {
  template: '<div><slot name="context" /><slot /></div>',
}

const page = (items) => ({ items, page: 1, pageSize: 10, total: items.length })

const mountView = () => mount(ApprovalQueueView, {
  global: {
    stubs: {
      AppTable: AppTableStub,
      WorkspaceLayout: WorkspaceLayoutStub,
      'a-alert': true,
      'a-avatar': true,
      'a-button': true,
      'a-select': SelectStub,
      'a-table-column': true,
      StatusTag: true,
    },
  },
})

describe('ApprovalQueueView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore.api = vi.fn()
    queueServices.listReviewQueue.mockResolvedValue(page([]))
  })

  it('keeps Pending as the default and sends All to the existing server-side queue API', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(queueServices.listReviewQueue).toHaveBeenCalledWith(authStore.api, {
      page: 1,
      pageSize: 10,
      approvalStatus: 'PENDING',
    })

    await wrapper.get('[data-test="status-filter"]').trigger('click')
    await flushPromises()

    expect(queueServices.listReviewQueue).toHaveBeenLastCalledWith(authStore.api, {
      page: 1,
      pageSize: 10,
      approvalStatus: 'ALL',
    })
  })

  it('places All after Pending in the status filter options', () => {
    const wrapper = mountView()
    expect(wrapper.findComponent(SelectStub).props('options').map((option) => option.value)).toEqual([
      'PENDING',
      'ALL',
      'APPROVED',
      'REJECTED',
    ])
  })
})
