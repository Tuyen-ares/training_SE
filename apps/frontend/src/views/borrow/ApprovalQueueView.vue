<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { listReviewQueue } from '../../services/borrow.service'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const errorMessage = ref('')
const result = ref({ items: [], page: 1, pageSize: 10, total: 0 })
const activeTab = ref('PENDING')
const query = reactive({ page: 1, pageSize: 10, approvalStatus: 'PENDING' })

const matchingDetails = (record) => record.details.filter((detail) => detail.approvalStatus === activeTab.value)
const tabLabel = computed(() => ({
  PENDING: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
})[activeTab.value])
const formatDate = (value) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value))

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    result.value = await listReviewQueue(authStore.api, query)
  } catch (error) {
    errorMessage.value = error.message || 'Approval queue could not be loaded.'
  } finally {
    loading.value = false
  }
}

function pageChange(page) {
  query.page = page
  void load()
}

function tabChange(status) {
  activeTab.value = status
  query.approvalStatus = status
  query.page = 1
  void load()
}

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Approval Queue</strong></template>

    <main class="queue-page">
      <header class="queue-header">
        <div>
          <p class="eyebrow">BORROW REQUESTS</p>
          <h1>Approval Queue</h1>
          <p class="queue-subtitle">Review and process equipment requests from your team.</p>
        </div>
        <div class="queue-header-meta">
          <span class="queue-header-label">TOTAL REQUESTS</span>
          <strong>{{ result.total }}</strong>
        </div>
      </header>

      <section class="queue-surface">
        <div class="queue-toolbar">
          <div>
            <h2>Requests to review</h2>
            <p>Open a request to approve, reject, or confirm handover for each asset.</p>
          </div>
          <a-tabs class="status-tabs" :active-key="activeTab" @change="tabChange">
            <a-tab-pane key="PENDING" tab="Pending approval" />
            <a-tab-pane key="APPROVED" tab="Approved" />
            <a-tab-pane key="REJECTED" tab="Rejected" />
          </a-tabs>
        </div>

        <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" />
        <a-table
          v-else
          class="queue-table"
          :loading="loading"
          :data-source="result.items"
          row-key="id"
          :pagination="false"
        >
          <a-table-column title="Request" key="id" :width="190">
            <template #default="{ record }">
              <div class="request-cell">
                <strong>REQ-{{ String(record.id).padStart(4, '0') }}</strong>
                <span>{{ formatDate(record.createdAt) }}</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="Requester" key="requester" :width="240">
            <template #default="{ record }">
              <div class="requester-cell">
                <a-avatar size="small" :src="record.requester?.avatarUrl">
                  {{ record.requester?.name?.slice(0, 1) || 'U' }}
                </a-avatar>
                <div>
                  <strong>{{ record.requester?.name || 'Unknown requester' }}</strong>
                  <span>Employee request</span>
                </div>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="Assets" key="qty" :width="110">
            <template #default="{ record }">
              <span class="quantity-pill">{{ matchingDetails(record).length }}</span>
            </template>
          </a-table-column>
          <a-table-column title="Expected return" key="return" :width="180">
            <template #default="{ record }">
              <span class="date-value">{{ matchingDetails(record)[0]?.expectedReturnDate || '—' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="Status" key="status" :width="170">
            <template #default>
              <StatusTag class="status-tag" :status="activeTab" :label="tabLabel" />
            </template>
          </a-table-column>
          <a-table-column title="" key="actions" :width="150" align="right">
            <template #default="{ record }">
              <a-button
                class="review-button"
                :type="activeTab === 'PENDING' ? 'primary' : 'default'"
                size="small"
                @click="router.push({ name: 'approval-detail', params: { id: record.id }, state: { request: record } })"
              >
                {{ activeTab === 'PENDING' ? 'Review request' : 'View details' }}
              </a-button>
            </template>
          </a-table-column>
          <template #emptyText><a-empty description="No requests in this view" /></template>
        </a-table>

        <footer class="queue-footer">
          <span>Showing {{ result.items.length }} of {{ result.total }} requests</span>
          <a-pagination
            :current="result.page"
            :page-size="result.pageSize"
            :total="result.total"
            :show-size-changer="false"
            @change="pageChange"
          />
        </footer>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.queue-page { max-width: 1320px; margin: 0 auto; padding: 32px 36px 48px; }
.queue-header { align-items: flex-end; display: flex; justify-content: space-between; margin-bottom: 28px; gap: 24px; }
.eyebrow { color: #8a94a6; font-size: 11px; font-weight: 700; letter-spacing: .12em; margin: 0 0 8px; }
.queue-header h1 { color: #182230; font-size: 30px; letter-spacing: -.02em; line-height: 1.15; margin: 0; }
.queue-subtitle { color: #718096; font-size: 14px; margin: 8px 0 0; }
.queue-header-meta { background: #fff; border: 1px solid #e6eaf0; border-radius: 10px; display: grid; min-width: 132px; padding: 12px 16px; }
.queue-header-label { color: #8a94a6; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.queue-header-meta strong { color: #2f6b5c; font-size: 24px; line-height: 1.1; margin-top: 5px; }
.queue-surface { background: #fff; border: 1px solid #e3e8ef; border-radius: 12px; box-shadow: 0 8px 24px rgba(28, 41, 56, .04); overflow: hidden; }
.queue-toolbar { align-items: flex-end; border-bottom: 1px solid #edf0f4; display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px 0; }
.queue-toolbar h2 { color: #253142; font-size: 16px; margin: 0; }
.queue-toolbar p { color: #7a8698; font-size: 13px; margin: 6px 0 20px; }
.status-tabs { margin-bottom: -1px; }
.status-tabs :deep(.ant-tabs-nav) { margin: 0; }
.queue-table :deep(.ant-table-thead > tr > th) { background: #fbfcfd; color: #7b8797; font-size: 11px; font-weight: 700; letter-spacing: .06em; padding: 14px 18px; text-transform: uppercase; }
.queue-table :deep(.ant-table-tbody > tr > td) { border-bottom: 1px solid #edf0f4; padding: 17px 18px; }
.request-cell, .requester-cell, .requester-cell > div { display: grid; gap: 4px; }
.request-cell strong, .requester-cell strong { color: #263343; font-size: 13px; }
.request-cell span, .requester-cell span { color: #8a94a6; font-size: 12px; }
.requester-cell { align-items: center; display: flex; gap: 10px; }
.quantity-pill { background: #f1f5f4; border-radius: 999px; color: #2f6b5c; display: inline-flex; font-size: 12px; font-weight: 700; min-width: 28px; justify-content: center; padding: 4px 9px; }
.date-value { color: #4e5b6c; font-size: 13px; }
.status-tag { font-size: 11px; font-weight: 600; margin: 0; text-transform: capitalize; }
.review-button { border-radius: 6px; font-size: 12px; }
.queue-footer { align-items: center; border-top: 1px solid #edf0f4; color: #8a94a6; display: flex; font-size: 12px; justify-content: space-between; padding: 16px 24px; }
@media (max-width: 780px) { .queue-page { padding: 24px 16px 36px; } .queue-header { align-items: flex-start; flex-direction: column; } .queue-header-meta { min-width: 110px; } .queue-toolbar { align-items: flex-start; flex-direction: column; padding-bottom: 0; } .status-tabs { width: 100%; } }
@media (max-width: 560px) { .queue-surface { overflow-x: auto; } .queue-toolbar, .queue-footer { min-width: 720px; } .queue-table { min-width: 720px; } .queue-footer { padding: 14px 16px; } }
</style>
