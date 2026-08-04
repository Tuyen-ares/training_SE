<script setup>
import { onMounted, ref } from "vue";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout.vue";
import {
  listAllBorrowHistory,
  listMyBorrowHistory,
} from "../../services/borrow.service";
import { useAuthStore } from "../../stores/auth";
const authStore = useAuthStore();
const loading = ref(true),
  errorMessage = ref(""),
  result = ref({ items: [], page: 1, pageSize: 20, total: 0 });
const activeTab = ref("CURRENT");
const canViewAll = authStore.hasPermission("borrow_history.view_all");
const formatDate = (value) =>
  value ? new Intl.DateTimeFormat("en-GB").format(new Date(value)) : "—";
async function load(page = 1) {
  loading.value = true;
  errorMessage.value = "";
  try {
    result.value = await (
      canViewAll ? listAllBorrowHistory : listMyBorrowHistory
    )(authStore.api, { page, pageSize: 20, state: activeTab.value });
  } catch (e) {
    errorMessage.value = e.message || "Borrowing activity could not be loaded.";
  } finally {
    loading.value = false;
  }
}
function tabChange(state) {
  activeTab.value = state;
  void load(1);
}
onMounted(() => load());
</script>
<template>
  <WorkspaceLayout
    ><template #context
      ><strong>Borrowing Activity</strong></template
    >
    <main class="history-page">
      <header>
        <h1>Borrowing Activity</h1>
        <p>
          {{
            canViewAll
              ? "Company borrowing history available to your permissions."
              : "Your current and previous borrowed assets."
          }}
        </p>
      </header>
      <section class="panel">
        <a-tabs :active-key="activeTab" @change="tabChange">
          <a-tab-pane key="CURRENT" tab="Currently Borrowed" />
          <a-tab-pane key="RETURNED" tab="Returned History" />
        </a-tabs>
        <a-alert
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
          ><a-table-column v-if="canViewAll" title="Borrower" key="borrower"
            ><template #default="{ record }"
              ><a-space>
                <a-avatar size="small" :src="record.borrower.avatarUrl">{{
                  record.borrower.name.slice(0, 1)
                }}</a-avatar>
                {{ record.borrower.name }}
              </a-space></template
            ></a-table-column
          ><a-table-column title="Borrow Date" key="borrowed"
            ><template #default="{ record }">{{
              formatDate(record.borrowedAt)
            }}</template></a-table-column
          ><a-table-column
            title="Expected Return"
            data-index="expectedReturnDate"
          /><a-table-column
            v-if="activeTab === 'RETURNED'"
            title="Returned Date"
            key="returned"
            ><template #default="{ record }">{{
              formatDate(record.returnedAt)
            }}</template></a-table-column
          ><a-table-column
            v-if="activeTab === 'RETURNED'"
            title="Return Condition"
            key="condition"
            ><template #default="{ record }">{{
              record.returnCondition || "—"
            }}</template></a-table-column
          ><a-table-column title="Status" key="status"
            ><template #default
              ><a-tag :color="activeTab === 'RETURNED' ? 'success' : 'processing'">{{
                activeTab === "RETURNED" ? "RETURNED" : "ACTIVE"
              }}</a-tag></template
            ></a-table-column
          ></a-table
        >
        <footer>
          <span
            >Showing {{ result.items.length }} of
            {{ result.total }} records</span
          ><a-pagination
            :current="result.page"
            :page-size="result.pageSize"
            :total="result.total"
            :show-size-changer="false"
            @change="load"
          />
        </footer>
      </section></main
  ></WorkspaceLayout>
</template>
<style scoped>
.screen-code {
  color: #8c8c8c;
}
.history-page {
  padding: 24px;
  max-width: 1320px;
  margin: auto;
}
.history-page header h1 {
  font-size: 26px;
  margin: 0;
}
.history-page header p {
  color: #8c8c8c;
  margin: 4px 0 18px;
}
.panel {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  min-height: 600px;
  padding: 16px;
}
small {
  color: #8c8c8c;
}
.asset-cell {
  align-items: center;
  display: flex;
  gap: 10px;
}
.asset-cell :deep(.ant-avatar) {
  flex: 0 0 auto;
}
footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 8px;
  color: #8c8c8c;
}
@media (max-width: 600px) {
  .history-page {
    padding: 12px;
  }
}
</style>
