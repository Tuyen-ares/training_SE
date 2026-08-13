<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { CheckCircleOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import {
  handoverBorrowDetail,
  listHandoverQueue,
  listReturnQueue,
  receiveDamagedReturn,
  receiveNormalReturn,
} from '../../services/borrow.service'
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
  Modal.confirm({
    title: 'Confirm handover?',
    content: `${item.asset.model.name} will move from RESERVED to BORROWED and a borrow history will be created for ${item.requester.name}.`,
    okText: 'Confirm handover',
    cancelText: 'Cancel',
    async onOk() {
      busy.value = busyKey('handover', item.detailId)
      try {
        await handoverBorrowDetail(authStore.api, item.detailId)
        message.success('Handover confirmed.')
        await load('handover')
      } catch (error) {
        message.error(error.status === 409
          ? 'This asset has already been processed or is no longer reserved.'
          : error.message || 'Handover could not be confirmed.')
      } finally {
        busy.value = null
      }
    },
  })
}

function confirmNormalReturn(history) {
  Modal.confirm({
    title: 'Confirm asset return?',
    content: `${history.asset.model.name} will become AVAILABLE.`,
    okText: 'Confirm Normal Return',
    cancelText: 'Cancel',
    async onOk() {
      busy.value = busyKey('return', history.id)
      try {
        await receiveNormalReturn(authStore.api, history.id)
        message.success('Return recorded.')
        await load('return')
      } catch (error) {
        message.error(error.status === 409
          ? 'This return has already been processed or the asset is no longer borrowed.'
          : error.message || 'Return could not be recorded.')
      } finally {
        busy.value = null
      }
    },
  })
}

