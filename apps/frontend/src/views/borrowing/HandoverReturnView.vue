<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { CheckCircleOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AppTable from '../../components/common/AppTable.vue'
import EvidenceMediaPicker from '../../components/common/EvidenceMediaPicker.vue'
import {
  handoverBorrowDetail,
  listHandoverQueue,
  listReturnQueue,
  receiveDamagedReturn,
  receiveNormalReturn,
} from '../../services/borrowing/borrowing.service'
import { useAuthStore } from '../../stores/auth'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'
import { actionWidth } from '../../utils/table'
import { displayAssetValue, normalizeAssetIdentity } from '../../utils/asset-identity'
import { EvidenceBatchError, submitEvidenceBatch } from '../../services/evidence-batch.service'

const route = useRoute()
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
const items = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const busy = ref(null)
const damagedOpen = ref(false)
const damagedHistory = ref(null)
const damagedDescription = ref('')
const damagedEvidence = ref([])
const damagedPicker = ref(null)
const handoverOpen = ref(false)
const handoverItem = ref(null)
const handoverEvidence = ref([])
const handoverPicker = ref(null)
const normalReturnOpen = ref(false)
const normalReturnHistory = ref(null)
const normalReturnEvidence = ref([])
const normalReturnPicker = ref(null)
const evidenceProcessing = ref(false)
const retryBlocked = ref(false)
const queueLoadGenerations = { handover: 0, return: 0 }

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
  : '—'
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'
const busyKey = (type, id) => `${type}-${id}`

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
    items.value = []
    total.value = 0
  }

  try {
    const result = tab === 'handover'
      ? await listHandoverQueue(authStore.api, { page: requestedPage, pageSize: requestedPageSize })
      : await listReturnQueue(authStore.api, { page: requestedPage, pageSize: requestedPageSize })
    if (!isCurrentLoad()) return null

    items.value = result?.items || []
    page.value = result?.page || requestedPage
    pageSize.value = result?.pageSize || requestedPageSize
    total.value = result?.total || 0
    return result
  } catch (error) {
    if (isCurrentLoad()) {
      errorMessage.value = error.message || `${tab === 'handover' ? 'Handover' : 'Return'} queue could not be loaded.`
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

function confirmHandover(item) {
  handoverItem.value = item
  retryBlocked.value = false
  handoverOpen.value = true
}

function confirmNormalReturn(history) {
  normalReturnHistory.value = history
  retryBlocked.value = false
  normalReturnOpen.value = true
}

function handleEvidenceFailure(error) {
  if (!(error instanceof EvidenceBatchError)) return false
  retryBlocked.value = error.retryBlocked
  message.error(error.message)
  return true
}

function closeHandover() {
  if (busy.value || evidenceProcessing.value) return
  handoverOpen.value = false
  handoverPicker.value?.reset()
}

function closeNormalReturn() {
  if (busy.value || evidenceProcessing.value) return
  normalReturnOpen.value = false
  normalReturnPicker.value?.reset()
}

function closeDamagedReturn() {
  if (busy.value || evidenceProcessing.value) return
  damagedOpen.value = false
  damagedPicker.value?.reset()
}

async function reconcileLinkedAttempt(tab, targetId, type) {
  const result = await load(tab)
  if (!result || activeTab.value !== tab) return

  const stillPending = result.items?.some((item) => (type === 'handover' ? item.detailId : item.id) === targetId)
  if (stillPending) {
    retryBlocked.value = true
    return
  }
  if (type === 'handover') {
    handoverOpen.value = false
    handoverPicker.value?.reset()
  } else if (type === 'normal-return') {
    normalReturnOpen.value = false
    normalReturnPicker.value?.reset()
  } else {
    damagedOpen.value = false
    damagedPicker.value?.reset()
  }
  message.success('The previous request was already recorded.')
}

async function submitHandover() {
  const item = handoverItem.value
  if (!item) return
  busy.value = busyKey('handover', item.detailId)
  try {
    await submitEvidenceBatch({
      api: authStore.api,
      items: handoverEvidence.value,
      purpose: 'HANDOVER',
      submitBusiness: (mediaIds) => handoverBorrowDetail(authStore.api, item.detailId, mediaIds),
    })
    handoverOpen.value = false
    handoverPicker.value?.reset()
    message.success('Handover confirmed.')
    if (activeTab.value === 'handover') await load('handover')
  } catch (error) {
    if (handleEvidenceFailure(error)) {
      if (error.reconcileRequired) await reconcileLinkedAttempt('handover', item.detailId, 'handover')
    } else message.error(error.status === 409
      ? 'This asset has already been processed or is no longer reserved.'
      : error.message || 'Handover could not be confirmed.')
  } finally {
    busy.value = null
  }
}

async function submitNormalReturn() {
  const history = normalReturnHistory.value
  if (!history) return
  busy.value = busyKey('return', history.id)
  try {
    await submitEvidenceBatch({
      api: authStore.api,
      items: normalReturnEvidence.value,
      purpose: 'RETURN',
      submitBusiness: (mediaIds) => receiveNormalReturn(authStore.api, history.id, mediaIds),
    })
    normalReturnOpen.value = false
    normalReturnPicker.value?.reset()
    message.success('Return recorded.')
    if (activeTab.value === 'return') await load('return')
  } catch (error) {
    if (handleEvidenceFailure(error)) {
      if (error.reconcileRequired) await reconcileLinkedAttempt('return', history.id, 'normal-return')
    } else message.error(error.status === 409
      ? 'This return has already been processed or the asset is no longer borrowed.'
      : error.message || 'Return could not be recorded.')
  } finally {
    busy.value = null
  }
}

function openDamagedReturn(history) {
  damagedHistory.value = history
  damagedDescription.value = ''
  retryBlocked.value = false
  damagedOpen.value = true
}

async function confirmDamagedReturn() {
  const description = damagedDescription.value.trim()
  if (!description) {
    message.warning('Describe the damage before confirming the return.')
    return
  }

  const history = damagedHistory.value
  if (!history) return
  busy.value = busyKey('return', history.id)
  try {
    const result = await submitEvidenceBatch({
      api: authStore.api,
      items: damagedEvidence.value,
      purpose: 'RETURN',
      submitBusiness: (mediaIds) => receiveDamagedReturn(authStore.api, history.id, description, mediaIds),
    })
    damagedOpen.value = false
    damagedPicker.value?.reset()
    message.success(`Damaged return recorded. Issue #${result.issueId} created.`)
    if (activeTab.value === 'return') await load('return')
  } catch (error) {
    if (handleEvidenceFailure(error)) {
      if (error.reconcileRequired) await reconcileLinkedAttempt('return', history.id, 'damaged-return')
    } else message.error(error.status === 409
      ? 'This return has already been processed or the asset is no longer borrowed.'
      : error.message || 'Damaged return could not be recorded.')
  } finally {
    busy.value = null
  }
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
    <template #context><strong>Handover & Return</strong></template>

    <main class="fulfillment-page">
      <header class="fulfillment-header">
        <div>
          <p class="eyebrow">FULFILLMENT</p>
          <h1>Handover & Return</h1>
          <p>Complete asset handovers and record returns from one operational queue.</p>
        </div>
        <div v-if="tabs.length" class="queue-count">
          <span>{{ activeTab === 'handover' ? 'PENDING HANDOVER' : 'AWAITING RETURN' }}</span>
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
          :data-source="items"
          :loading="loading"
          row-key="detailId"
          scroll-mode="intentional"
          empty-description="No assets are pending handover."
          :pagination="{ current: page, pageSize, total, label: 'records' }"
          @page-change="pageChange"
        >
          <a-table-column title="Asset" key="asset" :width="300">
            <template #default="{ record }">
              <div class="asset-cell"><a-avatar shape="square" size="small" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName).slice(0, 1) }}</a-avatar><div><strong>{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName) }}</strong><span>Code: {{ displayAssetValue(normalizeAssetIdentity(record.asset).assetCode) }}</span><span>Seri: {{ displayAssetValue(normalizeAssetIdentity(record.asset).serialNumber) }}</span></div></div>
            </template>
          </a-table-column>
          <a-table-column title="Request" key="request" :width="260">
            <template #default="{ record }"><div class="person-cell"><strong>REQ-{{ String(record.requestId).padStart(4, '0') }} · {{ record.requester.name }}</strong><span>{{ record.requester.department?.name || 'No department' }}</span></div></template>
          </a-table-column>
          <a-table-column title="Expected return" key="expected-return" :width="170"><template #default="{ record }">{{ formatDate(record.expectedReturnDate) }}</template></a-table-column>
          <a-table-column title="Approved by" key="approved-by" :width="190"><template #default="{ record }"><div class="person-cell"><strong>{{ record.approvedBy?.name || '—' }}</strong><span>{{ formatDateTime(record.approvedAt) }}</span></div></template></a-table-column>
          <a-table-column title="Action" key="action" fixed="right" :width="actionWidth('wide')" align="right">
            <template #default="{ record }"><a-button class="action-button bigin-touch-target" type="primary" :loading="busy === busyKey('handover', record.detailId)" :disabled="busy !== null" :icon="h(SwapOutlined)" @click="confirmHandover(record)">Confirm handover</a-button></template>
          </a-table-column>
          <template #mobileRow="{ record }">
            <div class="fulfillment-mobile-row"><div class="asset-cell"><a-avatar shape="square" size="small" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName).slice(0, 1) }}</a-avatar><div><strong>{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName) }}</strong><span>REQ-{{ String(record.requestId).padStart(4, '0') }} · {{ record.requester.name }}</span><small>Code: {{ displayAssetValue(normalizeAssetIdentity(record.asset).assetCode) }} · Seri: {{ displayAssetValue(normalizeAssetIdentity(record.asset).serialNumber) }} · {{ formatDate(record.expectedReturnDate) }}</small></div></div><div class="fulfillment-mobile-meta"><span>Approved by {{ record.approvedBy?.name || '—' }}</span><span>{{ record.requester.department?.name || 'No department' }}</span></div><a-button class="action-button bigin-touch-target" type="primary" :loading="busy === busyKey('handover', record.detailId)" :disabled="busy !== null" :icon="h(SwapOutlined)" @click="confirmHandover(record)">Confirm handover</a-button></div>
          </template>
        </AppTable>

        <AppTable
          v-else
          key="return"
          :data-source="items"
          :loading="loading"
          row-key="id"
          scroll-mode="intentional"
          empty-description="No assets are awaiting return."
          :pagination="{ current: page, pageSize, total, label: 'records' }"
          @page-change="pageChange"
        >
          <a-table-column title="Asset" key="asset" :width="300">
            <template #default="{ record }"><div class="asset-cell"><a-avatar shape="square" size="small" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName).slice(0, 1) }}</a-avatar><div><strong>{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName) }}</strong><span>Code: {{ displayAssetValue(normalizeAssetIdentity(record.asset).assetCode) }}</span><span>Seri: {{ displayAssetValue(normalizeAssetIdentity(record.asset).serialNumber) }}</span></div></div></template>
          </a-table-column>
          <a-table-column title="Borrower" key="borrower" :width="210"><template #default="{ record }"><div class="person-cell"><strong>{{ record.borrower.name }}</strong><span>{{ record.borrower.userCode }}</span></div></template></a-table-column>
          <a-table-column title="Borrowing" key="borrowing" :width="220"><template #default="{ record }"><div class="person-cell"><strong>{{ formatDateTime(record.borrowedAt) }}</strong><span>Expected {{ formatDate(record.expectedReturnDate) }}</span></div></template></a-table-column>
          <a-table-column title="Action" key="action" fixed="right" :width="actionWidth('wide')" align="right">
            <template #default="{ record }"><div class="return-actions"><a-button class="action-button bigin-touch-target" type="primary" :loading="busy === busyKey('return', record.id)" :disabled="busy !== null" :icon="h(CheckCircleOutlined)" @click="confirmNormalReturn(record)">Confirm Normal Return</a-button><a-button class="action-button bigin-touch-target" danger :disabled="busy !== null" :icon="h(WarningOutlined)" @click="openDamagedReturn(record)">Confirm Damaged Return</a-button></div></template>
          </a-table-column>
          <template #mobileRow="{ record }">
            <div class="fulfillment-mobile-row"><div class="asset-cell"><a-avatar shape="square" size="small" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName).slice(0, 1) }}</a-avatar><div><strong>{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName) }}</strong><span>{{ record.borrower.name }} · {{ record.borrower.userCode }}</span><small>Code: {{ displayAssetValue(normalizeAssetIdentity(record.asset).assetCode) }} · Seri: {{ displayAssetValue(normalizeAssetIdentity(record.asset).serialNumber) }} · Expected {{ formatDate(record.expectedReturnDate) }}</small></div></div><div class="fulfillment-mobile-meta"><span>Borrowed {{ formatDateTime(record.borrowedAt) }}</span></div><div class="return-actions"><a-button class="action-button bigin-touch-target" type="primary" :loading="busy === busyKey('return', record.id)" :disabled="busy !== null" :icon="h(CheckCircleOutlined)" @click="confirmNormalReturn(record)">Confirm Normal Return</a-button><a-button class="action-button bigin-touch-target" danger :disabled="busy !== null" :icon="h(WarningOutlined)" @click="openDamagedReturn(record)">Confirm Damaged Return</a-button></div></div>
          </template>
        </AppTable>
      </section>

      <a-empty v-else description="You do not have access to a fulfillment queue." />

      <a-modal
        :open="handoverOpen"
        title="Confirm handover"
        ok-text="Confirm handover"
        cancel-text="Cancel"
        :confirm-loading="busy === busyKey('handover', handoverItem?.detailId)"
        :ok-button-props="{ disabled: evidenceProcessing || retryBlocked }"
        :closable="!busy && !evidenceProcessing"
        :keyboard="!busy && !evidenceProcessing"
        :mask-closable="!busy && !evidenceProcessing"
        @cancel="closeHandover"
        @ok="submitHandover"
      >
        <p>{{ displayAssetValue(normalizeAssetIdentity(handoverItem?.asset).modelName) }} will move from RESERVED to BORROWED and a borrow history will be created.</p>
        <EvidenceMediaPicker
          ref="handoverPicker"
          v-model="handoverEvidence"
          label="Optional handover evidence"
          :disabled="busy !== null"
          @processing-change="evidenceProcessing = $event"
        />
      </a-modal>

      <a-modal
        :open="normalReturnOpen"
        title="Confirm asset return"
        ok-text="Confirm normal return"
        cancel-text="Cancel"
        :confirm-loading="busy === busyKey('return', normalReturnHistory?.id)"
        :ok-button-props="{ disabled: evidenceProcessing || retryBlocked }"
        :closable="!busy && !evidenceProcessing"
        :keyboard="!busy && !evidenceProcessing"
        :mask-closable="!busy && !evidenceProcessing"
        @cancel="closeNormalReturn"
        @ok="submitNormalReturn"
      >
        <p>{{ displayAssetValue(normalizeAssetIdentity(normalReturnHistory?.asset).modelName) }} will become AVAILABLE.</p>
        <EvidenceMediaPicker
          ref="normalReturnPicker"
          v-model="normalReturnEvidence"
          label="Optional return evidence"
          :disabled="busy !== null"
          @processing-change="evidenceProcessing = $event"
        />
      </a-modal>

      <a-modal
        :open="damagedOpen"
        wrap-class-name="bigin-modal-content"
        title="Confirm damaged return"
        ok-text="Confirm Damaged Return"
        cancel-text="Cancel"
        :confirm-loading="busy === busyKey('return', damagedHistory?.id)"
        :ok-button-props="{ disabled: evidenceProcessing || retryBlocked }"
        :closable="!busy && !evidenceProcessing"
        :keyboard="!busy && !evidenceProcessing"
        :mask-closable="!busy && !evidenceProcessing"
        @cancel="closeDamagedReturn"
        @ok="confirmDamagedReturn"
      >
        <p>The asset will be marked DAMAGED and a confirmed issue will be created.</p>
        <a-form-item label="Damage description" required>
          <a-textarea
            v-model:value="damagedDescription"
            :maxlength="1000"
            :rows="4"
            show-count
            placeholder="Describe the damage found during return inspection."
          />
        </a-form-item>
        <EvidenceMediaPicker
          ref="damagedPicker"
          v-model="damagedEvidence"
          label="Optional return evidence"
          :disabled="busy !== null"
          @processing-change="evidenceProcessing = $event"
        />
      </a-modal>
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
.asset-cell, .person-cell, .asset-cell > div { display: grid; gap: 4px; min-width: 0; }
.asset-cell { align-items: center; display: flex; gap: 10px; }
.asset-cell strong, .person-cell strong { color: var(--bigin-text-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-cell span, .asset-cell small, .person-cell span { color: var(--bigin-text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-cell small, .person-cell span { color: var(--bigin-text-tertiary); font-size: 11px; }
.action-button { border-radius: 6px; font-size: 12px; }
.return-actions { display: grid; gap: 8px; min-width: 215px; }
.fulfillment-mobile-row { display: grid; gap: 12px; }.fulfillment-mobile-meta { align-items: center; color: var(--bigin-text-secondary); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 12px; }
@media (max-width: 780px) {
  .fulfillment-page { padding: 24px 16px 36px; }
  .fulfillment-header { align-items: flex-start; flex-direction: column; }
  .queue-count { min-width: 120px; }
  .fulfillment-tabs { padding-inline: 16px; }
}
@media (max-width: 575px) {
  .fulfillment-page { padding: 16px 12px 28px; }
  .fulfillment-header h1 { font-size: 25px; }
  .return-actions { min-width: 0; }
  .return-actions :deep(.ant-btn) { width: 100%; }
}
</style>
