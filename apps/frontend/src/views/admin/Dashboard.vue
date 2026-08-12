<script setup>
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BellOutlined,
  CheckSquareOutlined,
  HistoryOutlined,
  InboxOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { statusColor } from '../../constants/status-meta'
import { listAssets } from '../../services/asset.service'
import { listCurrentBorrowing, listMyBorrowHistory } from '../../services/borrow.service'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const assetSummary = ref(null)
const assetSummaryError = ref('')
const isLoadingSummary = ref(false)
const personalSummary = ref({ availableAssets: null, currentBorrowed: null, pendingRequests: null, activity: [] })
const isLoadingPersonalSummary = ref(false)

const canViewAssets = computed(() => authStore.hasPermission('asset.view'))
const canViewOperationalAssetOverview = computed(() => authStore.hasPermission('asset.create') || authStore.hasPermission('asset.update') || authStore.hasPermission('asset.delete'))
const canViewOwnRequests = computed(() => authStore.hasPermission('borrow_request.view_own'))
const canReviewRequests = computed(() => authStore.hasPermission('borrow_request.approve') || authStore.hasPermission('borrow_request.reject'))
const canViewBorrowingActivity = computed(() => authStore.hasPermission('borrow_history.view_own') || authStore.hasPermission('borrow_history.view_all'))
const canManageIssues = computed(() => authStore.hasPermission('asset_issue.report') || authStore.hasPermission('asset_issue.view'))
const canManageUsers = computed(() => authStore.hasPermission('user.view'))
const userFirstName = computed(() => authStore.user?.name?.trim().split(/\s+/)[0] || 'there')
const canViewPersonalSummary = computed(() => canViewOwnRequests.value || canViewBorrowingActivity.value)
const isPersonalDashboard = computed(() => canViewPersonalSummary.value && !canViewOperationalAssetOverview.value)

const personalMetrics = computed(() => [
  {
    label: 'Available Assets',
    value: personalSummary.value.availableAssets,
    icon: AppstoreOutlined,
    tone: 'orange',
    visible: canViewAssets.value,
  },
  {
    label: 'Borrowing',
    value: personalSummary.value.currentBorrowed,
    icon: HistoryOutlined,
    tone: 'slate',
    visible: canViewBorrowingActivity.value,
  },
  {
    label: 'Pending Requests',
    value: personalSummary.value.pendingRequests,
    icon: InboxOutlined,
    tone: 'red',
    visible: canViewOwnRequests.value,
  },
].filter((metric) => metric.visible))

const activityColumns = [
  { title: 'Asset ID', key: 'assetId', width: 200 },
  { title: 'Asset Name', key: 'assetName' },
  { title: 'Borrowed on', key: 'borrowedOn', width: 160 },
  { title: 'Status', key: 'status', width: 140 },
  { title: 'Action', key: 'action', width: 120 },
]

const assetMetrics = computed(() => [
  { label: 'Total assets', value: assetSummary.value?.total ?? 0, status: 'TOTAL' },
  { label: 'Available', value: assetSummary.value?.available ?? 0, status: 'AVAILABLE' },
  { label: 'Reserved', value: assetSummary.value?.reserved ?? 0, status: 'RESERVED' },
  { label: 'Borrowed', value: assetSummary.value?.borrowed ?? 0, status: 'BORROWED' },
  { label: 'In repair', value: assetSummary.value?.inRepair ?? 0, status: 'IN_REPAIR' },
])

const workQueues = computed(() => [
  {
    key: 'approval',
    title: 'Approval Queue',
    description: 'Review pending asset requests assigned to you.',
    icon: CheckSquareOutlined,
    visible: canReviewRequests.value,
  },
  {
    key: 'fulfillment',
    title: 'Handover & Return',
    description: 'Confirm handovers and receive returned assets.',
    icon: HistoryOutlined,
    visible: authStore.hasPermission('asset.checkout') || authStore.hasPermission('asset.checkin'),
  },
  {
    key: 'issues',
    title: 'Asset Issues & Repairs',
    description: 'Review reported issues and repair activity.',
    icon: ToolOutlined,
    visible: canManageIssues.value,
  },
].filter((queue) => queue.visible))

