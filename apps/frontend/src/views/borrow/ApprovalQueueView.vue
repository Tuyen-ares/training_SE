<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout.vue";
import { listReviewQueue } from "../../services/borrow.service";
import { useAuthStore } from "../../stores/auth";
const router = useRouter(),
  authStore = useAuthStore();
const loading = ref(true),
  errorMessage = ref(""),
  result = ref({ items: [], page: 1, pageSize: 10, total: 0 });
const query = reactive({ page: 1, pageSize: 10 });
const formatDate = (value) =>
  new Intl.DateTimeFormat("en-GB").format(new Date(value));
async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    result.value = await listReviewQueue(authStore.api, query);
  } catch (e) {
    errorMessage.value = e.message || "Approval queue could not be loaded.";
  } finally {
    loading.value = false;
  }
}
function pageChange(page) {
  query.page = page;
  void load();
}
onMounted(load);
</script>
<template>
  <WorkspaceLayout
    ><template #context
      ><strong>Approval Queue</strong></template
    >
    <main class="queue-page">
      <header>
        <h1>Approval Queue</h1>
        <p>Manage and approve equipment borrowing requests.</p>
      </header>
      <section class="panel">
        <a-tabs default-active-key="pending"
          ><a-tab-pane key="pending" tab="Pending Approval" /></a-tabs
        ><a-alert
          v-if="errorMessage"
          type="error"
          show-icon
          :message="errorMessage"
        /><a-table
          v-else
          :loading="loading"
          :data-source="result.items"
          row-key="id"
          :pagination="false"
          ><a-table-column title="Request ID" key="id"
            ><template #default="{ record }"
              >REQ-{{ String(record.id).padStart(4, "0") }}</template
            ></a-table-column
          ><a-table-column title="Requester" key="requester"
            ><template #default="{ record }"
              ><a-space
                ><a-avatar size="small" :src="record.requester.avatarUrl">{{
                  record.requester.name.slice(0, 1)
                }}</a-avatar
                >{{ record.requester.name }}</a-space
              ></template
            ></a-table-column
          ><a-table-column title="Date Created" key="created"
            ><template #default="{ record }">{{
              formatDate(record.createdAt)
            }}</template></a-table-column
          ><a-table-column title="Quantity" key="qty"
            ><template #default="{ record }">{{
              record.details.length
            }}</template></a-table-column
          ><a-table-column title="Expected Return" key="return"
            ><template #default="{ record }">{{
              record.details[0]?.expectedReturnDate || "—"
            }}</template></a-table-column
          ><a-table-column title="Status" key="status"
            ><template #default="{ record }"
              ><a-tag color="orange">{{
                record.status.replaceAll("_", " ")
              }}</a-tag></template
            ></a-table-column
          ><a-table-column title="Actions" key="actions"
            ><template #default="{ record }"
              ><a-button
                type="primary"
                size="small"
                @click="
                  router.push({
                    name: 'approval-detail',
                    params: { id: record.id },
                    state: { request: record },
                  })
                "
                >Review</a-button
              ></template
            ></a-table-column
          ></a-table
        >
        <footer>
          <span
            >Showing {{ result.items.length }} of
            {{ result.total }} requests</span
          ><a-pagination
            :current="result.page"
            :page-size="result.pageSize"
            :total="result.total"
            :show-size-changer="false"
            @change="pageChange"
          />
        </footer>
      </section></main
  ></WorkspaceLayout>
</template>
<style scoped>
.screen-code {
  color: #8c8c8c;
}
.queue-page {
  padding: 24px;
  max-width: 1320px;
  margin: auto;
}
.queue-page header h1 {
  margin: 0;
  font-size: 26px;
}
.queue-page header p {
  margin: 4px 0 18px;
  color: #8c8c8c;
}
.panel {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  min-height: 600px;
  padding: 0 16px;
}
footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 8px;
  color: #8c8c8c;
}
@media (max-width: 600px) {
  .queue-page {
    padding: 12px;
  }
}
</style>
