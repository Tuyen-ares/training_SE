<script setup>
import { computed, h, onMounted, ref, watch } from "vue";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  MailOutlined,
  RollbackOutlined,
} from "@ant-design/icons-vue";
import { Modal, message } from "ant-design-vue";
import { useRoute, useRouter } from "vue-router";
import StatusTag from "../../components/common/StatusTag.vue";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout.vue";
import {
  getMyBorrowRequest,
  withdrawBorrowRequest,
} from "../../services/borrow.service";
import { useAuthStore } from "../../stores/auth";
import { DEFAULT_ASSET_IMAGE } from "../../constants/media";
const route = useRoute(),
  router = useRouter(),
  authStore = useAuthStore();
const request = ref(null),
  loading = ref(true),
  errorMessage = ref(""),
  withdrawing = ref(false);
const canWithdraw = computed(
  () =>
    authStore.hasPermission("borrow_request.cancel_own") &&
    request.value &&
    !["CANCELLED", "COMPLETED"].includes(request.value.status),
);
const formatDate = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    request.value = await getMyBorrowRequest(authStore.api, route.params.id);
  } catch (e) {
    errorMessage.value = e.message || "Request details could not be loaded.";
  } finally {
    loading.value = false;
  }
}
function withdraw() {
  Modal.confirm({
    title: "Withdraw this request?",
    content:
      "Reserved assets will be released. A request with an actual handover cannot be withdrawn.",
    okText: "Withdraw Request",
    okType: "danger",
    async onOk() {
      withdrawing.value = true;
      try {
        await withdrawBorrowRequest(authStore.api, request.value.id);
        message.success("Request withdrawn.");
        await load();
      } catch (e) {
        message.error(e.message || "The request cannot be withdrawn.");
        throw e;
      } finally {
        withdrawing.value = false;
      }
    },
  });
}
watch(() => route.params.id, load);
onMounted(load);
</script>
<template>
  <WorkspaceLayout
    ><template #context
      ><strong>Request Details</strong></template
    >
    <main class="detail-page bigin-page-container">
      <a-button
        class="bigin-touch-target"
        type="link"
        :icon="h(ArrowLeftOutlined)"
        @click="router.push({ name: 'my-requests' })"
        >Back to My Requests</a-button
      ><a-skeleton v-if="loading" active :paragraph="{ rows: 8 }" /><a-alert
        v-else-if="errorMessage"
        type="error"
        show-icon
        :message="errorMessage"
      /><template v-else-if="request"
        ><header class="detail-heading">
          <div>
            <div class="title-row">
              <h1>
                Borrow Request REQ-{{ String(request.id).padStart(4, "0") }}
              </h1>
              <StatusTag :status="request.status" />
            </div>
            <p>Asset borrowing request details</p>
          </div>
          <a-button
            v-if="canWithdraw"
            danger
            :loading="withdrawing"
            :icon="h(RollbackOutlined)"
            @click="withdraw"
            >Withdraw Request</a-button
          >
        </header>
        <div class="detail-grid">
          <aside>
            <section class="panel">
              <h2>Request Information</h2>
              <dl>
                <dt>Request ID</dt>
                <dd>REQ-{{ String(request.id).padStart(4, "0") }}</dd>
                <dt>Creation Date</dt>
                <dd>{{ formatDate(request.createdAt) }}</dd>
                <dt>Borrowing Reason</dt>
                <dd class="reason-box">
                  {{ request.note || "No reason provided." }}
                </dd>
              </dl>
            </section>
            <section class="panel requester">
              <h2>Requester</h2>
              <div class="requester-profile">
                <a-avatar :size="50" :src="request.requester.avatarUrl">
                  {{ request.requester.name.slice(0, 1) }}
                </a-avatar>
                <div class="requester-copy">
                  <strong>{{ request.requester.name }}</strong>
                  <span v-if="request.requester.email" class="requester-meta">
                    <MailOutlined /> {{ request.requester.email }}
                  </span>
                  <span
                    v-if="request.requester.department?.name"
                    class="requester-meta"
                  >
                    <ApartmentOutlined />
                    {{ request.requester.department.name }}
                  </span>
                </div>
              </div>
            </section>
          </aside>
          <section class="panel asset-list">
            <h2>Asset List ({{ request.details.length }})</h2>
            <div class="bigin-table-scroll-wrapper"><a-table
              :data-source="request.details"
              row-key="id"
              :pagination="false"
              :scroll="{ x: 'max-content' }"
              ><a-table-column title="Asset" key="asset" :width="260"
                ><template #default="{ record }"
                  ><div class="asset-cell">
                    <a-avatar shape="square" :size="40" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{
                      record.asset.model.name.slice(0, 1)
                    }}</a-avatar>
                    <div>
                      <strong>{{ record.asset.model.name }}</strong
                      ><br /><small>{{
                        record.asset.serialNumber || record.asset.qrCode
                      }}</small>
                    </div>
                  </div></template
                ></a-table-column
              ><a-table-column
                title="Expected Return Date"
                data-index="expectedReturnDate"
                :width="190"
              /><a-table-column title="Asset Status" key="assetStatus"
                :width="150"
                ><template #default="{ record }"
                  ><StatusTag :status="record.asset.status" /></template
                ></a-table-column
              ><a-table-column title="Approval Status" key="approval" :width="180"
                ><template #default="{ record }"
                  ><StatusTag :status="record.approvalStatus" />
                  <p v-if="record.rejectionReason" class="reason">
                    {{ record.rejectionReason }}
                  </p></template
                ></a-table-column
              ></a-table></div>
          </section>
        </div></template
      >
    </main></WorkspaceLayout
  >
