import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import BorrowingActivityView from './BorrowingActivityView.vue'

const authStore = vi.hoisted(() => ({
  api: vi.fn(),
  hasPermission: vi.fn(() => false),
}))

const activityServices = vi.hoisted(() => ({
  listAllBorrowingActivity: vi.fn(),
  listMyBorrowingActivity: vi.fn(),
}))

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('../../stores/auth', () => ({ useAuthStore: () => authStore }))
vi.mock('vue-router', () => ({ useRouter: () => router }))
vi.mock('../../services/borrowing/borrowing.service', () => activityServices)

const WorkspaceLayoutStub = {
  template: '<div><slot name="context" /><slot /></div>',
}

const AlertStub = {
  props: ['message'],
  template: '<div class="alert-stub">{{ message }}<slot name="action" /></div>',
}

const TabsStub = {
  emits: ['change'],
  template: '<div><button data-test="current-tab" @click="$emit(\'change\', \'CURRENT\')">Current</button><button data-test="returned-tab" @click="$emit(\'change\', \'RETURNED\')">Returned</button><slot /></div>',
}

const ButtonStub = {
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
}

const AvatarStub = { template: '<span><slot /></span>' }
const PaginationStub = { emits: ['change'], template: '<button data-test="next-page" @click="$emit(\'change\', 2)">Next</button>' }
const AppTableStub = {
  name: 'AppTable',
  props: ['dataSource', 'loading', 'pagination', 'expandedRowKeys'],
  emits: ['page-change', 'expand'],
  template: '<div class="app-table-stub"><div class="app-table-head">Request Requester Assets Activity Action</div><div v-for="record in dataSource" :key="record.requestId" class="request-row">Request #{{ record.requestId }} · {{ record.itemCount }} assets<button :data-test="`expand-request-${record.requestId}`" @click="$emit(\'expand\', !expandedRowKeys.includes(record.requestId), record)">View assets</button></div><slot name="mobileRow" v-for="record in dataSource" :key="`mobile-${record.requestId}`" :record="record" /></div>',
}

const page = (items) => ({ items, page: 1, pageSize: 20, total: items.length })

const asset = (id) => ({
  id,
  imageUrl: null,
  assetCode: `AST-${id}`,
  serialNumber: `SER-${id}`,
  model: { id, name: `Model ${id}` },
})

const group = {
  requestId: 77,
  requestCreatedAt: '2026-08-20T08:00:00.000Z',
  requester: { id: 5, userCode: 'EMP005', name: 'Grouped user', department: { id: 2, name: 'IT' } },
  itemCount: 2,
  items: [
    { id: 701, asset: asset(1), borrowedAt: '2026-08-20T09:00:00.000Z', expectedReturnDate: '2099-01-01', returnedAt: null, returnCondition: null, receivedBy: null },
    { id: 702, asset: asset(2), borrowedAt: '2026-08-20T09:00:00.000Z', expectedReturnDate: '2099-01-02', returnedAt: null, returnCondition: null, receivedBy: null },
  ],
}

function mountView() {
  return mount(BorrowingActivityView, {
    global: {
      stubs: {
        AppTable: AppTableStub,
        WorkspaceLayout: WorkspaceLayoutStub,
        'a-alert': AlertStub,
        'a-avatar': AvatarStub,
        'a-button': ButtonStub,
        'a-empty': true,
        'a-pagination': PaginationStub,
        'a-tab-pane': true,
        'a-tabs': TabsStub,
        'a-table-column': true,
      },
    },
  })
}

describe('BorrowingActivityView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore.hasPermission.mockReturnValue(false)
    activityServices.listMyBorrowingActivity.mockResolvedValue(page([group]))
    activityServices.listAllBorrowingActivity.mockResolvedValue(page([group]))
  })

  it('renders grouped requests through the shared table surface', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(activityServices.listMyBorrowingActivity).toHaveBeenCalledWith(authStore.api, {
      page: 1,
      pageSize: 20,
      state: 'CURRENT',
    })
    expect(wrapper.findComponent(AppTableStub).exists()).toBe(true)
    expect(wrapper.findComponent(AppTableStub).attributes('show-expand-column')).toBe('false')
    expect(wrapper.findAll('.request-row')).toHaveLength(1)
    expect(wrapper.text()).toContain('Request #77')
    expect(wrapper.text()).toContain('2 assets')
    expect(wrapper.text()).toContain('Request Requester Assets Activity Action')
    expect(wrapper.text()).not.toContain('Status')
  })

  it('offers a retry action when the activity request fails', async () => {
    activityServices.listMyBorrowingActivity
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(page([]))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Network error')
    await wrapper.get('[data-test="retry-activity"]').trigger('click')
    await flushPromises()

    expect(activityServices.listMyBorrowingActivity).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.request-row').exists()).toBe(false)
  })

  it('loads the returned tab through the same request-grouped table', async () => {
    const returnedGroup = {
      ...group,
      itemCount: 1,
      items: [{ ...group.items[0], returnedAt: '2026-08-25T09:00:00.000Z', returnCondition: 'NORMAL', receivedBy: { id: 9, name: 'Manager' } }],
    }
    activityServices.listMyBorrowingActivity.mockResolvedValueOnce(page([group])).mockResolvedValueOnce(page([returnedGroup]))
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[data-test="returned-tab"]').trigger('click')
    await flushPromises()

    expect(activityServices.listMyBorrowingActivity).toHaveBeenLastCalledWith(authStore.api, {
      page: 1,
      pageSize: 20,
      state: 'RETURNED',
    })
    expect(wrapper.findAll('.request-row')).toHaveLength(1)
  })

  it('uses the all-activity endpoint and keeps one request row per group', async () => {
    authStore.hasPermission.mockReturnValue(true)
    const wrapper = mountView()
    await flushPromises()

    expect(activityServices.listAllBorrowingActivity).toHaveBeenCalled()
    expect(wrapper.findAll('.request-row')).toHaveLength(1)
    await wrapper.get('[data-test="expand-request-77"]').trigger('click')
    expect(wrapper.findComponent(AppTableStub).emitted('expand')).toEqual([[true, group]])
  })
})
