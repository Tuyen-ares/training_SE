<script setup>
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  EditOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons-vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'

import StatusTag from '../../components/common/StatusTag.vue'
import EvidenceMediaPicker from '../../components/common/EvidenceMediaPicker.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { statusTimelineColor } from '../../constants/status-meta'
import {
  completeAssetRepair,
  confirmAssetIssue,
  failAssetRepair,
  getAssetIssue,
  rejectAssetIssue,
  startAssetRepair,
  updateAssetRepair,
} from '../../services/asset-issues/asset-issue.service'
import { listVendors } from '../../services/vendors/vendor.service'
import { EvidenceBatchError, submitEvidenceBatch } from '../../services/evidence-batch.service'
import { useAuthStore } from '../../stores/auth'
import { displayAssetValue, normalizeAssetIdentity } from '../../utils/asset-identity'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const issue = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const conflictMessage = ref('')
const busy = ref(false)
const modalOpen = ref(false)
const workflow = ref('start')
const form = reactive({ vendorId: undefined, startDate: '', endDate: '', cost: null, result: '', note: '' })
const vendors = ref([])
const vendorLoading = ref(false)
const vendorSearch = ref('')
const vendorTouched = ref(false)
const repairEvidence = ref([])
const repairPicker = ref(null)
const evidenceProcessing = ref(false)
const retryBlocked = ref(false)
const assetIdentity = computed(() => normalizeAssetIdentity(issue.value?.asset))
let vendorSearchRequestId = 0

const canReview = computed(() => authStore.hasPermission('asset_issue.update'))
const canStart = computed(() => authStore.hasPermission('asset_issue.create'))
const canUpdate = computed(() => authStore.hasPermission('asset_issue.update'))
const canClose = computed(() => authStore.hasPermission('asset_issue.close'))
const modalTitle = computed(() => ({ start: 'Start Repair', update: 'Update Repair', complete: 'Complete Repair', fail: 'Mark Repair as Failed' })[workflow.value])
const requiresResult = computed(() => ['update', 'complete', 'fail'].includes(workflow.value))
const timeline = computed(() => {
  if (!issue.value) return []
  const timelineItem = (status, item) => ({ ...item, color: statusTimelineColor(status) })
  const items = [timelineItem('REPORTED', { title: 'Issue reported', date: issue.value.createdAt, description: issue.value.description })]
  if (['CONFIRMED', 'IN_REPAIR', 'COMPLETED', 'FAILED'].includes(issue.value.status)) items.push(timelineItem('CONFIRMED', { title: 'Issue confirmed', date: issue.value.updatedAt, description: 'The asset issue was verified.' }))
  if (issue.value.startDate && ['IN_REPAIR', 'COMPLETED', 'FAILED'].includes(issue.value.status)) items.push(timelineItem('IN_REPAIR', { title: 'Repair started', date: issue.value.startDate, description: issue.value.vendor?.name || 'Repair is in progress.' }))
  if (['COMPLETED', 'FAILED'].includes(issue.value.status)) items.push(timelineItem(issue.value.status, { title: issue.value.status === 'COMPLETED' ? 'Repair completed' : 'Repair failed', date: issue.value.endDate || issue.value.updatedAt, description: issue.value.result || 'Repair lifecycle closed.' }))
  if (['REJECTED', 'CANCELLED'].includes(issue.value.status)) items.push(timelineItem(issue.value.status, { title: issue.value.status === 'REJECTED' ? 'Issue rejected' : 'Issue cancelled', date: issue.value.updatedAt, description: issue.value.note || 'No further action is required.' }))
  return items
})

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}
function formatCost(value) {
  return value == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value))
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    issue.value = await getAssetIssue(authStore.api, route.params.id)
    if (authStore.hasPermission('vendor.view')) await searchVendors()
  }
  catch (error) {
    if (error.status === 404) {
      message.warning('This asset issue is no longer available.')
      await router.replace({ name: 'asset-issues' })
      return
    }
    errorMessage.value = error.message || 'The asset issue could not be loaded.'
  }
  finally { loading.value = false }
}

