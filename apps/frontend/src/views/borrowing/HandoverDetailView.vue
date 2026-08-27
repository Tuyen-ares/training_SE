<script setup>
import { computed, h, onMounted, ref, watch } from 'vue'
import { ArrowLeftOutlined, SwapOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import AssetIdentity from '../../components/assets/AssetIdentity.vue'
import EvidenceMediaPicker from '../../components/common/EvidenceMediaPicker.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { getHandoverRequestDetail, handoverBorrowDetail } from '../../services/borrowing/borrowing.service'
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
const busyDetailId = ref(null)
const handoverOpen = ref(false)
const handoverItem = ref(null)
const handoverEvidence = ref([])
const handoverPicker = ref(null)
const evidenceProcessing = ref(false)
const retryBlocked = ref(false)

const requestItems = computed(() => Array.isArray(request.value?.items) ? request.value.items : [])
const progressLabel = computed(() => {
  if (!request.value) return '—'
  return request.value.handedOverCount + ' of ' + request.value.approvedCount + ' handed over'
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
    request.value = await getHandoverRequestDetail(authStore.api, requestId)
  } catch (error) {
    request.value = null
    errorMessage.value = error.message || 'Handover details could not be loaded.'
  } finally {
    loading.value = false
  }
}

function backToQueue() {
  void router.push({ name: 'handover-return', query: { tab: 'handover' } })
}

function openHandover(item) {
  handoverItem.value = item
  handoverEvidence.value = []
  retryBlocked.value = false
  handoverOpen.value = true
}

function closeHandover() {
  if (busyDetailId.value || evidenceProcessing.value) return
  handoverOpen.value = false
  handoverItem.value = null
  handoverPicker.value?.reset()
}

function handleEvidenceFailure(error) {
  if (!(error instanceof EvidenceBatchError)) return false
  retryBlocked.value = error.retryBlocked
  message.error(error.message)
  return true
}

async function submitHandover() {
  const item = handoverItem.value
  if (!item) return

  busyDetailId.value = item.detailId
  try {
    await submitEvidenceBatch({
      api: authStore.api,
      items: handoverEvidence.value,
      purpose: 'HANDOVER',
      submitBusiness: (mediaIds) => handoverBorrowDetail(authStore.api, item.detailId, mediaIds),
    })
    handoverOpen.value = false
    handoverItem.value = null
    handoverPicker.value?.reset()
    message.success('Handover confirmed.')
    await load()
  } catch (error) {
    if (handleEvidenceFailure(error)) {
      if (error.reconcileRequired) await load()
    } else {
      message.error(error.status === 409
        ? 'This asset has already been processed or is no longer reserved.'
        : error.message || 'Handover could not be confirmed.')
    }
  } finally {
    busyDetailId.value = null
  }
}

onMounted(load)
watch(() => route.params.requestId, load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Handover Detail</strong></template>

    <main class="fulfillment-detail-page handover-detail-page bigin-page-container">
      <a-button class="back-link bigin-touch-target" type="link" @click="backToQueue">
        <template #icon><ArrowLeftOutlined /></template>
        Back to Handover &amp; Return
      </a-button>

      <a-skeleton v-if="loading" active :paragraph="{ rows: 12 }" />
      <a-result
        v-else-if="errorMessage"
        status="error"
        title="Unable to load handover details"
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
            <p class="eyebrow">HANDOVER DETAIL</p>
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
            <span>HANDOVER PROGRESS</span>
            <strong>{{ progressLabel }}</strong>
            <small>{{ request.pendingCount }} asset(s) ready to process</small>
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
                  <h2>Assets ready for handover</h2>
                  <p class="panel-subtitle">Inspect each asset, capture evidence when required, then confirm the physical handover.</p>
                </div>
                <span class="asset-count">{{ request.pendingCount }} ready</span>
              </div>

              <a-empty v-if="!requestItems.length" description="No assets are currently awaiting handover." />
              <div v-else class="asset-list">
                <article v-for="item in requestItems" :key="item.detailId" class="asset-row">
                  <AssetIdentity :identity="normalizeAssetIdentity(item.asset)" variant="detail" show-image />
                  <dl class="asset-meta">
                    <div>
                      <dt>EXPECTED RETURN</dt>
                      <dd>{{ formatDate(item.expectedReturnDate) }}</dd>
                    </div>
                    <div>
                      <dt>APPROVAL</dt>
                      <dd><StatusTag status="APPROVED" /></dd>
                    </div>
                    <div>
                      <dt>ASSET STATUS</dt>
                      <dd><StatusTag :status="item.asset.status" /></dd>
                    </div>
                  </dl>
                  <div class="asset-action">
                    <a-button
                      class="bigin-touch-target"
                      type="primary"
                      :loading="busyDetailId === item.detailId"
                      :disabled="busyDetailId !== null"
                      :icon="h(SwapOutlined)"
                      @click="openHandover(item)"
                    >Confirm handover</a-button>
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
                <dt>Approved assets</dt>
                <dd>{{ request.approvedCount }}</dd>
                <dt>Already handed over</dt>
                <dd>{{ request.handedOverCount }}</dd>
                <dt>Awaiting handover</dt>
                <dd>{{ request.pendingCount }}</dd>
              </dl>
            </section>
            <section class="panel instruction-panel">
              <h2>Handover checklist</h2>
              <ol>
                <li>Match the asset code and serial number with the physical device.</li>
                <li>Capture evidence when required by the handover policy.</li>
                <li>Confirm only after the device is handed to the requester.</li>
              </ol>
            </section>
          </aside>
        </div>
      </template>
    </main>

    <a-modal
      :open="handoverOpen"
      title="Confirm handover"
      ok-text="Confirm handover"
      cancel-text="Cancel"
      :confirm-loading="busyDetailId === handoverItem?.detailId"
      :ok-button-props="{ disabled: evidenceProcessing || retryBlocked }"
      :closable="!busyDetailId && !evidenceProcessing"
      :keyboard="!busyDetailId && !evidenceProcessing"
      :mask-closable="!busyDetailId && !evidenceProcessing"
      @cancel="closeHandover"
      @ok="submitHandover"
    >
      <p>
        Confirm that
        <strong>{{ normalizeAssetIdentity(handoverItem?.asset).modelName || 'this asset' }}</strong>
        has been physically handed to {{ request?.requester?.name || 'the requester' }}.
      </p>
      <EvidenceMediaPicker
        ref="handoverPicker"
        v-model="handoverEvidence"
        label="Handover evidence"
        :disabled="busyDetailId !== null"
        @processing-change="evidenceProcessing = $event"
      />
    </a-modal>
  </WorkspaceLayout>
</template>

