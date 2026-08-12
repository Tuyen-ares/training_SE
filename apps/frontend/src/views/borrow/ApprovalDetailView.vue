<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { AppstoreOutlined, ArrowLeftOutlined, CheckOutlined, CloseOutlined, SwapOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import {
  approveAllBorrowDetails,
  approveBorrowDetail,
  getReviewRequest,
  handoverBorrowDetail,
  rejectBorrowDetail,
} from '../../services/borrow.service'
import { useAuthStore } from '../../stores/auth'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const request = ref(window.history.state?.request || null)
const loading = ref(!request.value)
const errorMessage = ref('')
const busyDetail = ref(null)
const busyAll = ref(false)
const bulkResult = ref(null)
const rejectOpen = ref(false)
const rejectForm = reactive({ detailId: null, reason: '' })

const canApprove = computed(() => authStore.hasPermission('borrow_request.approve'))
const canReject = computed(() => authStore.hasPermission('borrow_request.reject'))
const canHandover = computed(() => authStore.hasPermission('asset.checkout'))
const requestDetails = computed(() => request.value?.details || [])
const pendingCount = computed(() => requestDetails.value.filter((detail) => detail.approvalStatus === 'PENDING').length)
const requestInitial = computed(() => request.value?.requester?.name?.slice(0, 1)?.toUpperCase() || 'U')
const formatDateTime = (value) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—'
const expectedBorrowPeriod = computed(() => {
  const dates = requestDetails.value.map((detail) => detail.expectedReturnDate).filter(Boolean).sort()
  if (!dates.length) return 'Not provided'
  const first = formatDate(dates[0])
  const last = formatDate(dates[dates.length - 1])
  return first === last ? first : `${first} – ${last}`
})

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    request.value = await getReviewRequest(authStore.api, route.params.id)
  } catch (error) {
    errorMessage.value = error.message || 'Request could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function approve(detail) {
  busyDetail.value = detail.id
  try {
    await approveBorrowDetail(authStore.api, detail.id)
    detail.approvalStatus = 'APPROVED'
    detail.asset.status = 'RESERVED'
    message.success('Asset approved and reserved.')
  } catch (error) {
    message.error(error.status === 409 ? 'This asset is no longer available.' : error.message)
  } finally {
    busyDetail.value = null
  }
}

function updateRequestStatus() {
  const statuses = requestDetails.value.map((detail) => detail.approvalStatus)
  request.value.status = statuses.every((status) => status === 'APPROVED')
    ? 'APPROVED'
    : statuses.some((status) => status === 'APPROVED')
      ? 'PARTIALLY_APPROVED'
      : statuses.every((status) => status === 'REJECTED') ? 'REJECTED' : 'PENDING'
}

async function approveAll() {
  busyAll.value = true
  bulkResult.value = null
  try {
    const result = await approveAllBorrowDetails(authStore.api, request.value.id)
    const approvedIds = new Set(result.approved.map((item) => item.detailId))
    requestDetails.value.forEach((detail) => {
      if (approvedIds.has(detail.id)) {
        detail.approvalStatus = 'APPROVED'
        detail.asset.status = 'RESERVED'
      }
    })
    updateRequestStatus()
    bulkResult.value = result
    if (result.skipped.length) message.warning(`${result.approved.length} approved; ${result.skipped.length} remained pending.`)
    else message.success(`${result.approved.length} asset request(s) approved.`)
  } catch (error) {
    message.error(error.message || 'Approve All could not be completed.')
  } finally {
    busyAll.value = false
  }
}

function confirmApproveAll() {
  Modal.confirm({
    title: 'Approve all eligible assets?',
    content: 'Each eligible pending asset will be reserved. Conflicting assets will remain pending.',
    okText: 'Approve All Eligible',
    onOk: approveAll,
  })
}

function openReject(detail) {
  rejectForm.detailId = detail.id
  rejectForm.reason = ''
  rejectOpen.value = true
}

async function reject() {
  if (!rejectForm.reason.trim()) return message.warning('Enter a rejection reason.')
  busyDetail.value = rejectForm.detailId
  try {
    await rejectBorrowDetail(authStore.api, rejectForm.detailId, rejectForm.reason.trim())
    const detail = requestDetails.value.find((item) => item.id === rejectForm.detailId)
    detail.approvalStatus = 'REJECTED'
    detail.rejectionReason = rejectForm.reason.trim()
    rejectOpen.value = false
    message.success('Asset request rejected.')
  } catch (error) {
    message.error(error.message || 'The detail could not be rejected.')
  } finally {
    busyDetail.value = null
  }
}

