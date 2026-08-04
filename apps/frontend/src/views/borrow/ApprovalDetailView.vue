<script setup>
import { computed, h, onMounted, reactive, ref } from "vue";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  SwapOutlined,
} from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { useRoute, useRouter } from "vue-router";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout.vue";
import {
  approveAllBorrowDetails,
  approveBorrowDetail,
  getReviewRequest,
  handoverBorrowDetail,
  rejectBorrowDetail,
} from "../../services/borrow.service";
import { useAuthStore } from "../../stores/auth";
const route = useRoute(),
  router = useRouter(),
  authStore = useAuthStore();
const request = ref(window.history.state?.request || null),
  loading = ref(!request.value),
  errorMessage = ref(""),
  busyDetail = ref(null),
  busyAll = ref(false),
  bulkResult = ref(null),
  rejectOpen = ref(false),
  rejectForm = reactive({ detailId: null, reason: "" });
const canApprove = computed(() =>
  authStore.hasPermission("borrow_request.approve"),
);
const canReject = computed(() =>
  authStore.hasPermission("borrow_request.reject"),
);
const canHandover = computed(() => authStore.hasPermission("asset.checkout"));
const pendingCount = computed(
  () =>
    request.value?.details.filter(
      (detail) => detail.approvalStatus === "PENDING",
    ).length || 0,
);
const colors = { PENDING: "orange", APPROVED: "success", REJECTED: "error" };
async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    request.value = await getReviewRequest(authStore.api, route.params.id);
  } catch (e) {
    errorMessage.value = e.message || "Request could not be loaded.";
  } finally {
    loading.value = false;
  }
}
async function approve(detail) {
  busyDetail.value = detail.id;
  try {
    await approveBorrowDetail(authStore.api, detail.id);
    detail.approvalStatus = "APPROVED";
    detail.asset.status = "RESERVED";
    message.success("Asset approved and reserved.");
  } catch (e) {
    message.error(
      e.status === 409 ? "This asset is no longer available." : e.message,
    );
  } finally {
    busyDetail.value = null;
  }
}
function updateRequestStatus() {
  const statuses = request.value.details.map((detail) => detail.approvalStatus);
  request.value.status = statuses.every((status) => status === "APPROVED")
    ? "APPROVED"
    : statuses.some((status) => status === "APPROVED")
      ? "PARTIALLY_APPROVED"
      : statuses.every((status) => status === "REJECTED")
        ? "REJECTED"
        : "PENDING";
}
async function approveAll() {
  busyAll.value = true;
  bulkResult.value = null;
  try {
    const result = await approveAllBorrowDetails(
      authStore.api,
      request.value.id,
    );
    const approvedIds = new Set(result.approved.map((item) => item.detailId));
    request.value.details.forEach((detail) => {
      if (approvedIds.has(detail.id)) {
        detail.approvalStatus = "APPROVED";
        detail.asset.status = "RESERVED";
      }
    });
    updateRequestStatus();
    bulkResult.value = result;
    if (result.skipped.length) {
      message.warning(
        `${result.approved.length} approved; ${result.skipped.length} remained pending.`,
      );
    } else
      message.success(`${result.approved.length} asset request(s) approved.`);
  } catch (e) {
    message.error(e.message || "Approve All could not be completed.");
  } finally {
    busyAll.value = false;
  }
}
function confirmApproveAll() {
  Modal.confirm({
    title: "Approve all eligible assets?",
    content:
      "Each eligible pending asset will be reserved. Conflicting assets will remain pending.",
    okText: "Approve All Eligible",
    onOk: approveAll,
  });
}
function openReject(detail) {
  rejectForm.detailId = detail.id;
  rejectForm.reason = "";
  rejectOpen.value = true;
}
async function reject() {
  if (!rejectForm.reason.trim())
    return message.warning("Enter a rejection reason.");
  busyDetail.value = rejectForm.detailId;
  try {
    await rejectBorrowDetail(
      authStore.api,
      rejectForm.detailId,
      rejectForm.reason.trim(),
    );
    const detail = request.value.details.find(
      (item) => item.id === rejectForm.detailId,
    );
    detail.approvalStatus = "REJECTED";
    detail.rejectionReason = rejectForm.reason.trim();
    rejectOpen.value = false;
    message.success("Asset request rejected.");
  } catch (e) {
    message.error(e.message || "The detail could not be rejected.");
  } finally {
    busyDetail.value = null;
  }
}
async function handover(detail) {
  busyDetail.value = detail.id;
  try {
    await handoverBorrowDetail(authStore.api, detail.id);
    detail.asset.status = "BORROWED";
    message.success("Handover confirmed.");
  } catch (e) {
    message.error(e.message || "Handover could not be confirmed.");
  } finally {
    busyDetail.value = null;
  }
}
onMounted(() => {
  if (!request.value) load();
});
</script>
<template>
  <WorkspaceLayout
    ><template #context
      ><strong>Approval Details</strong></template
    >
    <main class="review-page">
      <a-button
        type="link"
        :icon="h(ArrowLeftOutlined)"
        @click="router.push({ name: 'approval-queue' })"
        >Back to Approval Queue</a-button
      ><a-skeleton v-if="loading" active :paragraph="{ rows: 8 }" /><a-alert
        v-else-if="errorMessage"
        type="warning"
        show-icon
        :message="errorMessage"
      /><template v-else-if="request"
        ><header>
          <div>
            <h1>
              Borrow Request #REQ-{{ String(request.id).padStart(4, "0") }}
            </h1>
            <a-tag color="orange">{{
              request.status.replaceAll("_", " ")
            }}</a-tag>
          </div>
          <span
            >Created
            {{ new Date(request.createdAt).toLocaleString("en-GB") }}</span
          >
        </header>
        <div class="review-grid">
          <section class="panel requester">
            <h2>Requester Information</h2>
            <a-avatar :size="54" :src="request.requester.avatarUrl">{{
              request.requester.name.slice(0, 1)
            }}</a-avatar>
            <div>
              <small>FULL NAME</small
              ><strong>{{ request.requester.name }}</strong
              ><small>REQUEST NOTE</small
              ><span>{{ request.note || "No note provided." }}</span>
            </div>
          </section>
          <aside class="panel note">
            <h2>Decision Guide</h2>
            <p>
              Approve only assets that are still available. Approval reserves
              the asset for this request.
            </p>
            <a-button
              v-if="canApprove && pendingCount"
              block
              type="primary"
              :loading="busyAll"
              :icon="h(CheckOutlined)"
              @click="confirmApproveAll"
              >Approve All Eligible ({{ pendingCount }})</a-button
            ><a-alert
              v-if="bulkResult?.skipped.length"
              class="bulk-result"
              type="warning"
              show-icon
              :message="`${bulkResult.approved.length} approved; ${bulkResult.skipped.length} remained pending.`"
            />
          </aside>
          <section class="panel details">
            <h2>
              Requested Assets
              <a-tag>{{ request.details.length }} assets</a-tag>
            </h2>
            <article
              v-for="detail in request.details"
              :key="detail.id"
              class="detail-row"
            >
              <div class="detail-asset">
                <a-avatar shape="square" :size="44" :src="detail.asset.imageUrl">{{
                  detail.asset.model.name.slice(0, 1)
                }}</a-avatar>
                <div>
                  <strong>{{ detail.asset.model.name }}</strong
                  ><span>{{
                    detail.asset.serialNumber || detail.asset.qrCode
                  }}</span>
                </div>
              </div>
              <div>
                <small>STOCK STATUS</small
                ><a-tag>{{ detail.asset.status }}</a-tag>
              </div>
              <div>
                <small>APPROVAL</small
                ><a-tag :color="colors[detail.approvalStatus]">{{
                  detail.approvalStatus
                }}</a-tag>
              </div>
              <div class="actions">
                <a-tooltip title="Approve"
                  ><a-button
                    v-if="detail.approvalStatus === 'PENDING' && canApprove"
                    :loading="busyDetail === detail.id"
                    :disabled="detail.asset.status !== 'AVAILABLE' || busyAll"
                    :icon="h(CheckOutlined)"
                    @click="approve(detail)" /></a-tooltip
                ><a-tooltip title="Reject"
                  ><a-button
                    v-if="detail.approvalStatus === 'PENDING' && canReject"
                    danger
                    :disabled="busyAll"
                    :icon="h(CloseOutlined)"
                    @click="openReject(detail)" /></a-tooltip
                ><a-button
                  v-if="
                    detail.approvalStatus === 'APPROVED' &&
                    detail.asset.status === 'RESERVED' &&
                    canHandover
                  "
                  type="primary"
                  :loading="busyDetail === detail.id"
                  :icon="h(SwapOutlined)"
                  @click="handover(detail)"
                  >Confirm Handover</a-button
                >
              </div>
            </article>
          </section>
        </div></template
      ><a-modal
        v-model:open="rejectOpen"
        title="Reject Asset Request"
        ok-text="Reject"
        ok-type="danger"
        :confirm-loading="busyDetail === rejectForm.detailId"
        @ok="reject"
        ><p>Please enter the reason so the employee is informed.</p>
        <a-textarea
          v-model:value="rejectForm.reason"
          :rows="4"
          :maxlength="2000"
          show-count
          placeholder="Enter rejection reason..."
      /></a-modal></main
  ></WorkspaceLayout>
