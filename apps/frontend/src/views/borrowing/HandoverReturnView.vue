<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AppTable from '../../components/common/AppTable.vue'
import {
  listHandoverQueue,
  listReturnQueue,
} from '../../services/borrowing/borrowing.service'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const canHandover = computed(() => authStore.hasPermission('asset.checkout'))
const canReturn = computed(() => authStore.hasPermission('asset.checkin'))
const tabs = computed(() => [
  ...(canHandover.value ? [{ key: 'handover', label: 'Pending Handover' }] : []),
  ...(canReturn.value ? [{ key: 'return', label: 'Pending Return' }] : []),
])

const requestedTab = typeof route.query.tab === 'string' ? route.query.tab : ''
const activeTab = ref(requestedTab === 'return' && canReturn.value ? 'return' : canHandover.value ? 'handover' : 'return')
const loading = ref(true)
const errorMessage = ref('')
const groups = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const queueLoadGenerations = { handover: 0, return: 0 }

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value + 'T00:00:00'))
  : '—'
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'
const formatRequestId = (requestId) => 'REQ-' + String(requestId).padStart(4, '0')

async function load(tab = activeTab.value) {
  if (tab !== 'handover' && tab !== 'return') return null
  if ((tab === 'handover' && !canHandover.value) || (tab === 'return' && !canReturn.value)) return

  const generation = ++queueLoadGenerations[tab]
  const requestedPage = page.value
  const requestedPageSize = pageSize.value
  const isCurrentLoad = () => generation === queueLoadGenerations[tab] && tab === activeTab.value

  if (tab === activeTab.value) {
    loading.value = true
    errorMessage.value = ''
    groups.value = []
    total.value = 0
  }

  try {
    const result = tab === 'handover'
      ? await listHandoverQueue(authStore.api, { page: requestedPage, pageSize: requestedPageSize })
      : await listReturnQueue(authStore.api, { page: requestedPage, pageSize: requestedPageSize })
    if (!isCurrentLoad()) return null

    groups.value = result?.items || []
    page.value = result?.page || requestedPage
    pageSize.value = result?.pageSize || requestedPageSize
    total.value = result?.total || 0
    return result
  } catch (error) {
    if (isCurrentLoad()) {
      errorMessage.value = error.message || (tab === 'handover' ? 'Handover queue could not be loaded.' : 'Return queue could not be loaded.')
    }
    return null
  } finally {
    if (isCurrentLoad()) loading.value = false
  }
}

function selectTab(tab) {
  if (!tabs.value.some((item) => item.key === tab)) return
  activeTab.value = tab
  page.value = 1
  void load(tab)
}

function pageChange(nextPage) {
  page.value = nextPage
  void load()
}

function openHandoverDetail(requestId) {
  void router.push({ name: 'handover-detail', params: { requestId: String(requestId) } })
}

function openReturnDetail(requestId) {
  void router.push({ name: 'return-detail', params: { requestId: String(requestId) } })
}

