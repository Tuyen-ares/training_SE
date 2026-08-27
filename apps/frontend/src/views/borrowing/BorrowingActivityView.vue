<script setup>
import { h, onMounted, ref } from 'vue'
import { EyeOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

import AppTable from '../../components/common/AppTable.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import {
  listAllBorrowingActivity,
  listMyBorrowingActivity,
} from '../../services/borrowing/borrowing.service'
import { useAuthStore } from '../../stores/auth'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'
import { displayAssetValue, normalizeAssetIdentity } from '../../utils/asset-identity'

const PAGE_SIZE = 20
const authStore = useAuthStore()
const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')
const result = ref({ items: [], page: 1, pageSize: PAGE_SIZE, total: 0 })
const activeTab = ref('CURRENT')
const expandedRequestKeys = ref([])
const canViewAll = authStore.hasPermission('borrow_history.view_all')

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-GB').format(new Date(value))
  : '—'
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'
const formatRequestId = (requestId) => `REQ-${String(requestId).padStart(4, '0')}`

async function load(page = 1) {
  loading.value = true
  errorMessage.value = ''
  expandedRequestKeys.value = []
  try {
    result.value = await (canViewAll ? listAllBorrowingActivity : listMyBorrowingActivity)(authStore.api, {
      page,
      pageSize: PAGE_SIZE,
      state: activeTab.value,
    })
  } catch (error) {
    errorMessage.value = error.message || 'Borrowing activity could not be loaded.'
  } finally {
    loading.value = false
  }
}

function tabChange(state) {
  activeTab.value = state
  void load(1)
}

function pageChange(page) {
  void load(page)
}

function viewDetails(historyId) {
  void router.push({ name: 'borrowing-activity-detail', params: { id: historyId } })
}

function toggleRequest(requestId) {
  expandedRequestKeys.value = expandedRequestKeys.value.includes(requestId)
    ? expandedRequestKeys.value.filter((key) => key !== requestId)
    : [...expandedRequestKeys.value, requestId]
}

function handleExpand(expanded, record) {
  if (expanded) {
    if (!expandedRequestKeys.value.includes(record.requestId)) {
      expandedRequestKeys.value = [...expandedRequestKeys.value, record.requestId]
    }
    return
  }
  expandedRequestKeys.value = expandedRequestKeys.value.filter((key) => key !== record.requestId)
}

function isExpanded(requestId) {
  return expandedRequestKeys.value.includes(requestId)
}

function assetIdentity(record) {
  return normalizeAssetIdentity(record.asset)
}

function assetModel(record) {
  return displayAssetValue(assetIdentity(record).modelName)
}

function assetCode(record) {
  return displayAssetValue(assetIdentity(record).assetCode)
}

function serialNumber(record) {
  return displayAssetValue(assetIdentity(record).serialNumber)
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort()
}

function rangeLabel(values, formatter) {
  const dates = uniqueSorted(values)
  if (!dates.length) return '—'
  if (dates.length === 1) return formatter(dates[0])
  return `${formatter(dates[0])} – ${formatter(dates[dates.length - 1])}`
}

function handoverLabel(group) {
  return rangeLabel(group.items.map((item) => item.borrowedAt), formatDate)
}

function expectedReturnDate(group) {
  return uniqueSorted(group.items.map((item) => item.expectedReturnDate))[0]
}

function expectedReturnLabel(group) {
  return rangeLabel(group.items.map((item) => item.expectedReturnDate), formatDate)
}

function returnedLabel(group) {
  return rangeLabel(group.items.map((item) => item.returnedAt), formatDate)
}

function dueState(value) {
  if (!value) return '—'
  const dueDate = new Date(`${value}T23:59:59`)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
  if (daysUntilDue < 0) return 'Overdue'
  if (daysUntilDue <= 3) return 'Due soon'
  return 'On track'
}

function dueClass(value) {
  return dueState(value).toLowerCase().replace(' ', '-')
}

function conditionLabel(value) {
  return value === 'DAMAGED' ? 'Damaged' : value === 'NORMAL' ? 'Normal' : '—'
}

function conditionSummary(group) {
  const conditions = uniqueSorted(group.items.map((item) => conditionLabel(item.returnCondition)).filter((value) => value !== '—'))
  return conditions.length ? conditions.join(' / ') : 'Condition not recorded'
}

