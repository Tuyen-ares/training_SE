<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { CheckCircleOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import MediaUploader from '../../components/common/MediaUploader.vue'
import {
  handoverBorrowDetail,
  listHandoverQueue,
  listReturnQueue,
  receiveDamagedReturn,
  receiveNormalReturn,
} from '../../services/borrowing/borrowing.service'
import { useAuthStore } from '../../stores/auth'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'

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
const damagedMediaId = ref(null)
const handoverOpen = ref(false)
const handoverItem = ref(null)
const handoverMediaId = ref(null)
const normalReturnOpen = ref(false)
const normalReturnHistory = ref(null)
const normalReturnMediaId = ref(null)

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
  : '—'
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'
const busyKey = (type, id) => `${type}-${id}`

async function load(tab = activeTab.value) {
  if ((tab === 'handover' && !canHandover.value) || (tab === 'return' && !canReturn.value)) return

  loading.value = true
  errorMessage.value = ''
  try {
    const result = tab === 'handover'
      ? await listHandoverQueue(authStore.api, { page: page.value, pageSize: pageSize.value })
      : await listReturnQueue(authStore.api, { page: page.value, pageSize: pageSize.value })
    items.value = result?.items || []
    page.value = result?.page || page.value
    pageSize.value = result?.pageSize || pageSize.value
    total.value = result?.total || 0
  } catch (error) {
    errorMessage.value = error.message || `${tab === 'handover' ? 'Handover' : 'Return'} queue could not be loaded.`
  } finally {
    loading.value = false
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
  handoverMediaId.value = null
  handoverOpen.value = true
}

function confirmNormalReturn(history) {
  normalReturnHistory.value = history
  normalReturnMediaId.value = null
  normalReturnOpen.value = true
}

async function submitHandover() {
  const item = handoverItem.value
  if (!item) return
  busy.value = busyKey('handover', item.detailId)
  try {
    await handoverBorrowDetail(authStore.api, item.detailId, handoverMediaId.value ? [handoverMediaId.value] : [])
    handoverOpen.value = false
    message.success('Handover confirmed.')
    await load('handover')
  } catch (error) {
    message.error(error.status === 409
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
    await receiveNormalReturn(authStore.api, history.id, normalReturnMediaId.value ? [normalReturnMediaId.value] : [])
    normalReturnOpen.value = false
    message.success('Return recorded.')
    await load('return')
  } catch (error) {
    message.error(error.status === 409
      ? 'This return has already been processed or the asset is no longer borrowed.'
      : error.message || 'Return could not be recorded.')
  } finally {
    busy.value = null
  }
}

function openDamagedReturn(history) {
  damagedHistory.value = history
  damagedDescription.value = ''
  damagedMediaId.value = null
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
    const result = await receiveDamagedReturn(authStore.api, history.id, description, damagedMediaId.value ? [damagedMediaId.value] : [])
    damagedOpen.value = false
    message.success(`Damaged return recorded. Issue #${result.issueId} created.`)
    await load('return')
  } catch (error) {
    message.error(error.status === 409
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
          <template #action><a-button size="small" @click="load">Retry</a-button></template>
        </a-alert>
        <a-skeleton v-else-if="loading" class="queue-loading" active :paragraph="{ rows: 6 }" />

        <div v-else class="bigin-table-scroll-wrapper">
          <a-table
            v-if="activeTab === 'handover'"
            class="queue-table"
            :data-source="items"
            row-key="detailId"
            :pagination="false"
            :scroll="{ x: 'max-content' }"
          >
            <a-table-column title="Asset" key="asset" :width="270">
              <template #default="{ record }">
                <div class="asset-cell">
                  <a-avatar shape="square" size="small" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">
                    {{ record.asset.model.name.slice(0, 1) }}
                  </a-avatar>
                  <div>
                    <strong>{{ record.asset.model.name }}</strong>
                    <span>{{ record.asset.serialNumber || record.asset.qrCode }}</span>
                    <small>QR {{ record.asset.qrCode }}</small>
                  </div>
                </div>
              </template>
            </a-table-column>
            <a-table-column title="Request" key="request" :width="150">
              <template #default="{ record }">REQ-{{ String(record.requestId).padStart(4, '0') }}</template>
            </a-table-column>
            <a-table-column title="Requester" key="requester" :width="210">
              <template #default="{ record }">
                <div class="person-cell">
                  <strong>{{ record.requester.name }}</strong>
                  <span>{{ record.requester.department?.name || 'No department' }}</span>
                </div>
              </template>
            </a-table-column>
            <a-table-column title="Expected return" key="expected-return" :width="170">
              <template #default="{ record }">{{ formatDate(record.expectedReturnDate) }}</template>
            </a-table-column>
            <a-table-column title="Approved by" key="approved-by" :width="210">
              <template #default="{ record }">
                <div class="person-cell">
                  <strong>{{ record.approvedBy?.name || '—' }}</strong>
                  <span>{{ formatDateTime(record.approvedAt) }}</span>
                </div>
              </template>
            </a-table-column>
            <a-table-column title="" key="action" :width="180" align="right">
              <template #default="{ record }">
                <a-button
                  class="action-button bigin-touch-target"
                  type="primary"
                  :loading="busy === busyKey('handover', record.detailId)"
                  :disabled="busy !== null"
                  :icon="h(SwapOutlined)"
                  @click="confirmHandover(record)"
                >Confirm handover</a-button>
              </template>
            </a-table-column>
            <template #emptyText><a-empty description="No assets are pending handover." /></template>
          </a-table>

          <a-table
            v-else
            class="queue-table"
            :data-source="items"
            row-key="id"
            :pagination="false"
            :scroll="{ x: 'max-content' }"
          >
            <a-table-column title="Asset" key="asset" :width="270">
              <template #default="{ record }">
                <div class="asset-cell">
                  <a-avatar shape="square" size="small" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">
                    {{ record.asset.model.name.slice(0, 1) }}
                  </a-avatar>
                  <div>
                    <strong>{{ record.asset.model.name }}</strong>
                    <span>{{ record.asset.serialNumber || record.asset.qrCode }}</span>
                    <small>QR {{ record.asset.qrCode }}</small>
                  </div>
                </div>
              </template>
            </a-table-column>
            <a-table-column title="Borrower" key="borrower" :width="210">
              <template #default="{ record }">
                <div class="person-cell">
                  <strong>{{ record.borrower.name }}</strong>
                  <span>{{ record.borrower.userCode }}</span>
                </div>
              </template>
            </a-table-column>
            <a-table-column title="Borrowed at" key="borrowed-at" :width="180">
              <template #default="{ record }">{{ formatDateTime(record.borrowedAt) }}</template>
            </a-table-column>
            <a-table-column title="Expected return" key="expected-return" :width="170">
              <template #default="{ record }">{{ formatDate(record.expectedReturnDate) }}</template>
            </a-table-column>
            <a-table-column title="" key="action" :width="240" align="right">
              <template #default="{ record }">
                <div class="return-actions">
                  <a-button
                    class="action-button bigin-touch-target"
                    type="primary"
                    :loading="busy === busyKey('return', record.id)"
                    :disabled="busy !== null"
                    :icon="h(CheckCircleOutlined)"
                    @click="confirmNormalReturn(record)"
                  >Confirm Normal Return</a-button>
                  <a-button
                    class="action-button bigin-touch-target"
                    danger
                    :disabled="busy !== null"
                    :icon="h(WarningOutlined)"
                    @click="openDamagedReturn(record)"
                  >Confirm Damaged Return</a-button>
                </div>
              </template>
            </a-table-column>
            <template #emptyText><a-empty description="No assets are awaiting return." /></template>
          </a-table>
        </div>

        <footer v-if="!loading && !errorMessage" class="queue-footer bigin-responsive-footer">
          <span>Showing {{ items.length }} of {{ total }} records</span>
          <a-pagination
            class="bigin-touch-target"
            :current="page"
            :page-size="pageSize"
            :total="total"
            :show-size-changer="false"
            @change="pageChange"
          />
        </footer>
      </section>

      <a-empty v-else description="You do not have access to a fulfillment queue." />

      <a-modal
        v-model:open="handoverOpen"
        title="Confirm handover"
        ok-text="Confirm handover"
        cancel-text="Cancel"
        :confirm-loading="busy === busyKey('handover', handoverItem?.detailId)"
        @ok="submitHandover"
      >
        <p>{{ handoverItem?.asset.model.name }} will move from RESERVED to BORROWED and a borrow history will be created.</p>
        <MediaUploader
          purpose="HANDOVER"
          label="Optional handover evidence"
          :model-value="handoverMediaId"
          @update:model-value="handoverMediaId = $event"
        />
      </a-modal>

      <a-modal
        v-model:open="normalReturnOpen"
        title="Confirm asset return"
        ok-text="Confirm normal return"
        cancel-text="Cancel"
        :confirm-loading="busy === busyKey('return', normalReturnHistory?.id)"
        @ok="submitNormalReturn"
      >
        <p>{{ normalReturnHistory?.asset.model.name }} will become AVAILABLE.</p>
        <MediaUploader
          purpose="RETURN"
          label="Optional return evidence"
          :model-value="normalReturnMediaId"
          @update:model-value="normalReturnMediaId = $event"
        />
      </a-modal>

      <a-modal
        v-model:open="damagedOpen"
        wrap-class-name="bigin-modal-content"
        title="Confirm damaged return"
        ok-text="Confirm Damaged Return"
        cancel-text="Cancel"
        :confirm-loading="busy === busyKey('return', damagedHistory?.id)"
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
        <MediaUploader
          purpose="RETURN"
          label="Optional return evidence"
          :model-value="damagedMediaId"
          @update:model-value="damagedMediaId = $event"
        />
      </a-modal>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.fulfillment-page { max-width: 1320px; min-width: 0; margin: 0 auto; padding: 32px 36px 48px; }
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
.queue-loading { margin: 24px; }
.queue-table :deep(.ant-table-thead > tr > th) { background: var(--bigin-surface-subtle); color: var(--bigin-text-tertiary); font-size: 11px; font-weight: 700; letter-spacing: .06em; padding: 14px 18px; text-transform: uppercase; }
.queue-table :deep(.ant-table-tbody > tr > td) { border-bottom: 1px solid var(--bigin-border-secondary); padding: 17px 18px; }
.asset-cell, .person-cell, .asset-cell > div { display: grid; gap: 4px; min-width: 0; }
.asset-cell { align-items: center; display: flex; gap: 10px; }
.asset-cell strong, .person-cell strong { color: var(--bigin-text-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-cell span, .asset-cell small, .person-cell span { color: var(--bigin-text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-cell small, .person-cell span { color: var(--bigin-text-tertiary); font-size: 11px; }
.action-button { border-radius: 6px; font-size: 12px; }
.return-actions { display: grid; gap: 8px; min-width: 215px; }
.queue-footer { align-items: center; border-top: 1px solid var(--bigin-border-secondary); color: var(--bigin-text-tertiary); display: flex; font-size: 12px; justify-content: space-between; padding: 16px 24px; }
@media (max-width: 780px) {
  .fulfillment-page { padding: 24px 16px 36px; }
  .fulfillment-header { align-items: flex-start; flex-direction: column; }
  .queue-count { min-width: 120px; }
  .fulfillment-tabs { padding-inline: 16px; }
}
@media (max-width: 575px) {
  .fulfillment-page { padding: 16px 12px 28px; }
  .fulfillment-header h1 { font-size: 25px; }
  .queue-footer { padding: 14px 16px; }
  .return-actions { min-width: 0; }
  .return-actions :deep(.ant-btn) { width: 100%; }
}
</style>
