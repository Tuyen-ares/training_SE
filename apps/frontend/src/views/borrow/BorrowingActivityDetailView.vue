<script setup>
import { computed, h, onMounted, ref } from "vue";
import { ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, MailOutlined, UserOutlined } from "@ant-design/icons-vue";
import { useRoute, useRouter } from "vue-router";
import StatusTag from "../../components/common/StatusTag.vue";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout.vue";
import { getBorrowHistoryDetail } from "../../services/borrow.service";
import { useAuthStore } from "../../stores/auth";
import { DEFAULT_ASSET_IMAGE } from "../../constants/media";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const history = ref(null);
const loading = ref(true);
const errorMessage = ref("");

const isReturned = computed(() => Boolean(history.value?.returnedAt));

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    history.value = await getBorrowHistoryDetail(authStore.api, route.params.id);
  } catch (error) {
    errorMessage.value = error.message || "Borrowing activity details could not be loaded.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Borrowing Activity</strong></template>
    <main class="history-detail-page">
      <a-button
        type="link"
        :icon="h(ArrowLeftOutlined)"
        @click="router.push({ name: 'borrowing-activity' })"
      >
        Back to Borrowing Activity
      </a-button>

      <a-skeleton v-if="loading" active :paragraph="{ rows: 12 }" />
      <a-result
        v-else-if="errorMessage"
        status="error"
        title="Unable to load borrowing activity"
        :sub-title="errorMessage"
      >
        <template #extra>
          <a-button type="primary" @click="load">Try Again</a-button>
          <a-button @click="router.push({ name: 'borrowing-activity' })">Back</a-button>
        </template>
      </a-result>

      <template v-else-if="history">
        <header class="page-heading">
          <div>
            <p class="eyebrow">Borrowing Activity Details</p>
            <h1>{{ history.asset.model.name }}</h1>
            <p class="subtitle">
              {{ history.asset.serialNumber || history.asset.qrCode }}
              <span aria-hidden="true"> · </span>
              Request REQ-{{ String(history.request.id).padStart(4, '0') }}
            </p>
          </div>
          <StatusTag :status="isReturned ? 'RETURNED' : history.asset.status" />
        </header>

        <div class="detail-grid">
          <div class="main-column">
            <section class="panel">
              <div class="panel-heading">
                <h2>Borrow Request</h2>
                <StatusTag :status="history.request.status" />
              </div>
              <div class="request-summary">
                <dl>
                  <dt>Request ID</dt>
                  <dd>REQ-{{ String(history.request.id).padStart(4, '0') }}</dd>
                </dl>
                <dl>
                  <dt>Created Date</dt>
                  <dd>{{ formatDate(history.request.createdAt) }}</dd>
                </dl>
              </div>
              <div class="reason-section">
                <span class="field-label">Borrowing Reason</span>
                <p class="reason-box">{{ history.request.note || 'No reason provided.' }}</p>
              </div>
            </section>

            <section class="panel requester-panel">
              <h2>Requester</h2>
              <div class="requester-profile">
                <a-avatar :size="52" :src="history.request.requester.avatarUrl">
                  {{ history.request.requester.name.slice(0, 1) }}
                </a-avatar>
                <div class="requester-copy">
                  <strong>{{ history.request.requester.name }}</strong>
                  <span><MailOutlined /> {{ history.request.requester.email }}</span>
                  <span v-if="history.request.requester.department">
                    <UserOutlined /> {{ history.request.requester.department.name }}
                  </span>
                </div>
              </div>
            </section>

            <section class="panel asset-panel">
              <h2>Borrowed Asset</h2>
              <div class="asset-summary">
                <a-avatar shape="square" :size="72" :src="history.asset.imageUrl || DEFAULT_ASSET_IMAGE">
                  {{ history.asset.model.name.slice(0, 1) }}
                </a-avatar>
                <div>
                  <h3>{{ history.asset.model.name }}</h3>
                  <p>Serial number: {{ history.asset.serialNumber || '—' }}</p>
                  <p>QR code: {{ history.asset.qrCode }}</p>
                </div>
              </div>
              <a-descriptions bordered :column="2" size="small">
                <a-descriptions-item label="Asset Status">
                  <StatusTag :status="history.asset.status" />
                </a-descriptions-item>
                <a-descriptions-item label="Expected Return">
                  {{ history.expectedReturnDate || '—' }}
                </a-descriptions-item>
              </a-descriptions>
            </section>
          </div>

          <aside class="side-column">
            <section class="panel">
              <h2>Approval Information</h2>
              <div class="timeline-row">
                <CheckCircleOutlined class="timeline-icon approved" />
                <div>
                  <span class="field-label">Approval Status</span>
                  <StatusTag :status="history.approvalStatus" />
                </div>
              </div>
              <dl class="meta-list">
                <dt>Reviewed By</dt>
                <dd>{{ history.approvedBy?.name || '—' }}</dd>
                <dt>Reviewed At</dt>
                <dd>{{ formatDate(history.approvedAt) }}</dd>
              </dl>
              <p v-if="history.rejectionReason" class="rejection-note">
                {{ history.rejectionReason }}
              </p>
            </section>

            <section class="panel">
              <h2>Handover &amp; Return</h2>
              <dl class="meta-list">
                <dt>Handed Over By</dt>
                <dd>{{ history.handedOverBy?.name || '—' }}</dd>
                <dt>Handover Date</dt>
                <dd>{{ formatDate(history.borrowedAt) }}</dd>
                <dt>Received By</dt>
                <dd>{{ history.receivedBy?.name || 'Not returned yet' }}</dd>
                <dt>Return Date</dt>
                <dd>{{ formatDate(history.returnedAt) }}</dd>
                <dt>Return Condition</dt>
                <dd>{{ history.returnCondition || 'Not returned yet' }}</dd>
              </dl>
              <div v-if="!isReturned" class="active-note">
                <ClockCircleOutlined /> This asset is currently borrowed.
              </div>
            </section>
          </aside>
        </div>
      </template>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.history-detail-page {
  max-width: 1320px;
  margin: 0 auto;
  padding: 20px 24px 40px;
}
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin: 8px 0 22px;
}
.eyebrow,
.field-label,
.panel dt {
  color: #8c8c8c;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.eyebrow { margin: 0 0 4px; }
.page-heading h1 { margin: 0; font-size: 28px; }
.subtitle { color: #595959; margin: 5px 0 0; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 18px; }
.main-column, .side-column { display: grid; align-content: start; gap: 18px; }
.panel { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 20px; }
.panel h2 { font-size: 18px; margin: 0 0 18px; }
.panel-heading { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 14px; margin-bottom: 16px; }
.panel-heading h2 { margin: 0; }
.request-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.panel dl { margin: 0; }
.panel dt { margin-bottom: 5px; }
.panel dd { margin: 0; color: #262626; }
.reason-section { margin-top: 18px; }
.reason-box { background: #f5f5f5; border: 1px solid #e6e6e6; border-radius: 4px; padding: 12px; line-height: 1.55; margin: 8px 0 0; white-space: pre-wrap; }
.requester-profile, .asset-summary { display: flex; align-items: center; gap: 14px; }
.requester-copy { display: grid; gap: 6px; }
.requester-copy span { color: #595959; font-size: 13px; }
.requester-copy :deep(svg) { color: #8c8c8c; margin-right: 5px; }
.asset-summary { margin-bottom: 18px; }
.asset-summary h3 { margin: 0 0 6px; font-size: 18px; }
.asset-summary p { margin: 3px 0; color: #595959; }
.timeline-row { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.timeline-row > div { display: grid; gap: 5px; }
.timeline-icon { font-size: 20px; }
.approved { color: #52c41a; }
.meta-list { display: grid; grid-template-columns: 1fr; gap: 5px 0; margin-top: 16px !important; }
.meta-list dt { margin-top: 7px; }
.rejection-note { color: #cf1322; background: #fff1f0; border: 1px solid #ffa39e; border-radius: 4px; padding: 10px; margin: 16px 0 0; }
.active-note { color: #595959; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 4px; padding: 10px; margin-top: 16px; }
.active-note :deep(svg) { color: #fa8c16; margin-right: 6px; }
@media (max-width: 900px) {
  .detail-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .history-detail-page { padding: 12px; }
  .page-heading { flex-direction: column; }
  .request-summary { grid-template-columns: 1fr; }
}
</style>