onMounted(() => load())
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Borrowing Activity</strong></template>

    <main class="history-page bigin-page-container">
      <header>
        <h1>Borrowing Activity</h1>
        <p>{{ canViewAll ? 'Company borrowing history available to your permissions.' : 'Your current and previous borrowed assets.' }}</p>
      </header>

      <section class="panel">
        <a-tabs :active-key="activeTab" @change="tabChange">
          <a-tab-pane key="CURRENT" tab="Currently Borrowed" />
          <a-tab-pane key="RETURNED" tab="Returned History" />
        </a-tabs>

        <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage">
          <template #action>
            <a-button class="bigin-touch-target" type="link" data-test="retry-activity" @click="load(result.page)">Retry</a-button>
          </template>
        </a-alert>

        <AppTable
          v-else
          :data-source="result.items"
          :loading="loading"
          row-key="requestId"
          scroll-mode="intentional"
          :show-expand-column="false"
          :expanded-row-keys="expandedRequestKeys"
          :pagination="{ current: result.page, pageSize: result.pageSize, total: result.total, label: 'requests' }"
          empty-description="No borrowing activity found."
          @expand="handleExpand"
          @page-change="pageChange"
        >
          <a-table-column title="Request" key="request" :width="220">
            <template #default="{ record }">
              <div class="activity-request-cell">
                <strong>{{ formatRequestId(record.requestId) }}</strong>
                <span>Created {{ formatDateTime(record.requestCreatedAt) }}</span>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="Requester" key="requester" :width="230">
            <template #default="{ record }">
              <div class="activity-requester-cell">
                <a-avatar size="small" :src="record.requester?.avatarUrl">
                  {{ record.requester?.name?.slice(0, 1) || 'U' }}
                </a-avatar>
                <div>
                  <strong>{{ record.requester?.name || 'Unknown requester' }}</strong>
                  <span>{{ record.requester?.userCode || '—' }}<template v-if="record.requester?.department"> · {{ record.requester.department.name }}</template></span>
                </div>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="Assets" key="assets" :width="110">
            <template #default="{ record }">
              <div class="activity-count-cell">
                <strong>{{ record.itemCount }}</strong>
                <span>{{ record.itemCount === 1 ? 'asset' : 'assets' }}</span>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="Activity" key="activity" :width="300">
            <template #default="{ record }">
              <div class="activity-summary-cell">
                <template v-if="activeTab === 'CURRENT'">
                  <strong :class="['activity-due', `activity-due--${dueClass(expectedReturnDate(record))}`]">Due {{ expectedReturnLabel(record) }}</strong>
                  <span>Handover {{ handoverLabel(record) }}</span>
                  <small>{{ dueState(expectedReturnDate(record)) }}</small>
                </template>
                <template v-else>
                  <strong>Returned {{ returnedLabel(record) }}</strong>
                  <span>Handover {{ handoverLabel(record) }}</span>
                  <small>{{ conditionSummary(record) }}</small>
                </template>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="Action" key="action" fixed="right" :width="150" align="right">
            <template #default="{ record }">
              <a-button
                class="activity-expand-button bigin-touch-target"
                type="link"
                :data-test="`expand-request-${record.requestId}`"
                @click.stop="toggleRequest(record.requestId)"
              >
                {{ isExpanded(record.requestId) ? 'Collapse assets' : 'View assets' }}
              </a-button>
            </template>
          </a-table-column>

          <template #expandedRowRender="{ record }">
            <div class="activity-expanded-content">
              <div class="activity-expanded-heading">
                <div>
                  <strong>Assets in {{ formatRequestId(record.requestId) }}</strong>
                  <span>{{ record.itemCount }} matching {{ record.itemCount === 1 ? 'asset' : 'assets' }}</span>
                </div>
                <span>Open an asset detail to inspect the complete recorded history.</span>
              </div>

              <AppTable
                v-if="activeTab === 'CURRENT'"
                :data-source="record.items"
                row-key="id"
                scroll-mode="intentional"
                empty-description="No current assets found."
              >
                <a-table-column title="Asset" key="asset" :width="280">
                  <template #default="{ record: item }">
                    <div class="activity-asset-cell">
                      <a-avatar shape="square" :size="40" :src="item.asset.imageUrl || DEFAULT_ASSET_IMAGE">
                        {{ assetModel(item).slice(0, 1) }}
                      </a-avatar>
                      <div>
                        <strong>{{ assetModel(item) }}</strong>
                        <span>Code: {{ assetCode(item) }}</span>
                        <small>Serial: {{ serialNumber(item) }}</small>
                      </div>
                    </div>
                  </template>
                </a-table-column>
                <a-table-column title="Handover" key="handover" :width="160">
                  <template #default="{ record: item }">
                    <span class="activity-date-cell">{{ formatDateTime(item.borrowedAt) }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="Expected return" key="expected-return" :width="180">
                  <template #default="{ record: item }">
                    <div class="activity-detail-cell">
                      <strong>{{ formatDate(item.expectedReturnDate) }}</strong>
                      <small :class="['activity-due', `activity-due--${dueClass(item.expectedReturnDate)}`]">{{ dueState(item.expectedReturnDate) }}</small>
                    </div>
                  </template>
                </a-table-column>
                <a-table-column title="Action" key="action" :width="140" align="right">
                  <template #default="{ record: item }">
                    <a-button class="bigin-touch-target" type="link" :icon="h(EyeOutlined)" @click="viewDetails(item.id)">View details</a-button>
                  </template>
                </a-table-column>
              </AppTable>

              <AppTable
                v-else
                :data-source="record.items"
                row-key="id"
                scroll-mode="intentional"
                empty-description="No returned assets found."
              >
                <a-table-column title="Asset" key="asset" :width="280">
                  <template #default="{ record: item }">
                    <div class="activity-asset-cell">
                      <a-avatar shape="square" :size="40" :src="item.asset.imageUrl || DEFAULT_ASSET_IMAGE">
                        {{ assetModel(item).slice(0, 1) }}
                      </a-avatar>
                      <div>
                        <strong>{{ assetModel(item) }}</strong>
                        <span>Code: {{ assetCode(item) }}</span>
                        <small>Serial: {{ serialNumber(item) }}</small>
                      </div>
                    </div>
                  </template>
                </a-table-column>
                <a-table-column title="Handover" key="handover" :width="160">
                  <template #default="{ record: item }">
                    <span class="activity-date-cell">{{ formatDateTime(item.borrowedAt) }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="Returned" key="returned" :width="160">
                  <template #default="{ record: item }">
                    <span class="activity-date-cell">{{ formatDateTime(item.returnedAt) }}</span>
                  </template>
                </a-table-column>
                <a-table-column title="Condition" key="condition" :width="190">
                  <template #default="{ record: item }">
                    <div class="activity-detail-cell">
                      <strong>{{ conditionLabel(item.returnCondition) }}</strong>
                      <small v-if="item.receivedBy">Received by {{ item.receivedBy.name }}</small>
                    </div>
                  </template>
                </a-table-column>
                <a-table-column title="Action" key="action" :width="140" align="right">
                  <template #default="{ record: item }">
                    <a-button class="bigin-touch-target" type="link" :icon="h(EyeOutlined)" @click="viewDetails(item.id)">View details</a-button>
                  </template>
                </a-table-column>
              </AppTable>
            </div>
          </template>

          <template #mobileRow="{ record }">
            <div class="activity-mobile-row">
              <div class="activity-mobile-header">
                <div class="activity-request-cell">
                  <strong>{{ formatRequestId(record.requestId) }}</strong>
                  <span>{{ record.requester?.name || 'Unknown requester' }} · {{ record.itemCount }} {{ record.itemCount === 1 ? 'asset' : 'assets' }}</span>
                </div>
                <a-button class="bigin-touch-target" type="link" @click="toggleRequest(record.requestId)">
                  {{ isExpanded(record.requestId) ? 'Hide assets' : 'View assets' }}
                </a-button>
              </div>
              <div class="activity-mobile-meta">
                <span>Created {{ formatDateTime(record.requestCreatedAt) }}</span>
                <span v-if="activeTab === 'CURRENT'">Due {{ expectedReturnLabel(record) }} · {{ dueState(expectedReturnDate(record)) }}</span>
                <span v-else>Returned {{ returnedLabel(record) }} · {{ conditionSummary(record) }}</span>
              </div>
              <div v-if="isExpanded(record.requestId)" class="activity-mobile-items">
                <article v-for="item in record.items" :key="item.id" class="activity-mobile-item">
                  <div class="activity-asset-cell">
                    <a-avatar shape="square" :size="36" :src="item.asset.imageUrl || DEFAULT_ASSET_IMAGE">
                      {{ assetModel(item).slice(0, 1) }}
                    </a-avatar>
                    <div>
                      <strong>{{ assetModel(item) }}</strong>
                      <span>{{ assetCode(item) }} · {{ serialNumber(item) }}</span>
                    </div>
                  </div>
                  <div class="activity-mobile-item-meta">
                    <span>Handover {{ formatDateTime(item.borrowedAt) }}</span>
                    <span v-if="activeTab === 'CURRENT'">Expected return {{ formatDate(item.expectedReturnDate) }}</span>
                    <span v-else>Returned {{ formatDateTime(item.returnedAt) }} · {{ conditionLabel(item.returnCondition) }}</span>
                  </div>
                  <a-button class="bigin-touch-target" type="link" :icon="h(EyeOutlined)" @click="viewDetails(item.id)">View details</a-button>
                </article>
              </div>
            </div>
          </template>
        </AppTable>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.history-page { margin: 0; max-width: none; padding: 24px; }
.history-page header h1 { font-size: 26px; margin: 0; }
.history-page header p { color: var(--bigin-text-tertiary); margin: 4px 0 18px; }
.panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; min-height: 600px; padding: 16px; }
.activity-request-cell, .activity-requester-cell > div, .activity-count-cell, .activity-summary-cell, .activity-detail-cell, .activity-expanded-heading > div { display: grid; gap: 4px; min-width: 0; }
.activity-request-cell strong, .activity-requester-cell strong, .activity-count-cell strong, .activity-summary-cell strong, .activity-detail-cell strong, .activity-expanded-heading strong { color: var(--bigin-text-primary); font-size: 13px; }
.activity-request-cell span, .activity-requester-cell span, .activity-count-cell span, .activity-summary-cell span, .activity-summary-cell small, .activity-detail-cell small, .activity-expanded-heading span { color: var(--bigin-text-tertiary); font-size: 12px; line-height: 1.45; }
.activity-requester-cell { align-items: center; display: flex; gap: 10px; min-width: 0; }
.activity-requester-cell > div { overflow: hidden; }
.activity-requester-cell strong, .activity-requester-cell span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-count-cell strong { font-size: 18px; }
.activity-count-cell span { text-transform: lowercase; }
.activity-summary-cell small, .activity-detail-cell small { font-size: 11px; font-weight: 600; }
.activity-due { font-weight: 700 !important; }
.activity-due--overdue { color: var(--bigin-color-error-text) !important; }
.activity-due--due-soon { color: var(--bigin-color-warning-text) !important; }
.activity-due--on-track { color: var(--bigin-color-success-text) !important; }
.activity-expand-button { font-size: 12px; padding-inline: 4px; }
.activity-expanded-content { background: var(--bigin-surface-subtle); border-top: 1px solid var(--bigin-border-secondary); margin: -16px calc(-1 * var(--bigin-table-cell-padding-x)); padding: 18px var(--bigin-table-cell-padding-x) 20px; }
.activity-expanded-heading { align-items: end; display: flex; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.activity-expanded-heading > span { text-align: right; }
.activity-asset-cell { align-items: center; display: flex; gap: 10px; min-width: 0; }
.activity-asset-cell > div { display: grid; gap: 3px; min-width: 0; }
.activity-asset-cell strong, .activity-asset-cell span, .activity-asset-cell small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-asset-cell strong { color: var(--bigin-text-primary); font-size: 13px; }
.activity-asset-cell span, .activity-asset-cell small { color: var(--bigin-text-secondary); font-size: 12px; }
.activity-asset-cell small { color: var(--bigin-text-tertiary); font-size: 11px; }
.activity-date-cell { color: var(--bigin-text-secondary); font-size: 13px; }
.activity-mobile-row, .activity-mobile-item, .activity-mobile-meta, .activity-mobile-item-meta { display: grid; gap: 10px; min-width: 0; }
.activity-mobile-header { align-items: start; display: flex; gap: 12px; justify-content: space-between; }
.activity-mobile-header :deep(.ant-btn) { flex: 0 0 auto; padding-inline: 0; }
.activity-mobile-meta, .activity-mobile-item-meta { color: var(--bigin-text-tertiary); font-size: 12px; }
.activity-mobile-items { border-top: 1px solid var(--bigin-border-secondary); display: grid; gap: 12px; padding-top: 12px; }
.activity-mobile-item { border-top: 1px solid var(--bigin-border-secondary); padding-top: 12px; }
.activity-mobile-item:first-child { border-top: 0; padding-top: 0; }
.activity-mobile-item :deep(.ant-btn) { justify-self: start; padding-inline: 0; }
@media (max-width: 767px) {
  .history-page { padding: 20px 16px 32px; }
  .panel { padding: 12px; }
  .activity-expanded-heading { align-items: start; flex-direction: column; }
  .activity-expanded-heading > span { text-align: left; }
}
@media (max-width: 575px) {
  .history-page { padding: 16px 12px 28px; }
  .history-page header h1 { font-size: 24px; }
  .panel { padding: 8px; }
  .activity-mobile-header { align-items: stretch; flex-direction: column; gap: 4px; }
  .activity-mobile-header :deep(.ant-btn) { justify-self: start; text-align: left; }
}
</style>
