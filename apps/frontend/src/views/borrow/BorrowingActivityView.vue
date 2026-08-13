<script setup>
import { h, onMounted, ref } from "vue";
import { EyeOutlined } from "@ant-design/icons-vue";
import { useRouter } from "vue-router";
import StatusTag from "../../components/common/StatusTag.vue";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout.vue";
import {
  listAllBorrowHistory,
  listMyBorrowHistory,
} from "../../services/borrow.service";
import { useAuthStore } from "../../stores/auth";
import { DEFAULT_ASSET_IMAGE } from "../../constants/media";
const authStore = useAuthStore();
const router = useRouter();
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
function viewDetails(historyId) {
  router.push({ name: "borrowing-activity-detail", params: { id: historyId } });
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
        /><div v-else class="bigin-table-scroll-wrapper"><a-table
          :loading="loading"
          :data-source="result.items"
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
          ><a-table-column v-if="canViewAll" title="Borrower" key="borrower" :width="190"
            ><template #default="{ record }"
              ><a-space>
                <a-avatar size="small" :src="record.borrower.avatarUrl">{{
                  record.borrower.name.slice(0, 1)
                }}</a-avatar>
                {{ record.borrower.name }}
              </a-space></template
            ></a-table-column
          ><a-table-column title="Borrow Date" key="borrowed" :width="150"
            ><template #default="{ record }">{{
              formatDate(record.borrowedAt)
            }}</template></a-table-column
          ><a-table-column
            title="Expected Return"
            data-index="expectedReturnDate"
            :width="170"
          /><a-table-column
            v-if="activeTab === 'RETURNED'"
            title="Returned Date"
            key="returned"
            :width="150"
            ><template #default="{ record }">{{
              formatDate(record.returnedAt)
            }}</template></a-table-column
          ><a-table-column
            v-if="activeTab === 'RETURNED'"
            title="Return Condition"
            key="condition"
            :width="180"
            ><template #default="{ record }">{{
              record.returnCondition || "—"
            }}</template></a-table-column
          ><a-table-column title="Status" key="status" :width="130"
            ><template #default
              ><StatusTag :status="activeTab === 'RETURNED' ? 'RETURNED' : 'CURRENT'" /></template
            ></a-table-column
          ><a-table-column title="Action" key="action" :width="150"
            ><template #default="{ record }"
              ><a-button
                class="bigin-touch-target"
                type="link"
                :icon="h(EyeOutlined)"
                @click="viewDetails(record.id)"
                >View Details</a-button
              ></template
            ></a-table-column
          ></a-table></div>
        <footer class="bigin-responsive-footer">
          <span
            >Showing {{ result.items.length }} of
            {{ result.total }} records</span
          ><a-pagination class="bigin-touch-target"
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
  color: var(--bigin-text-tertiary);
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
  color: var(--bigin-text-tertiary);
  margin: 4px 0 18px;
}
.panel {
  background: var(--bigin-surface-panel);
  border: 1px solid var(--bigin-border-secondary);
  border-radius: 8px;
  min-height: 600px;
  padding: 16px;
}
small {
  color: var(--bigin-text-tertiary);
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
  color: var(--bigin-text-tertiary);
}
@media (max-width: 600px) {
  .history-page {
    padding: 12px;
  }
}
</style>