async function searchVendors(search = '') {
  if (!authStore.hasPermission('vendor.view')) return
  const requestId = ++vendorSearchRequestId
  vendorLoading.value = true
  try {
    const query = typeof search === 'string' ? search.trim() : ''
    const result = await listVendors(authStore.api, { q: query, page: 1, pageSize: 20, isActive: true })
    if (requestId !== vendorSearchRequestId) return
    const nextVendors = result.items || []
    const currentVendor = issue.value?.vendor
    const currentVendorMatches = !query || currentVendor?.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    if (currentVendor && currentVendorMatches && !nextVendors.some((item) => item.id === currentVendor.id)) {
      nextVendors.unshift({ ...currentVendor, isActive: false })
    }
    vendors.value = nextVendors
  } catch (error) {
    if (requestId === vendorSearchRequestId && error.status !== 403) {
      message.error(error.message || 'Vendors could not be loaded.')
    }
  } finally {
    if (requestId === vendorSearchRequestId) vendorLoading.value = false
  }
}

function handleVendorDropdownVisible(open) {
  if (!open) return
  vendorSearch.value = ''
  void searchVendors()
}

function handleVendorSearch(search) {
  vendorSearch.value = search
  void searchVendors(search)
}

function handleVendorChange() {
  vendorSearch.value = ''
  vendorTouched.value = true
}

async function runTransition(action, successMessage) {
  busy.value = true
  conflictMessage.value = ''
  try {
    issue.value = await action()
    message.success(successMessage)
    return true
  } catch (error) {
    if (error.status === 409) {
      conflictMessage.value = 'This issue changed or is no longer in a valid state for that action. The latest data has been reloaded.'
      await load()
    } else message.error(error.message || 'The action could not be completed.')
    return false
  } finally { busy.value = false }
}

function confirmIssue() {
  Modal.confirm({ title: 'Confirm this reported issue?', content: 'The issue will be confirmed and the asset will be marked as damaged.', okText: 'Confirm Issue', onOk: () => runTransition(() => confirmAssetIssue(authStore.api, issue.value.id), 'Issue confirmed.') })
}
function rejectIssue() {
  let note = ''
  Modal.confirm({
    title: 'Reject this reported issue?',
    content: () => h('textarea', { id: 'issue-rejection-note', name: 'issueRejectionNote', class: 'ant-input', rows: 4, maxlength: 300, placeholder: 'Optional review note (max 300 characters)', onInput: (event) => { note = event.target.value } }),
    okText: 'Reject Issue', okType: 'danger',
    onOk: () => runTransition(() => rejectAssetIssue(authStore.api, issue.value.id, note.trim()), 'Issue rejected.'),
  })
}

function resetForm() {
  Object.assign(form, {
    vendorId: issue.value?.vendor?.id,
    startDate: issue.value?.startDate ? new Date(issue.value.startDate).toISOString().slice(0, 16) : '',
    endDate: issue.value?.endDate ? new Date(issue.value.endDate).toISOString().slice(0, 16) : '',
    cost: issue.value?.cost == null ? null : Number(issue.value.cost),
    result: issue.value?.result || '',
    note: issue.value?.note || '',
  })
  repairPicker.value?.reset()
  retryBlocked.value = false
  vendorTouched.value = false
}
function openWorkflow(type) {
  workflow.value = type
  resetForm()
  vendorSearch.value = ''
  modalOpen.value = true
}

function payload() {
  const body = {}
  if (authStore.hasPermission('vendor.view') && vendorTouched.value) body.vendorId = form.vendorId ?? null
  if (form.startDate) body.startDate = new Date(form.startDate).toISOString()
  if (form.endDate) body.endDate = new Date(form.endDate).toISOString()
  if (form.cost !== null && form.cost !== '') body.cost = Number(form.cost)
  if (workflow.value !== 'start' && form.result.trim()) body.result = form.result.trim()
  if (form.note.trim()) body.note = form.note.trim()
  return body
}

