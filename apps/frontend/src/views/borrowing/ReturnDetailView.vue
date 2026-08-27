<script setup>
import { computed, h, onMounted, ref, watch } from 'vue'
import { ArrowLeftOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import AssetIdentity from '../../components/assets/AssetIdentity.vue'
import EvidenceMediaPicker from '../../components/common/EvidenceMediaPicker.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import {
  getReturnRequestDetail,
  receiveDamagedReturn,
  receiveNormalReturn,
} from '../../services/borrowing/borrowing.service'
import { EvidenceBatchError, submitEvidenceBatch } from '../../services/evidence-batch.service'
import { useAuthStore } from '../../stores/auth'
import { normalizeAssetIdentity } from '../../utils/asset-identity'
import '../../styles/fulfillment-detail.css'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const request = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const busyHistoryId = ref(null)
const normalReturnOpen = ref(false)
const normalReturnHistory = ref(null)
const normalReturnEvidence = ref([])
const normalReturnPicker = ref(null)
const damagedOpen = ref(false)
const damagedHistory = ref(null)
const damagedDescription = ref('')
const damagedEvidence = ref([])
const damagedPicker = ref(null)
const evidenceProcessing = ref(false)
const retryBlocked = ref(false)

const requestItems = computed(() => Array.isArray(request.value?.items) ? request.value.items : [])
const progressLabel = computed(() => {
  if (!request.value) return '—'
  return request.value.pendingCount + ' awaiting · ' + request.value.returnedCount + ' returned'
})

const formatRequestId = (requestId) => 'REQ-' + String(requestId).padStart(4, '0')
const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value + 'T00:00:00'))
  : '—'
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'

async function load() {
  const requestId = Number(route.params.requestId)
  if (!Number.isInteger(requestId) || requestId <= 0) {
    errorMessage.value = 'A valid borrow request is required.'
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    request.value = await getReturnRequestDetail(authStore.api, requestId)
  } catch (error) {
    request.value = null
    errorMessage.value = error.message || 'Return details could not be loaded.'
  } finally {
    loading.value = false
  }
}

function backToQueue() {
  void router.push({ name: 'handover-return', query: { tab: 'return' } })
}

function openNormalReturn(history) {
  normalReturnHistory.value = history
  normalReturnEvidence.value = []
  retryBlocked.value = false
  normalReturnOpen.value = true
}

function closeNormalReturn() {
  if (busyHistoryId.value || evidenceProcessing.value) return
  normalReturnOpen.value = false
  normalReturnHistory.value = null
  normalReturnPicker.value?.reset()
}

function openDamagedReturn(history) {
  damagedHistory.value = history
  damagedDescription.value = ''
  damagedEvidence.value = []
  retryBlocked.value = false
  damagedOpen.value = true
}

function closeDamagedReturn() {
  if (busyHistoryId.value || evidenceProcessing.value) return
  damagedOpen.value = false
  damagedHistory.value = null
  damagedPicker.value?.reset()
}

function handleEvidenceFailure(error) {
  if (!(error instanceof EvidenceBatchError)) return false
  retryBlocked.value = error.retryBlocked
  message.error(error.message)
  return true
}

async function reconcileLinkedAttempt(historyId, type) {
  await load()
  if (!request.value) return

  const stillPending = requestItems.value.some((item) => item.id === historyId)
  if (stillPending) {
    retryBlocked.value = true
    return
  }

  if (type === 'normal-return') {
    normalReturnOpen.value = false
    normalReturnHistory.value = null
    normalReturnPicker.value?.reset()
  } else {
    damagedOpen.value = false
    damagedHistory.value = null
    damagedPicker.value?.reset()
  }
  message.success('The previous return was already recorded.')
}

async function submitNormalReturn() {
  const history = normalReturnHistory.value
  if (!history) return

  busyHistoryId.value = history.id
  try {
    await submitEvidenceBatch({
      api: authStore.api,
      items: normalReturnEvidence.value,
      purpose: 'RETURN',
      submitBusiness: (mediaIds) => receiveNormalReturn(authStore.api, history.id, mediaIds),
    })
    normalReturnOpen.value = false
    normalReturnHistory.value = null
    normalReturnPicker.value?.reset()
    message.success('Return recorded.')
    await load()
  } catch (error) {
    if (handleEvidenceFailure(error)) {
      if (error.reconcileRequired) await reconcileLinkedAttempt(history.id, 'normal-return')
    } else {
      message.error(error.status === 409
        ? 'This return has already been processed or the asset is no longer borrowed.'
        : error.message || 'Return could not be recorded.')
    }
  } finally {
    busyHistoryId.value = null
  }
}