</template>
<style scoped>
.screen-code {
  color: #8c8c8c;
}
.review-page {
  padding: 20px 24px;
  max-width: 1320px;
  margin: auto;
}
.review-page > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 18px;
}
.review-page h1 {
  display: inline;
  font-size: 26px;
  margin-right: 10px;
}
.review-page > header > span {
  color: #8c8c8c;
}
.review-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
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
}
.requester {
  display: flex;
  align-items: center;
  gap: 14px;
}
.requester h2 {
  width: 100%;
}
.requester > div {
  display: grid;
  gap: 4px;
}
.requester small,
.detail-row small {
  color: #8c8c8c;
  font-size: 10px;
}
.note {
  grid-column: 2;
  grid-row: 1;
}
.details {
  grid-column: 1/-1;
  padding: 0;
}
.details h2 {
  padding: 18px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 150px 140px minmax(150px, auto);
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-top: 1px solid #f5f5f5;
}
.detail-row > div {
  display: grid;
  gap: 5px;
}
.detail-row > .detail-asset {
  align-items: center;
  display: flex;
}
.detail-asset > div {
  display: grid;
  gap: 5px;
}
.detail-asset :deep(.ant-avatar) {
  flex: 0 0 auto;
}
.actions {
  display: flex !important;
  justify-content: flex-end;
  grid-auto-flow: column;
}
.detail-row span {
  color: #595959;
  font-size: 12px;
}
@media (max-width: 850px) {
  .review-grid {
    grid-template-columns: 1fr;
  }
  .note {
    grid-column: auto;
    grid-row: auto;
  }
  .details {
    grid-column: auto;
  }
  .detail-row {
    grid-template-columns: 1fr 1fr;
  }
  .review-page > header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
@media (max-width: 600px) {
  .review-page {
    padding: 12px;
  }
  .detail-row {
    grid-template-columns: 1fr;
  }
  .actions {
    justify-content: flex-start;
  }
}
</style>