async function handover(detail) {
  busyDetail.value = detail.id
  try {
    await handoverBorrowDetail(authStore.api, detail.id)
    detail.asset.status = 'BORROWED'
    message.success('Handover confirmed.')
  } catch (error) {
    message.error(error.message || 'Handover could not be confirmed.')
  } finally {
    busyDetail.value = null
  }
}

onMounted(() => { if (!request.value) load() })
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Approval Details</strong></template>

    <main class="approval-page">
      <a-button class="back-link" type="link" @click="router.push({ name: 'approval-queue' })">
        <template #icon><ArrowLeftOutlined /></template>
        Back to Approval Queue
      </a-button>

      <a-skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
      <a-alert v-else-if="errorMessage" type="warning" show-icon :message="errorMessage">
        <template #action><a-button size="small" @click="load">Retry</a-button></template>
      </a-alert>

      <template v-else-if="request">
        <header class="approval-header">
          <div>
            <p class="eyebrow">REQUEST REVIEW</p>
            <div class="title-line">
              <h1>Borrow Request <span>#REQ-{{ String(request.id).padStart(4, '0') }}</span></h1>
              <StatusTag class="request-status" :status="request.status" />
            </div>
            <p class="created-meta">Created {{ formatDateTime(request.createdAt) }}</p>
          </div>
          <div class="header-count">
            <span>REQUESTED ASSETS</span>
            <strong>{{ requestDetails.length }}</strong>
          </div>
        </header>

        <div class="approval-layout">
          <div class="approval-main">
            <section class="summary-card requester-card">
              <div class="section-heading"><span class="section-kicker">REQUESTER</span><span class="muted-label">EMPLOYEE</span></div>
              <div class="requester-content">
                <a-avatar :size="72" :src="request.requester?.avatarUrl" class="requester-avatar">{{ requestInitial }}</a-avatar>
                <div class="requester-fields">
                  <div class="requester-field"><span class="muted-label">FULL NAME</span><strong>{{ request.requester?.name || 'Unknown requester' }}</strong></div>
                  <div class="requester-field"><span class="muted-label">DEPARTMENT</span><strong>{{ request.requester?.department?.name || request.requester?.departmentName || 'Not provided' }}</strong></div>
                  <div class="requester-field"><span class="muted-label">EMPLOYEE ID</span><strong>{{ request.requester?.userCode || 'Not provided' }}</strong></div>
                  <div class="requester-field"><span class="muted-label">EXPECTED BORROW PERIOD</span><strong>{{ expectedBorrowPeriod }}</strong></div>
                </div>
              </div>
            </section>

            <section class="assets-card">
              <div class="assets-header">
                <div class="assets-title"><span class="asset-title-icon"><AppstoreOutlined /></span><div><div class="section-kicker">REQUESTED ASSETS</div><h2>Equipment included in this request</h2></div></div>
                <span class="asset-count">{{ requestDetails.length }} Assets</span>
              </div>
              <div class="asset-table-heading"><span>ASSET</span><span>CATEGORY</span><span>INVENTORY STATUS</span><span>APPROVAL STATUS</span><span>ACTION</span></div>
              <div v-if="!requestDetails.length" class="assets-empty"><a-empty description="No assets in this request" /></div>
              <div v-else class="asset-list">
                <article v-for="detail in requestDetails" :key="detail.id" class="asset-row">
              <div class="asset-identity">
                <a-avatar shape="square" :size="48" :src="detail.asset.imageUrl || DEFAULT_ASSET_IMAGE" class="asset-avatar">{{ detail.asset.model?.name?.slice(0, 1) || 'A' }}</a-avatar>
                <div>
                  <strong>{{ detail.asset.model?.name || 'Asset' }}</strong>
                  <span>{{ detail.asset.serialNumber || 'No serial number' }}</span>
                  <small>QR {{ detail.asset.qrCode }}</small>
                </div>
              </div>
              <div class="asset-field category-field"><span>{{ detail.asset.assetType?.name || detail.asset.model?.assetType?.name || 'Equipment' }}</span></div>
              <div class="asset-field">
                <span class="muted-label">STOCK STATUS</span>
                <StatusTag class="status-tag" :status="detail.asset.status" />
              </div>
              <div class="asset-field">
                <span class="muted-label">APPROVAL</span>
                <StatusTag class="status-tag" :status="detail.approvalStatus" />
                <small v-if="detail.rejectionReason" class="rejection-reason">{{ detail.rejectionReason }}</small>
              </div>
              <div class="asset-actions">
                <a-button
                  v-if="detail.approvalStatus === 'PENDING' && canApprove"
                  :loading="busyDetail === detail.id"
                  :disabled="detail.asset.status !== 'AVAILABLE' || busyAll"
                  type="primary"
                  size="small"
                  @click="approve(detail)"
                ><template #icon><CheckOutlined /></template>Approve</a-button>
                <a-button
                  v-if="detail.approvalStatus === 'PENDING' && canReject"
                  danger
                  size="small"
                  :disabled="busyAll"
                  @click="openReject(detail)"
                ><template #icon><CloseOutlined /></template>Reject</a-button>
                <a-button
                  v-if="detail.approvalStatus === 'APPROVED' && detail.asset.status === 'RESERVED' && canHandover"
                  type="primary"
                  size="small"
                  :loading="busyDetail === detail.id"
                  @click="handover(detail)"
                ><template #icon><SwapOutlined /></template>Confirm handover</a-button>
              </div>
                </article>
              </div>
            </section>
          </div>

          <aside class="approval-sidebar">
            <section class="summary-card notes-card">
              <div class="section-heading"><span class="section-kicker">NOTES FROM BORROWER</span><span class="notes-icon">▤</span></div>
              <blockquote>{{ request.note || 'No note provided for this request.' }}</blockquote>
            </section>
            <section class="summary-card decision-card">
              <div class="section-heading"><span class="section-kicker">APPROVAL DECISION</span></div>
              <a-button v-if="canApprove && pendingCount" class="approve-all-button" block type="primary" :loading="busyAll" @click="confirmApproveAll"><template #icon><CheckOutlined /></template>Approve All</a-button>
              <div class="decision-status">Status: <StatusTag :status="request.status" /></div>
              <a-alert v-if="bulkResult?.skipped.length" class="bulk-result" type="warning" show-icon :message="`${bulkResult.approved.length} approved; ${bulkResult.skipped.length} remained pending.`" />
            </section>
          </aside>
        </div>
      </template>

      <a-modal v-model:open="rejectOpen" title="Reject Asset Request" ok-text="Reject" ok-type="danger" :confirm-loading="busyDetail === rejectForm.detailId" @ok="reject">
        <p>Please enter the reason so the employee is informed.</p>
        <a-textarea v-model:value="rejectForm.reason" :rows="4" :maxlength="300" show-count placeholder="Enter rejection reason (max 300 characters)..." />
      </a-modal>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.approval-page { max-width: 1320px; margin: 0 auto; padding: 24px 36px 48px; }