function closeWorkflow() {
  if (busy.value || evidenceProcessing.value) return
  modalOpen.value = false
  repairPicker.value?.reset()
}

async function submitWorkflow() {
  if (requiresResult.value && !form.result.trim()) return message.warning('Enter a repair result.')
  if (workflow.value === 'complete') {
    busy.value = true
    conflictMessage.value = ''
    try {
      issue.value = await submitEvidenceBatch({
        api: authStore.api,
        items: repairEvidence.value,
        purpose: 'AFTER_REPAIR',
        submitBusiness: (mediaIds) => completeAssetRepair(authStore.api, issue.value.id, {
          ...payload(),
          ...(mediaIds.length ? { mediaIds } : {}),
        }),
      })
      repairPicker.value?.reset()
      modalOpen.value = false
      message.success('Complete Repair saved.')
    } catch (error) {
      if (error instanceof EvidenceBatchError) {
        retryBlocked.value = error.retryBlocked
        message.error(error.message)
        if (error.reconcileRequired) {
          await load()
          if (issue.value?.status === 'COMPLETED') {
            repairPicker.value?.reset()
            modalOpen.value = false
            message.success('Repair completion was already recorded.')
          } else retryBlocked.value = true
        }
      } else if (error.status === 409) {
        conflictMessage.value = 'This issue changed or is no longer in a valid state for that action. The latest data has been reloaded.'
        await load()
      } else message.error(error.message || 'The action could not be completed.')
    } finally {
      busy.value = false
    }
    return
  }
  const actions = {
    start: () => startAssetRepair(authStore.api, issue.value.id, payload()),
    update: () => updateAssetRepair(authStore.api, issue.value.id, payload()),
    fail: () => failAssetRepair(authStore.api, issue.value.id, payload()),
  }
  const succeeded = await runTransition(actions[workflow.value], `${modalTitle.value} saved.`)
  if (succeeded) modalOpen.value = false
}

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Asset Issue Details</strong></template>
    <main class="issue-detail-page">
      <a-button type="link" :icon="h(ArrowLeftOutlined)" @click="router.push({ name: 'asset-issues' })">Back to Asset Issues</a-button>
      <a-skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
      <a-result v-else-if="errorMessage" status="warning" title="Asset issue unavailable" :sub-title="errorMessage">
        <template #extra><a-button type="primary" @click="load">Try again</a-button></template>
      </a-result>
      <template v-else-if="issue">
        <header class="detail-header">
          <div><div class="detail-header__title"><h1>Issue #ISS-{{ String(issue.id).padStart(4, '0') }}</h1><StatusTag :status="issue.status" /></div><p>{{ displayAssetValue(assetIdentity.modelName) }} · Code: {{ displayAssetValue(assetIdentity.assetCode) }} · Seri: {{ displayAssetValue(assetIdentity.serialNumber) }}</p></div>
          <a-space class="bigin-mobile-action-stack" wrap>
            <a-button class="bigin-touch-target" v-if="issue.status === 'REPORTED' && canReview" danger :disabled="busy" :icon="h(CloseCircleOutlined)" @click="rejectIssue">Reject</a-button>
            <a-button class="bigin-touch-target" v-if="issue.status === 'REPORTED' && canReview" type="primary" :loading="busy" :icon="h(CheckCircleOutlined)" @click="confirmIssue">Confirm Issue</a-button>
            <a-button class="bigin-touch-target" v-if="issue.status === 'CONFIRMED' && canStart" type="primary" :icon="h(PlayCircleOutlined)" @click="openWorkflow('start')">Start Repair</a-button>
            <a-button class="bigin-touch-target" v-if="issue.status === 'IN_REPAIR' && canUpdate" :icon="h(EditOutlined)" @click="openWorkflow('update')">Update Repair</a-button>
            <a-button class="bigin-touch-target" v-if="issue.status === 'IN_REPAIR' && canClose" danger @click="openWorkflow('fail')">Mark Failed</a-button>
            <a-button class="bigin-touch-target" v-if="issue.status === 'IN_REPAIR' && canClose" type="primary" :icon="h(CheckCircleOutlined)" @click="openWorkflow('complete')">Complete Repair</a-button>
          </a-space>
        </header>
        <a-alert v-if="conflictMessage" class="conflict-alert" type="error" show-icon :message="conflictMessage" closable @close="conflictMessage = ''" />

        <div class="detail-grid">
          <section class="panel overview-panel">
            <h2>Issue Information</h2>
            <a-descriptions bordered :column="{ xs: 1, sm: 2 }" size="small">
              <a-descriptions-item label="Asset"><RouterLink :to="{ name: 'asset-detail', params: { id: issue.assetId } }">{{ displayAssetValue(assetIdentity.modelName) }}</RouterLink></a-descriptions-item>
              <a-descriptions-item label="Asset status"><StatusTag :status="issue.asset?.status" /></a-descriptions-item>
              <a-descriptions-item label="Reported by">{{ issue.reporter?.name || 'Unknown user' }}</a-descriptions-item>
              <a-descriptions-item label="Reported at">{{ formatDate(issue.createdAt) }}</a-descriptions-item>
              <a-descriptions-item label="Description" :span="2">{{ issue.description }}</a-descriptions-item>
              <a-descriptions-item label="Handler">{{ issue.handledBy?.name || 'Unassigned' }}</a-descriptions-item>
              <a-descriptions-item label="Last updated">{{ formatDate(issue.updatedAt) }}</a-descriptions-item>
            </a-descriptions>
          </section>
          <aside class="panel timeline-panel">
            <h2>Issue Timeline</h2>
            <a-timeline>
              <a-timeline-item v-for="item in timeline" :key="`${item.title}-${item.date}`" :color="item.color">
                <strong>{{ item.title }}</strong><time>{{ formatDate(item.date) }}</time><p>{{ item.description }}</p>
              </a-timeline-item>
            </a-timeline>
          </aside>
          <section class="panel repair-panel">
            <h2>Repair Information</h2>
            <a-descriptions :column="{ xs: 1, sm: 3 }" size="small">
              <a-descriptions-item label="Repair provider">{{ issue.vendor?.name || '—' }}</a-descriptions-item>
              <a-descriptions-item label="Start date">{{ formatDate(issue.startDate) }}</a-descriptions-item>
              <a-descriptions-item label="End date">{{ formatDate(issue.endDate) }}</a-descriptions-item>
              <a-descriptions-item label="Cost">{{ formatCost(issue.cost) }}</a-descriptions-item>
              <a-descriptions-item label="Result" :span="2">{{ issue.result || '—' }}</a-descriptions-item>
              <a-descriptions-item label="Notes" :span="3">{{ issue.note || '—' }}</a-descriptions-item>
            </a-descriptions>
            <div v-if="issue.repairEvidence?.length" class="evidence-list">
              <h3>After-repair evidence</h3>
              <a-space wrap>
                <a
                  v-for="evidence in issue.repairEvidence"
                  :key="evidence.mediaId"
                  :href="evidence.publicUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  View image {{ evidence.mediaId }}
                </a>
              </a-space>
            </div>
          </section>
        </div>
      </template>

      <a-modal :open="modalOpen" wrap-class-name="bigin-modal-content" :title="modalTitle" :confirm-loading="busy" :ok-text="modalTitle" :ok-type="workflow === 'fail' ? 'danger' : 'primary'" :ok-button-props="{ disabled: evidenceProcessing || retryBlocked }" :closable="!busy && !evidenceProcessing" :keyboard="!busy && !evidenceProcessing" :mask-closable="!busy && !evidenceProcessing" width="620px" @cancel="closeWorkflow" @ok="submitWorkflow">
        <a-form layout="vertical">
          <div class="form-grid">
            <a-form-item label="Repair provider" :required="authStore.hasPermission('vendor.view')">
              <a-select
                v-if="authStore.hasPermission('vendor.view')"
                v-model:value="form.vendorId"
                show-search
                allow-clear
                :filter-option="false"
                :loading="vendorLoading"
                :search-value="vendorSearch"
                :suffix-icon="h(DownOutlined)"
                placeholder="Search vendor..."
                :options="vendors.map(item => ({ value: item.id, label: item.isActive === false ? `${item.name} (Inactive)` : item.name }))"
                @dropdown-visible-change="handleVendorDropdownVisible"
                @search="handleVendorSearch"
                @change="handleVendorChange"
              >
                <template #notFoundContent>
                  <span>{{ vendorLoading ? 'Loading vendors...' : 'No matching active vendors' }}</span>
                </template>
              </a-select>
              <a-input v-else :value="issue.vendor?.name || '—'" disabled />
            </a-form-item>
            <a-form-item label="Cost (VND)"><a-input-number v-model:value="form.cost" :min="0" :max="9999999999.99" style="width: 100%" /></a-form-item>
            <a-form-item label="Start date"><a-input v-model:value="form.startDate" type="datetime-local" /></a-form-item>
            <a-form-item v-if="workflow !== 'start'" label="End date"><a-input v-model:value="form.endDate" type="datetime-local" /></a-form-item>
          </div>
          <a-form-item v-if="workflow !== 'start'" :label="requiresResult ? 'Repair result *' : 'Repair result'"><a-textarea v-model:value="form.result" :rows="3" :maxlength="300" show-count placeholder="Describe the repair result (max 300 characters)" /></a-form-item>
          <a-form-item :label="workflow === 'start' ? 'Diagnosis / Initial notes' : 'Notes'"><a-textarea v-model:value="form.note" :rows="3" :maxlength="300" show-count :placeholder="workflow === 'start' ? 'Describe the initial diagnosis or planned repair (max 300 characters).' : 'Add operational notes (max 300 characters)'" /></a-form-item>
          <EvidenceMediaPicker
            v-if="workflow === 'complete'"
            ref="repairPicker"
            v-model="repairEvidence"
            label="Optional after-repair evidence"
            :disabled="busy"
            @processing-change="evidenceProcessing = $event"
          />
        </a-form>
      </a-modal>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.issue-detail-page { margin: 0 auto; max-width: 1320px; padding: 20px 32px 48px; }