function openDamagedReturn(history) {
  damagedHistory.value = history
  damagedDescription.value = ''
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
    const result = await receiveDamagedReturn(authStore.api, history.id, description)
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

        <div class="queue-body">
          <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage">
            <template #action><a-button size="small" @click="load">Retry</a-button></template>
          </a-alert>
          <a-skeleton v-else-if="loading" active :paragraph="{ rows: 6 }" />
          <a-empty
            v-else-if="!items.length"
            :description="activeTab === 'handover' ? 'No assets are pending handover.' : 'No assets are awaiting return.'"
          />

          <div v-else-if="activeTab === 'handover'" class="queue-list">
            <article v-for="item in items" :key="item.detailId" class="queue-row handover-row">
              <div class="asset-identity">
                <a-avatar shape="square" :size="52" :src="item.asset.imageUrl || DEFAULT_ASSET_IMAGE">
                  {{ item.asset.model.name.slice(0, 1) }}
                </a-avatar>
                <div>
                  <strong>{{ item.asset.model.name }}</strong>
                  <span>{{ item.asset.serialNumber || item.asset.qrCode }}</span>
                  <small>QR {{ item.asset.qrCode }}</small>
                </div>
              </div>
              <dl class="queue-fields">
                <div><dt>Request</dt><dd>REQ-{{ String(item.requestId).padStart(4, '0') }}</dd></div>
                <div><dt>Requester</dt><dd>{{ item.requester.name }}</dd><small>{{ item.requester.department?.name || 'No department' }}</small></div>
                <div><dt>Expected return</dt><dd>{{ formatDate(item.expectedReturnDate) }}</dd></div>
                <div><dt>Approved by</dt><dd>{{ item.approvedBy?.name || '—' }}</dd><small>{{ formatDateTime(item.approvedAt) }}</small></div>
              </dl>
              <div class="row-action">
                  <a-button
                    class="bigin-touch-target"
                  type="primary"
                  :loading="busy === busyKey('handover', item.detailId)"
                  :disabled="busy !== null"
                  :icon="h(SwapOutlined)"
                  @click="confirmHandover(item)"
                >Confirm handover</a-button>
              </div>
            </article>
          </div>

          <div v-else class="queue-list">
            <article v-for="history in items" :key="history.id" class="queue-row return-row">
              <div class="asset-identity">
                <a-avatar shape="square" :size="52" :src="history.asset.imageUrl || DEFAULT_ASSET_IMAGE">
                  {{ history.asset.model.name.slice(0, 1) }}
                </a-avatar>
                <div>
                  <strong>{{ history.asset.model.name }}</strong>
                  <span>{{ history.asset.serialNumber || history.asset.qrCode }}</span>
                  <small>QR {{ history.asset.qrCode }}</small>
                </div>
              </div>
              <dl class="queue-fields">
                <div><dt>Borrower</dt><dd>{{ history.borrower.name }}</dd><small>{{ history.borrower.userCode }}</small></div>
                <div><dt>Borrowed at</dt><dd>{{ formatDateTime(history.borrowedAt) }}</dd></div>
                <div><dt>Expected return</dt><dd>{{ formatDate(history.expectedReturnDate) }}</dd></div>
                <div><dt>History</dt><dd>#{{ history.id }}</dd></div>
              </dl>
              <div class="row-action return-actions">
                <a-button
                  class="bigin-touch-target"
                  type="primary"
                  :loading="busy === busyKey('return', history.id)"
                  :disabled="busy !== null"
                  :icon="h(CheckCircleOutlined)"
                  @click="confirmNormalReturn(history)"
                >Confirm Normal Return</a-button>
                <a-button
                  class="bigin-touch-target"
                  danger
                  :disabled="busy !== null"
                  :icon="h(WarningOutlined)"
                  @click="openDamagedReturn(history)"
                >Confirm Damaged Return</a-button>
              </div>
            </article>
          </div>

          <footer v-if="!loading && !errorMessage" class="queue-footer">
            <span>Showing {{ items.length }} of {{ total }} records</span>
            <a-pagination
              :current="page"
              :page-size="pageSize"
              :total="total"
              :show-size-changer="false"
              @change="pageChange"
            />
          </footer>
        </div>
      </section>

      <a-empty v-else description="You do not have access to a fulfillment queue." />

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
.fulfillment-tabs { padding: 0 24px; }
.fulfillment-tabs :deep(.ant-tabs-nav) { margin: 0; }
.queue-body { min-height: 380px; padding: 0 24px 20px; }
.queue-list { border-top: 1px solid var(--bigin-border-secondary); }
.queue-row { align-items: center; border-bottom: 1px solid var(--bigin-border-secondary); display: grid; gap: 22px; grid-template-columns: minmax(210px, 1.1fr) minmax(0, 2fr) auto; padding: 20px 0; }
.queue-row:last-child { border-bottom: 0; }
.asset-identity { align-items: center; display: flex; gap: 12px; min-width: 0; }
.asset-identity > div { display: grid; gap: 4px; min-width: 0; }
.asset-identity strong { color: var(--bigin-text-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-identity span, .asset-identity small { color: var(--bigin-text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-identity small { color: var(--bigin-text-tertiary); font-size: 10px; }
.queue-fields { display: grid; gap: 12px 20px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; }
.queue-fields > div { display: grid; gap: 4px; min-width: 0; }
.queue-fields dt { color: var(--bigin-text-tertiary); font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.queue-fields dd { color: var(--bigin-text-primary); font-size: 13px; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.queue-fields small { color: var(--bigin-text-tertiary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-action { display: flex; justify-content: flex-end; min-width: 170px; }
.return-actions { display: grid; gap: 8px; min-width: 215px; }
.row-action :deep(.ant-btn) { border-radius: 6px; font-size: 12px; }
.queue-footer { align-items: center; border-top: 1px solid var(--bigin-border-secondary); color: var(--bigin-text-tertiary); display: flex; font-size: 12px; justify-content: space-between; padding-top: 18px; }
@media (max-width: 1050px) {
  .queue-row { grid-template-columns: minmax(190px, 1fr) minmax(0, 1.5fr) auto; }
  .queue-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 780px) {
  .fulfillment-page { padding: 24px 16px 36px; }
  .fulfillment-header { align-items: flex-start; flex-direction: column; }
  .queue-count { min-width: 120px; }
  .queue-body { padding-inline: 16px; }
  .queue-row { align-items: start; grid-template-columns: minmax(0, 1fr) auto; }
  .queue-fields, .row-action { grid-column: 1 / -1; }
  .row-action { justify-content: flex-start; }
  .return-actions { display: flex; flex-wrap: wrap; }
}
@media (max-width: 767px) {
  .fulfillment-page { padding: 20px 16px 32px; }
  .queue-row { grid-template-columns: 1fr; }
  .queue-fields, .row-action { grid-column: auto; }
  .row-action { min-width: 0; }
  .return-actions { min-width: 0; }
}
@media (max-width: 575px) { .queue-fields { grid-template-columns: 1fr; } }
@media (max-width: 520px) {
  .fulfillment-header h1 { font-size: 25px; }
  .queue-fields { grid-template-columns: 1fr; }
  .queue-footer { align-items: flex-start; flex-direction: column; gap: 12px; }
  .return-actions :deep(.ant-btn) { width: 100%; }
}
</style>