async function submitDamagedReturn() {
  const description = damagedDescription.value.trim()
  if (!description) {
    message.warning('Describe the damage before confirming the return.')
    return
  }

  const history = damagedHistory.value
  if (!history) return

  busyHistoryId.value = history.id
  try {
    const result = await submitEvidenceBatch({
      api: authStore.api,
      items: damagedEvidence.value,
      purpose: 'RETURN',
      submitBusiness: (mediaIds) => receiveDamagedReturn(authStore.api, history.id, description, mediaIds),
    })
    damagedOpen.value = false
    damagedHistory.value = null
    damagedPicker.value?.reset()
    message.success('Damaged return recorded. Issue #' + result.issueId + ' created.')
    await load()
  } catch (error) {
    if (handleEvidenceFailure(error)) {
      if (error.reconcileRequired) await reconcileLinkedAttempt(history.id, 'damaged-return')
    } else {
      message.error(error.status === 409
        ? 'This return has already been processed or the asset is no longer borrowed.'
        : error.message || 'Damaged return could not be recorded.')
    }
  } finally {
    busyHistoryId.value = null
  }
}

onMounted(load)
watch(() => route.params.requestId, load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Return Detail</strong></template>

    <main class="fulfillment-detail-page return-detail-page bigin-page-container">
      <a-button class="back-link bigin-touch-target" type="link" @click="backToQueue">
        <template #icon><ArrowLeftOutlined /></template>
        Back to Handover &amp; Return
      </a-button>

      <a-skeleton v-if="loading" active :paragraph="{ rows: 12 }" />
      <a-result
        v-else-if="errorMessage"
        status="error"
        title="Unable to load return details"
        :sub-title="errorMessage"
      >
        <template #extra>
          <a-button type="primary" @click="load">Try Again</a-button>
          <a-button @click="backToQueue">Back to Queue</a-button>
        </template>
      </a-result>

      <template v-else-if="request">
        <header class="page-heading">
          <div>
            <p class="eyebrow">RETURN DETAIL</p>
            <h1>{{ formatRequestId(request.requestId) }}</h1>
            <p class="subtitle">
              {{ request.requester.name }}
              <span aria-hidden="true"> · </span>
              {{ request.requester.department?.name || 'No department' }}
              <span aria-hidden="true"> · </span>
              Created {{ formatDateTime(request.requestCreatedAt) }}
            </p>
          </div>
          <div class="progress-summary">
            <span>RETURN PROGRESS</span>
            <strong>{{ progressLabel }}</strong>
            <small>{{ request.pendingCount }} asset(s) still require a return decision</small>
          </div>
        </header>

        <div class="detail-layout">
          <div class="main-column">
            <section class="panel requester-panel">
              <div class="panel-heading">
                <h2>Requester</h2>
                <span class="field-label">REQUEST CONTEXT</span>
              </div>
              <div class="requester-profile">
                <a-avatar :size="56" :src="request.requester.avatarUrl">
                  {{ request.requester.name.slice(0, 1) }}
                </a-avatar>
                <div class="requester-copy">
                  <strong>{{ request.requester.name }}</strong>
                  <span>{{ request.requester.userCode }}</span>
                  <span>{{ request.requester.email }}</span>
                  <span>{{ request.requester.department?.name || 'No department' }}</span>
                </div>
              </div>
            </section>

            <section class="panel asset-panel">
              <div class="panel-heading">
                <div>
                  <h2>Assets awaiting return</h2>
                  <p class="panel-subtitle">Inspect each history, choose the return condition, and capture evidence when required.</p>
                </div>
                <span class="asset-count">{{ request.pendingCount }} pending</span>
              </div>

              <a-empty v-if="!requestItems.length" description="No assets are currently awaiting return." />
              <div v-else class="asset-list">
                <article v-for="history in requestItems" :key="history.id" class="asset-row">
                  <AssetIdentity :identity="normalizeAssetIdentity(history.asset)" variant="detail" show-image />
                  <dl class="asset-meta">
                    <div>
                      <dt>BORROWER</dt>
                      <dd>{{ history.borrower.name }} · {{ history.borrower.userCode }}</dd>
                    </div>
                    <div>
                      <dt>EXPECTED RETURN</dt>
                      <dd>{{ formatDate(history.expectedReturnDate) }}</dd>
                    </div>
                    <div>
                      <dt>BORROWED</dt>
                      <dd>{{ formatDateTime(history.borrowedAt) }}</dd>
                    </div>
                    <div>
                      <dt>ASSET STATUS</dt>
                      <dd><StatusTag :status="history.asset.status" /></dd>
                    </div>
                  </dl>
                  <div class="asset-actions">
                    <a-button
                      class="bigin-touch-target"
                      type="primary"
                      :loading="busyHistoryId === history.id"
                      :disabled="busyHistoryId !== null"
                      :icon="h(CheckCircleOutlined)"
                      @click="openNormalReturn(history)"
                    >Normal return</a-button>
                    <a-button
                      class="bigin-touch-target"
                      danger
                      :disabled="busyHistoryId !== null"
                      :icon="h(WarningOutlined)"
                      @click="openDamagedReturn(history)"
                    >Damaged return</a-button>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <aside class="side-column">
            <section class="panel progress-panel">
              <h2>Request progress</h2>
              <dl class="meta-list">
                <dt>Request ID</dt>
                <dd>{{ formatRequestId(request.requestId) }}</dd>
                <dt>Assets awaiting return</dt>
                <dd>{{ request.pendingCount }}</dd>
                <dt>Already returned</dt>
                <dd>{{ request.returnedCount }}</dd>
                <dt>Total histories</dt>
                <dd>{{ request.pendingCount + request.returnedCount }}</dd>
              </dl>
            </section>
            <section class="panel instruction-panel">
              <h2>Return checklist</h2>
              <ol>
                <li>Match the asset code and serial number with the physical device.</li>
                <li>Inspect the asset and select normal or damaged return.</li>
                <li>Capture evidence when required by the return policy.</li>
              </ol>
            </section>
          </aside>
        </div>
      </template>
    </main>

    <a-modal
      :open="normalReturnOpen"
      title="Confirm asset return"
      ok-text="Confirm normal return"
      cancel-text="Cancel"
      :confirm-loading="busyHistoryId === normalReturnHistory?.id"
      :ok-button-props="{ disabled: evidenceProcessing || retryBlocked }"
      :closable="!busyHistoryId && !evidenceProcessing"
      :keyboard="!busyHistoryId && !evidenceProcessing"
      :mask-closable="!busyHistoryId && !evidenceProcessing"
      @cancel="closeNormalReturn"
      @ok="submitNormalReturn"
    >
      <p>
        Confirm that
        <strong>{{ normalizeAssetIdentity(normalReturnHistory?.asset).modelName || 'this asset' }}</strong>
        was returned by {{ normalReturnHistory?.borrower?.name || 'the borrower' }}.
        The asset will become AVAILABLE.
      </p>
      <EvidenceMediaPicker
        ref="normalReturnPicker"
        v-model="normalReturnEvidence"
        label="Return evidence"
        :disabled="busyHistoryId !== null"
        @processing-change="evidenceProcessing = $event"
      />
    </a-modal>

    <a-modal
      :open="damagedOpen"
      wrap-class-name="bigin-modal-content"
      title="Confirm damaged return"
      ok-text="Confirm damaged return"
      cancel-text="Cancel"
      :confirm-loading="busyHistoryId === damagedHistory?.id"
      :ok-button-props="{ disabled: evidenceProcessing || retryBlocked }"
      :closable="!busyHistoryId && !evidenceProcessing"
      :keyboard="!busyHistoryId && !evidenceProcessing"
      :mask-closable="!busyHistoryId && !evidenceProcessing"
      @cancel="closeDamagedReturn"
      @ok="submitDamagedReturn"
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
        label="Return evidence"
        :disabled="busyHistoryId !== null"
        @processing-change="evidenceProcessing = $event"
      />
    </a-modal>
  </WorkspaceLayout>
</template>

