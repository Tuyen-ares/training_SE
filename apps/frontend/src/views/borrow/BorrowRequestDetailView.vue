<script setup>
import { computed, h, onMounted, ref, watch } from "vue";
import { ArrowLeftOutlined, RollbackOutlined } from "@ant-design/icons-vue";
import { Modal, message } from "ant-design-vue";
import { useRoute, useRouter } from "vue-router";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout.vue";
import {
  getMyBorrowRequest,
  withdrawBorrowRequest,
} from "../../services/borrow.service";
import { useAuthStore } from "../../stores/auth";
const route = useRoute(),
  router = useRouter(),
  authStore = useAuthStore();
const request = ref(null),
  loading = ref(true),
  errorMessage = ref(""),
  withdrawing = ref(false);
const colors = {
  PENDING: "orange",
  PARTIALLY_APPROVED: "processing",
  APPROVED: "success",
  REJECTED: "error",
  COMPLETED: "blue",
  CANCELLED: "default",
};
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
    <main class="detail-page">
      <a-button
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
            <h1>
              Borrow Request REQ-{{ String(request.id).padStart(4, "0") }}
            </h1>
            <p>Asset borrowing request details</p>
          </div>
          <a-space
            ><a-tag :color="colors[request.status]">{{
              request.status.replaceAll("_", " ")
            }}</a-tag
            ><a-button
              v-if="canWithdraw"
              danger
              :loading="withdrawing"
              :icon="h(RollbackOutlined)"
              @click="withdraw"
              >Withdraw Request</a-button
            ></a-space
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
                <dd>{{ request.note || "No reason provided." }}</dd>
              </dl>
            </section>
            <section class="panel requester">
              <h2>Requester</h2>
              <a-avatar :size="50" :src="request.requester.avatarUrl">{{
                request.requester.name.slice(0, 1)
              }}</a-avatar
              ><strong>{{ request.requester.name }}</strong>
            </section>
          </aside>
          <section class="panel asset-list">
            <h2>Asset List ({{ request.details.length }})</h2>
            <a-table
              :data-source="request.details"
              row-key="id"
              :pagination="false"
              ><a-table-column title="Asset" key="asset"
                ><template #default="{ record }"
                  ><div class="asset-cell">
                    <a-avatar shape="square" :size="40" :src="record.asset.imageUrl">{{
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
              /><a-table-column title="Asset Status" key="assetStatus"
                ><template #default="{ record }"
                  ><a-tag>{{ record.asset.status }}</a-tag></template
                ></a-table-column
              ><a-table-column title="Approval Status" key="approval"
                ><template #default="{ record }"
                  ><a-tag :color="colors[record.approvalStatus]">{{
                    record.approvalStatus
                  }}</a-tag>
                  <p v-if="record.rejectionReason" class="reason">
                    {{ record.rejectionReason }}
                  </p></template
                ></a-table-column
              ></a-table
            >
          </section>
        </div></template
      >
    </main></WorkspaceLayout
  >
</template>
<style scoped>
.screen-code {
  color: #8c8c8c;
}
.detail-page {
  padding: 20px 24px;
  max-width: 1320px;
  margin: auto;
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
.detail-heading p {
  color: #8c8c8c;
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
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 18px;
}
.panel h2 {
  font-size: 17px;
  margin: 0 0 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.panel dl {
  display: grid;
  gap: 8px;
}
.panel dt {
  font-size: 11px;
  color: #8c8c8c;
  text-transform: uppercase;
}
.panel dd {
  margin: 0 0 8px;
}
.requester {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
}
.requester h2 {
  grid-column: 1/-1;
}
.asset-list {
  padding: 0;
}
.asset-list h2 {
  padding: 18px;
}
.reason {
  font-size: 12px;
  color: #cf1322;
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