</template>
<style scoped>
.screen-code {
  color: var(--bigin-text-tertiary);
}
.detail-page {
  padding: 20px 24px;
  max-width: 1320px;
  margin: auto;
  min-width: 0;
}
.detail-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 18px;
}
.detail-heading h1 {
  font-size: 26px;
  margin: 0;
}
.title-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.detail-heading p {
  color: var(--bigin-text-tertiary);
  margin: 3px 0;
}
.detail-grid {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 18px;
}
.detail-grid aside {
  display: grid;
  align-content: start;
  gap: 18px;
}
.panel {
  background: var(--bigin-surface-panel);
  border: 1px solid var(--bigin-border-secondary);
  border-radius: 8px;
  padding: 18px;
}
.panel h2 {
  font-size: 17px;
  margin: 0 0 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bigin-border-secondary);
}
.panel dl {
  display: grid;
  gap: 8px;
}
.panel dt {
  font-size: 11px;
  color: var(--bigin-text-tertiary);
  text-transform: uppercase;
}
.panel dd {
  margin: 0 0 8px;
}
.detail-grid > * { min-width: 0; }
.reason-box {
  background: var(--bigin-surface-inset);
  border: 1px solid var(--bigin-border-subtle);
  border-radius: 4px;
  padding: 12px;
  color: var(--bigin-text-secondary);
  line-height: 1.55;
}
.requester {
  display: block;
}
.requester h2 {
  margin-bottom: 16px;
}
.requester-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}
.requester-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.requester-meta {
  color: var(--bigin-text-secondary);
  font-size: 13px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.requester-meta :deep(svg) {
  color: var(--bigin-icon-muted);
  margin-right: 4px;
}
.asset-list {
  padding: 0;
}
.asset-list h2 {
  padding: 18px;
}
.reason {
  font-size: 12px;
  color: var(--bigin-color-error-text);
  margin: 4px 0 0;
}
.asset-cell {
  align-items: center;
  display: flex;
  gap: 10px;
}
.asset-cell :deep(.ant-avatar) {
  flex: 0 0 auto;
}
.asset-list :deep(.ant-table-thead > tr > th),
.asset-list :deep(.ant-table-tbody > tr > td) {
  white-space: nowrap;
}
@media (max-width: 800px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .detail-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .detail-page {
    padding: 12px;
  }
}
</style>