const quickAccess = computed(() => [
  {
    key: 'assets',
    title: 'Assets',
    description: 'Search the asset register and open asset details.',
    icon: AppstoreOutlined,
    routeName: 'assets',
    visible: canViewAssets.value,
  },
  {
    key: 'requests',
    title: 'My Requests',
    description: 'Create and track your asset borrowing requests.',
    icon: InboxOutlined,
    visible: canViewOwnRequests.value,
  },
  {
    key: 'activity',
    title: 'Borrowing Activity',
    description: 'View your current borrowed assets and history.',
    icon: HistoryOutlined,
    visible: canViewBorrowingActivity.value,
  },
  {
    key: 'users',
    title: 'User Management',
    description: 'Review users and their available access.',
    icon: TeamOutlined,
    routeName: 'users',
    visible: canManageUsers.value,
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Review updates that are relevant to your work.',
    icon: BellOutlined,
    visible: authStore.isAuthenticated,
  },
].filter((shortcut) => shortcut.visible))

function toDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB').format(date)
}

function activityAsset(history) {
  const asset = history.asset
  return {
    id: asset?.id,
    serialNumber: asset?.serialNumber || `Asset #${history.detailId}`,
    name: asset?.model?.name || 'Unknown model',
  }
}

async function loadAssetSummary() {
  if (!canViewOperationalAssetOverview.value) return

  isLoadingSummary.value = true
  assetSummaryError.value = ''
  try {
    const [all, available, reserved, borrowed, inRepair] = await Promise.all([
      listAssets(authStore.api, { page: 1, pageSize: 1 }),
      listAssets(authStore.api, { status: 'AVAILABLE', page: 1, pageSize: 1 }),
      listAssets(authStore.api, { status: 'RESERVED', page: 1, pageSize: 1 }),
      listAssets(authStore.api, { status: 'BORROWED', page: 1, pageSize: 1 }),
      listAssets(authStore.api, { status: 'IN_REPAIR', page: 1, pageSize: 1 }),
    ])
    assetSummary.value = {
      total: all.total,
      available: available.total,
      reserved: reserved.total,
      borrowed: borrowed.total,
      inRepair: inRepair.total,
    }
  } catch (error) {
    assetSummaryError.value = error.message || 'Asset overview could not be loaded.'
  } finally {
    isLoadingSummary.value = false
  }
}

async function loadPersonalSummary() {
  if (!canViewPersonalSummary.value) return

  isLoadingPersonalSummary.value = true
  const nextSummary = { availableAssets: null, currentBorrowed: null, pendingRequests: null, activity: [] }
  const requests = []

  if (canViewAssets.value) {
    requests.push(listAssets(authStore.api, { status: 'AVAILABLE', page: 1, pageSize: 1 }).then((page) => {
      nextSummary.availableAssets = page?.total ?? 0
    }))
  }

  if (canViewBorrowingActivity.value) {
    requests.push(listCurrentBorrowing(authStore.api, { page: 1, pageSize: 1 }).then((page) => {
      nextSummary.currentBorrowed = page?.total ?? 0
    }))
    requests.push(listMyBorrowHistory(authStore.api, { page: 1, pageSize: 3 }).then((page) => {
      nextSummary.activity = Array.isArray(page?.items) ? page.items : []
    }))
  }

  if (canViewOwnRequests.value) {
    requests.push(authStore.api('/borrow-requests/me?status=PENDING&page=1&pageSize=1').then((page) => {
      nextSummary.pendingRequests = page?.total ?? 0
    }))
  }

  const results = await Promise.allSettled(requests)
  personalSummary.value = nextSummary
  isLoadingPersonalSummary.value = false

  if (results.every((result) => result.status === 'rejected')) {
    personalSummary.value = { availableAssets: null, currentBorrowed: null, pendingRequests: null, activity: [] }
  }
}

function openRoute(routeName) {
  if (routeName) router.push({ name: routeName })
}

function openActivityAsset(history) {
  const assetId = activityAsset(history).id
  if (assetId) router.push({ name: 'asset-detail', params: { id: assetId } })
}

onMounted(() => {
  void loadAssetSummary()
  void loadPersonalSummary()
})
</script>