.detail-header { align-items: flex-start; display: flex; gap: 24px; justify-content: space-between; margin: 12px 0 18px; }
.detail-header__title { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; }
.detail-header h1 { font-size: 28px; margin: 0; }
.detail-header p { color: var(--bigin-text-secondary); margin: 6px 0 0; }
.conflict-alert { margin-bottom: 16px; }
.detail-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); }
.panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; padding: 20px; }
.panel h2 { font-size: 17px; margin: 0 0 18px; }
.timeline-panel { grid-column: 2; grid-row: 1 / span 2; }
.timeline-panel time { color: var(--bigin-text-tertiary); display: block; font-size: 12px; margin: 3px 0; }
.timeline-panel p { color: var(--bigin-text-secondary); margin: 0; }
.repair-panel { grid-column: 1; }
.form-grid { display: grid; gap: 0 16px; grid-template-columns: 1fr 1fr; }
@media (max-width: 900px) { .detail-header { flex-direction: column; }.detail-grid { grid-template-columns: 1fr; }.timeline-panel, .repair-panel { grid-column: auto; grid-row: auto; } }
@media (max-width: 767px) { .issue-detail-page { padding: 16px 14px 32px; }.form-grid { grid-template-columns: 1fr; }.panel { padding: 16px; } }
@media (max-width: 575px) { .issue-detail-page { padding-inline: 12px; }.detail-header .bigin-mobile-action-stack { width: 100%; }.detail-header .bigin-mobile-action-stack :deep(.ant-btn) { flex: 1 1 auto; } }
</style>