.back-link { color: #667387; font-size: 13px; margin: 0 0 20px -8px; padding-inline: 8px; }
.approval-header { align-items: flex-end; display: flex; justify-content: space-between; gap: 24px; margin-bottom: 26px; }
.eyebrow, .section-kicker { color: #8a94a6; font-size: 11px; font-weight: 700; letter-spacing: .12em; }
.eyebrow { margin: 0 0 8px; }
.title-line { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; }
.approval-header h1 { color: #182230; font-size: 30px; letter-spacing: -.02em; line-height: 1.15; margin: 0; }
.approval-header h1 span { color: #8a94a6; font-weight: 500; }
.request-status { border-radius: 999px; font-size: 11px; margin: 0; padding-inline: 10px; text-transform: capitalize; }
.created-meta { color: #7a8698; font-size: 13px; margin: 9px 0 0; }
.header-count { background: #fff; border: 1px solid #e6eaf0; border-radius: 10px; display: grid; min-width: 142px; padding: 12px 16px; }
.header-count span, .muted-label { color: #8a94a6; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.header-count strong { color: #2f6b5c; font-size: 24px; line-height: 1.1; margin-top: 5px; }
.approval-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 18px; align-items: start; }
.approval-main, .approval-sidebar { display: grid; gap: 18px; min-width: 0; }
.summary-card, .assets-card { background: #fff; border: 1px solid #e3e8ef; border-radius: 12px; box-shadow: 0 8px 24px rgba(28, 41, 56, .04); }
.summary-card { padding: 22px 24px; }
.section-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 18px; }
.section-kicker { color: #546174; }
.requester-content { align-items: center; display: flex; gap: 28px; }
.requester-avatar { background: #dceee8; color: #2f6b5c; font-weight: 700; }
.requester-fields { display: grid; flex: 1; gap: 22px 36px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.requester-field { display: grid; gap: 7px; min-width: 0; }
.requester-field strong { color: #253142; font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notes-card blockquote { background: #fffaf7; border: 1px solid #f0ddd1; border-radius: 4px; color: #536174; font-size: 14px; font-style: italic; line-height: 1.65; margin: 0; min-height: 120px; padding: 16px 18px; position: relative; }
.notes-icon { color: #ed6c00; font-size: 18px; }
.decision-card { min-height: 160px; }
.decision-status { border-top: 1px solid #edf0f4; color: #7a8698; font-size: 13px; margin-top: 16px; padding-top: 16px; text-align: center; }
.decision-status strong { color: #e28a00; font-weight: 600; text-transform: capitalize; }
.approve-all-button { margin-top: 16px; }
.bulk-result { margin-top: 14px; }
.assets-card { overflow: hidden; }
.assets-header { align-items: center; border-bottom: 1px solid #edf0f4; display: flex; justify-content: space-between; padding: 20px 24px; }
.assets-title { align-items: center; display: flex; gap: 10px; }
.asset-title-icon { color: #ed6c00; display: inline-flex; font-size: 18px; }
.assets-header h2 { color: #253142; font-size: 17px; margin: 7px 0 0; }
.asset-count { background: #f1f5f4; border-radius: 999px; color: #2f6b5c; font-size: 12px; font-weight: 700; padding: 5px 10px; }
.asset-table-heading { background: #fbfcfd; border-bottom: 1px solid #edf0f4; color: #7b8797; display: grid; font-size: 10px; font-weight: 700; gap: 18px; grid-template-columns: minmax(260px, 1fr) 150px 125px 145px minmax(180px, auto); letter-spacing: .06em; min-width: 960px; padding: 13px 24px; }
.asset-list { overflow-x: auto; }
.asset-row { align-items: center; border-bottom: 1px solid #edf0f4; display: grid; gap: 18px; grid-template-columns: minmax(260px, 1fr) 150px 125px 145px minmax(180px, auto); min-width: 960px; padding: 18px 24px; }
.asset-row:last-child { border-bottom: 0; }
.asset-identity { align-items: center; display: flex; gap: 12px; min-width: 0; }
.asset-avatar { background: #f0f3f6; color: #657284; flex: 0 0 auto; font-weight: 700; }
.asset-identity > div { display: grid; gap: 4px; min-width: 0; }
.asset-identity strong { color: #253142; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-identity span, .asset-identity small { color: #7a8698; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-identity small { color: #a0a9b5; font-size: 10px; }
.asset-field { display: grid; gap: 6px; min-width: 0; }
.category-field { color: #637084; font-size: 13px; }
.asset-field > strong { color: #4e5b6c; font-size: 12px; font-weight: 500; }
.status-tag { align-self: start; font-size: 11px; margin: 0; width: fit-content; }
.rejection-reason { color: #b42318; font-size: 11px; line-height: 1.35; }
.asset-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
.asset-actions :deep(.ant-btn) { border-radius: 6px; font-size: 12px; }
.assets-empty { padding: 42px; }
@media (max-width: 980px) { .approval-layout { grid-template-columns: 1fr; } .approval-sidebar { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 780px) { .approval-page { padding: 20px 16px 36px; } .approval-header { align-items: flex-start; flex-direction: column; } .header-count { min-width: 120px; } .requester-content { align-items: flex-start; flex-direction: column; gap: 18px; } .requester-fields { width: 100%; } }
@media (max-width: 560px) { .approval-header h1 { font-size: 25px; } .summary-card { padding: 18px; } .requester-fields, .approval-sidebar { grid-template-columns: 1fr; } .assets-header { align-items: flex-start; gap: 12px; padding: 18px; } .asset-row, .asset-table-heading { padding-inline: 18px; } }
</style>