<template>
  <WorkspaceLayout>
    <main class="dashboard-page">
      <header class="dashboard-page__heading">
        <div>
          <a-typography-title :level="2">{{ isPersonalDashboard ? `Welcome, ${userFirstName}` : 'Overview' }}</a-typography-title>
          <a-typography-paragraph type="secondary">
            {{ isPersonalDashboard ? 'Asset overview and your requests today.' : 'Items displayed are based on granted permissions.' }}
          </a-typography-paragraph>
        </div>
      </header>

      <section v-if="canViewPersonalSummary" class="dashboard-page__section dashboard-page__personal-section" aria-labelledby="personal-overview-title">
        <div v-if="!isPersonalDashboard" class="dashboard-page__section-heading">
          <div>
            <a-typography-title id="personal-overview-title" :level="4">Personal Data</a-typography-title>
          </div>
        </div>
        <a-row :gutter="[16, 16]">
          <a-col v-for="metric in personalMetrics" :key="metric.label" :xs="24" :md="isPersonalDashboard ? 8 : 12">
            <a-card :loading="isLoadingPersonalSummary" class="dashboard-page__personal-metric" :class="`dashboard-page__personal-metric--${metric.tone}`">
              <component :is="metric.icon" class="dashboard-page__personal-icon" />
              <a-statistic :title="metric.label" :value="metric.value ?? '—'" />
            </a-card>
          </a-col>
        </a-row>
      </section>

      <section v-if="canViewOperationalAssetOverview" class="dashboard-page__section" aria-labelledby="asset-overview-title">
        <div class="dashboard-page__section-heading">
          <div>
            <a-typography-title id="asset-overview-title" :level="4">Asset Overview</a-typography-title>
            <a-typography-text type="secondary">Current counts from the asset register</a-typography-text>
          </div>
          <a-button type="link" @click="openRoute('assets')">View assets <ArrowRightOutlined /></a-button>
        </div>

        <a-alert v-if="assetSummaryError" type="error" show-icon :message="assetSummaryError" class="dashboard-page__alert">
          <template #action><a-button size="small" @click="loadAssetSummary">Retry</a-button></template>
        </a-alert>
        <a-row v-else :gutter="[16, 16]">
          <a-col v-for="metric in assetMetrics" :key="metric.label" :xs="24" :sm="12" :lg="8" :xl="4">
            <a-card :loading="isLoadingSummary" class="dashboard-page__metric">
              <a-statistic :title="metric.label" :value="metric.value">
                <template #prefix><a-badge :status="statusColor(metric.status)" /></template>
              </a-statistic>
            </a-card>
          </a-col>
        </a-row>
      </section>

      <section v-if="workQueues.length" class="dashboard-page__section" aria-labelledby="work-queue-title">
        <div class="dashboard-page__section-heading">
          <div>
            <a-typography-title id="work-queue-title" :level="4">Work Queue</a-typography-title>
            <a-typography-text type="secondary">Actions available through your effective permissions</a-typography-text>
          </div>
        </div>
        <a-row :gutter="[16, 16]">
          <a-col v-for="queue in workQueues" :key="queue.key" :xs="24" :md="12" :xl="8">
            <a-card class="dashboard-page__work-card">
              <component :is="queue.icon" class="dashboard-page__work-icon" />
              <a-typography-title :level="5">{{ queue.title }}</a-typography-title>
              <a-typography-paragraph type="secondary">{{ queue.description }}</a-typography-paragraph>
            </a-card>
          </a-col>
        </a-row>
      </section>

      <section v-if="quickAccess.length" class="dashboard-page__section" aria-labelledby="quick-access-title">
        <a-typography-title id="quick-access-title" :level="4">Quick Access</a-typography-title>
        <a-row :gutter="[16, 16]">
          <a-col v-for="shortcut in quickAccess" :key="shortcut.key" :xs="24" :md="12" :xl="6">
            <a-card class="dashboard-page__shortcut" :class="{ 'dashboard-page__shortcut--active': shortcut.routeName }" @click="openRoute(shortcut.routeName)">
              <component :is="shortcut.icon" class="dashboard-page__shortcut-icon" />
              <a-typography-title :level="5">{{ shortcut.title }}</a-typography-title>
              <a-typography-paragraph type="secondary">{{ shortcut.description }}</a-typography-paragraph>
              <a-typography-link v-if="shortcut.routeName">Open <ArrowRightOutlined /></a-typography-link>
            </a-card>
          </a-col>
        </a-row>
      </section>

      <section v-if="canViewBorrowingActivity && personalSummary.activity.length" class="dashboard-page__section" aria-labelledby="recent-activity-title">
        <div class="dashboard-page__section-heading">
          <div>
            <a-typography-title id="recent-activity-title" :level="4">Recent Borrowing Activity</a-typography-title>
          </div>
          <a-button type="link" @click="openRoute()">View all</a-button>
        </div>
        <a-card :bordered="false" class="dashboard-page__activity-card">
          <a-table :columns="activityColumns" :data-source="personalSummary.activity" :pagination="false" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <a-typography-text v-if="column.key === 'assetId'" strong>{{ activityAsset(record).serialNumber }}</a-typography-text>
              <a-typography-text v-else-if="column.key === 'assetName'">{{ activityAsset(record).name }}</a-typography-text>
              <a-typography-text v-else-if="column.key === 'borrowedOn'">{{ toDate(record.borrowedAt) }}</a-typography-text>
              <StatusTag v-else-if="column.key === 'status'" :status="record.returnedAt ? 'RETURNED' : 'CURRENT'" />
              <a-button v-else-if="column.key === 'action'" size="small" @click="openActivityAsset(record)">Details</a-button>
            </template>
          </a-table>
        </a-card>
      </section>

      <a-empty v-if="!canViewAssets && !workQueues.length && !quickAccess.length" description="No workspace modules are available for this account yet." />
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.dashboard-page { margin: 0 auto; max-width: 1440px; padding: 32px; }
.dashboard-page__heading { margin-bottom: 32px; }
.dashboard-page__heading :deep(.ant-typography-title) { margin-bottom: 4px; }
.dashboard-page__heading :deep(.ant-typography-paragraph) { margin-bottom: 0; }
.dashboard-page__section { margin-top: 32px; }
.dashboard-page__section:first-of-type { margin-top: 0; }
.dashboard-page__section-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 16px; }
.dashboard-page__section-heading :deep(.ant-typography-title), .dashboard-page__section > :deep(.ant-typography-title) { margin-bottom: 4px; }
.dashboard-page__section > :deep(.ant-typography-title) { margin-bottom: 16px; }
.dashboard-page__metric { min-height: 116px; }
.dashboard-page__personal-section { margin-top: 0; }
.dashboard-page__personal-metric { min-height: 104px; border-color: var(--bigin-border-default); }
.dashboard-page__personal-metric :deep(.ant-card-body) { align-items: center; display: flex; gap: 16px; }
.dashboard-page__personal-icon { border-radius: 12px; font-size: 22px; padding: 14px; }
.dashboard-page__personal-metric--orange .dashboard-page__personal-icon { background: var(--bigin-surface-primary-soft); color: var(--bigin-color-primary); }
.dashboard-page__personal-metric--slate .dashboard-page__personal-icon { background: var(--bigin-surface-neutral); color: var(--bigin-color-neutral); }
.dashboard-page__personal-metric--red .dashboard-page__personal-icon { background: var(--bigin-surface-error); color: var(--bigin-color-error); }
.dashboard-page__personal-metric :deep(.ant-statistic-title) { color: var(--bigin-text-secondary); font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.dashboard-page__personal-metric :deep(.ant-statistic-content) { font-size: 28px; }
.dashboard-page__alert { margin-bottom: 16px; }
.dashboard-page__activity-card { overflow: hidden; border: 1px solid var(--bigin-border-default); }
.dashboard-page__work-card, .dashboard-page__shortcut { height: 100%; min-height: 184px; }
.dashboard-page__work-card :deep(.ant-card-body), .dashboard-page__shortcut :deep(.ant-card-body) { align-items: flex-start; display: flex; flex-direction: column; }
.dashboard-page__work-card :deep(.ant-typography-title), .dashboard-page__shortcut :deep(.ant-typography-title) { margin: 12px 0 4px; }
.dashboard-page__work-card :deep(.ant-typography-paragraph), .dashboard-page__shortcut :deep(.ant-typography-paragraph) { margin-bottom: 16px; }
.dashboard-page__work-icon, .dashboard-page__shortcut-icon { color: var(--ant-color-primary); font-size: 22px; }
.dashboard-page__shortcut--active { cursor: pointer; }
.dashboard-page__shortcut :deep(.ant-typography-link) { margin-top: auto; }
@media (max-width: 640px) { .dashboard-page { padding: 24px 16px; }.dashboard-page__section-heading { align-items: flex-start; flex-direction: column; gap: 8px; } }
</style>