onMounted(() => {
  if (!tabs.value.length) {
    loading.value = false
    return
  }
  void load()
})
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Handover &amp; Return</strong></template>

    <main class="fulfillment-page">
      <header class="fulfillment-header">
        <div>
          <p class="eyebrow">FULFILLMENT</p>
          <h1>Handover &amp; Return</h1>
          <p>Open a request to inspect its assets and confirm each handover or return in detail.</p>
        </div>
        <div v-if="tabs.length" class="queue-count">
          <span>{{ activeTab === 'handover' ? 'PENDING REQUESTS' : 'AWAITING REQUESTS' }}</span>
          <strong>{{ total }}</strong>
        </div>
      </header>

      <section v-if="tabs.length" class="fulfillment-surface">
        <a-tabs class="fulfillment-tabs" :active-key="activeTab" @change="selectTab">
          <a-tab-pane v-if="canHandover" key="handover" tab="Pending Handover" />
          <a-tab-pane v-if="canReturn" key="return" tab="Pending Return" />
        </a-tabs>

        <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage">
          <template #action><a-button size="small" @click="load()">Retry</a-button></template>
        </a-alert>

        <AppTable
          v-if="activeTab === 'handover'"
          key="handover"
          :data-source="groups"
          :loading="loading"
          row-key="requestId"
          scroll-mode="intentional"
          empty-description="No requests are pending handover."
          :pagination="{ current: page, pageSize, total, label: 'requests' }"
          @page-change="pageChange"
        >
          <a-table-column title="Request" key="request" :width="250">
            <template #default="{ record }">
              <div class="person-cell">
                <strong>{{ formatRequestId(record.requestId) }} · {{ record.requester.name }}</strong>
                <span>{{ record.requester.department?.name || 'No department' }}</span>
                <small>Created {{ formatDateTime(record.requestCreatedAt) }}</small>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="Progress" key="progress" :width="180">
            <template #default="{ record }">
              <div class="person-cell">
                <strong>{{ record.pendingCount }} ready for handover</strong>
                <span>{{ record.handedOverCount }} of {{ record.approvedCount }} already handed over</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="Handover summary" key="summary" :width="420">
            <template #default="{ record }">
              <div class="request-summary">
                <strong>{{ record.pendingCount }} asset(s) ready for handover</strong>
                <span>Open detail to inspect assets, capture evidence and confirm individually.</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="Action" key="action" fixed="right" :width="190" align="right">
            <template #default="{ record }">
              <a-button
                class="action-button bigin-touch-target"
                type="primary"
                @click="openHandoverDetail(record.requestId)"
              >Open handover detail</a-button>
            </template>
          </a-table-column>
          <template #mobileRow="{ record }">
            <div class="fulfillment-mobile-row">
              <div class="queue-mobile-heading">
                <div class="person-cell">
                  <strong>{{ formatRequestId(record.requestId) }} · {{ record.requester.name }}</strong>
                  <span>{{ record.requester.department?.name || 'No department' }} · {{ record.pendingCount }} ready</span>
                </div>
                <a-button
                  class="action-button bigin-touch-target"
                  type="primary"
                  @click="openHandoverDetail(record.requestId)"
                >Open handover detail</a-button>
              </div>
              <div class="request-summary">
                <strong>{{ record.pendingCount }} asset(s) ready for handover</strong>
                <span>Open detail to inspect, capture evidence and confirm.</span>
              </div>
            </div>
          </template>
        </AppTable>

        <AppTable
          v-else
          key="return"
          :data-source="groups"
          :loading="loading"
          row-key="requestId"
          scroll-mode="intentional"
          empty-description="No requests are awaiting return."
          :pagination="{ current: page, pageSize, total, label: 'requests' }"
          @page-change="pageChange"
        >
          <a-table-column title="Request" key="request" :width="250">
            <template #default="{ record }">
              <div class="person-cell">
                <strong>{{ formatRequestId(record.requestId) }} · {{ record.requester.name }}</strong>
                <span>{{ record.requester.department?.name || 'No department' }}</span>
                <small>Created {{ formatDateTime(record.requestCreatedAt) }}</small>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="Progress" key="progress" :width="180">
            <template #default="{ record }">
              <div class="person-cell">
                <strong>{{ record.pendingCount }} asset(s) awaiting return</strong>
                <span>{{ record.returnedCount }} already returned in this request</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="Return summary" key="summary" :width="420">
            <template #default="{ record }">
              <div class="request-summary">
                <strong>{{ record.pendingCount }} asset(s) awaiting return</strong>
                <span>Open detail to inspect each history and record the return condition.</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="Action" key="action" fixed="right" :width="180" align="right">
            <template #default="{ record }">
              <a-button
                class="action-button bigin-touch-target"
                type="primary"
                @click="openReturnDetail(record.requestId)"
              >Open return detail</a-button>
            </template>
          </a-table-column>
          <template #mobileRow="{ record }">
            <div class="fulfillment-mobile-row">
              <div class="queue-mobile-heading">
                <div class="person-cell">
                  <strong>{{ formatRequestId(record.requestId) }} · {{ record.requester.name }}</strong>
                  <span>{{ record.requester.department?.name || 'No department' }} · {{ record.pendingCount }} awaiting return</span>
                </div>
                <a-button
                  class="action-button bigin-touch-target"
                  type="primary"
                  @click="openReturnDetail(record.requestId)"
                >Open return detail</a-button>
              </div>
              <div class="request-summary">
                <strong>{{ record.pendingCount }} asset(s) awaiting return</strong>
                <span>Open detail to inspect history and confirm the return.</span>
              </div>
            </div>
          </template>
        </AppTable>
      </section>

      <a-empty v-else description="You do not have access to a fulfillment queue." />

    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.fulfillment-page { max-width: none; min-width: 0; margin: 0; padding: 32px 36px 48px; }
.fulfillment-header { align-items: flex-end; display: flex; gap: 24px; justify-content: space-between; margin-bottom: 28px; }
.eyebrow { color: var(--bigin-text-tertiary); font-size: 11px; font-weight: 700; letter-spacing: .12em; margin: 0 0 8px; }
.fulfillment-header h1 { color: var(--bigin-text-primary); font-size: 30px; letter-spacing: -.02em; line-height: 1.15; margin: 0; }
.fulfillment-header p:not(.eyebrow) { color: var(--bigin-text-secondary); font-size: 14px; margin: 8px 0 0; }
.queue-count { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-subtle); border-radius: 10px; display: grid; min-width: 150px; padding: 12px 16px; }
.queue-count span { color: var(--bigin-text-tertiary); font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.queue-count strong { color: var(--bigin-color-success-text); font-size: 24px; line-height: 1.1; margin-top: 5px; }
.fulfillment-surface { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-subtle); border-radius: 12px; box-shadow: var(--bigin-shadow-elevated); overflow: hidden; }
.fulfillment-tabs { border-bottom: 1px solid var(--bigin-border-secondary); padding: 0 24px; }
.fulfillment-tabs :deep(.ant-tabs-nav) { margin: 0; }
.person-cell, .request-summary { display: grid; gap: 4px; min-width: 0; }
.person-cell strong, .request-summary strong { color: var(--bigin-text-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.person-cell span, .person-cell small, .request-summary span { color: var(--bigin-text-secondary); font-size: 12px; line-height: 1.45; }
.person-cell small { color: var(--bigin-text-tertiary); font-size: 11px; }
.action-button { border-radius: 6px; font-size: 12px; white-space: nowrap; }
.fulfillment-mobile-row { display: grid; gap: 12px; }
.queue-mobile-heading { align-items: start; display: flex; gap: 12px; justify-content: space-between; }
@media (max-width: 780px) {
  .fulfillment-page { padding: 24px 16px 36px; }
  .fulfillment-header { align-items: flex-start; flex-direction: column; }
  .queue-count { min-width: 120px; }
  .fulfillment-tabs { padding-inline: 16px; }
}
@media (max-width: 575px) {
  .fulfillment-page { padding: 16px 12px 28px; }
  .fulfillment-header h1 { font-size: 25px; }
  .queue-mobile-heading { align-items: stretch; flex-direction: column; }
  .queue-mobile-heading :deep(.ant-btn) { width: 100%; }
}
</style>
