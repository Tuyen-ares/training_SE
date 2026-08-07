<script setup>
import { computed, h, onMounted, ref } from "vue";
import { CheckCircleOutlined } from "@ant-design/icons-vue";
import { Modal, message } from "ant-design-vue";
import WorkspaceLayout from "../../components/layout/WorkspaceLayout.vue";
import {
  listAllBorrowHistory,
  receiveNormalReturn,
} from "../../services/borrow.service";
import { useAuthStore } from "../../stores/auth";
import { DEFAULT_ASSET_IMAGE } from "../../constants/media";
const authStore = useAuthStore();
const loading = ref(true),
  errorMessage = ref(""),
  histories = ref([]),
  busy = ref(null);
const activeReturns = computed(() =>
  histories.value.filter((item) => !item.returnedAt),
);
const formatDate = (value) =>
  new Intl.DateTimeFormat("en-GB").format(new Date(value));
async function load() {
  loading.value = true;
  try {
    const result = await listAllBorrowHistory(authStore.api, {
      page: 1,
      pageSize: 100,
    });
    histories.value = result.items;
  } catch (e) {
    errorMessage.value = e.message || "Return queue could not be loaded.";
  } finally {
    loading.value = false;
  }
}
function confirmReturn(history) {
  Modal.confirm({
    title: "Confirm asset return?",
    content: `${history.asset.model.name} will become AVAILABLE.`,
    okText: "Confirm Return",
    async onOk() {
      busy.value = history.id;
      try {
        await receiveNormalReturn(authStore.api, history.id);
        message.success("Return recorded.");
        await load();
      } catch (e) {
        message.error(e.message || "Return could not be recorded.");
        throw e;
      } finally {
        busy.value = null;
      }
    },
  });
}
onMounted(load);
</script>
<template>
  <WorkspaceLayout
    ><template #context
      ><strong>Handover & Return</strong></template
    >
    <main class="return-page">
      <header>
        <h1>Receive Asset Return</h1>
        <p>Record the condition and return of assets from employees.</p>
      </header>
      <a-alert
        v-if="errorMessage"
        type="error"
        show-icon
        :message="errorMessage"
      />
      <section class="panel">
        <h2>
          Assets Pending Return <a-tag>{{ activeReturns.length }}</a-tag>
        </h2>
        <a-skeleton v-if="loading" active :paragraph="{ rows: 6 }" /><a-empty
          v-else-if="!activeReturns.length"
          description="No assets are awaiting return."
        />
        <article
          v-for="history in activeReturns"
          v-else
          :key="history.id"
          class="return-row"
        >
          <a-avatar shape="square" :size="56" :src="history.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{
            history.asset.model.name.slice(0, 1)
          }}</a-avatar>
          <div>
            <strong>{{ history.asset.model.name }}</strong
            ><span>{{
              history.asset.serialNumber || history.asset.qrCode
            }}</span>
          </div>
          <dl>
            <dt>Borrower</dt>
            <dd>{{ history.borrower.name }}</dd>
            <dt>Borrow Date</dt>
            <dd>{{ formatDate(history.borrowedAt) }}</dd>
            <dt>Expected Return</dt>
            <dd>{{ history.expectedReturnDate }}</dd>
          </dl>
          <a-button
            type="primary"
            :loading="busy === history.id"
            :icon="h(CheckCircleOutlined)"
            @click="confirmReturn(history)"
            >Confirm Normal Return</a-button
          >
        </article>
      </section>
    </main></WorkspaceLayout
  >
</template>
<style scoped>
.screen-code {
  color: #8c8c8c;
}
.return-page {
  padding: 24px;
  max-width: 1320px;
  margin: auto;
}
.return-page header h1 {
  font-size: 26px;
  margin: 0;
}
.return-page header p {
  color: #8c8c8c;
  margin: 4px 0 18px;
}
.panel {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  min-height: 580px;
  padding: 0;
}
.panel h2 {
  padding: 18px;
  margin: 0;
  border-bottom: 1px solid #f0f0f0;
}
.return-row {
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) 2fr auto;
  gap: 18px;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid #f0f0f0;
}
.return-row > div {
  display: grid;
}
.return-row span {
  font-size: 12px;
  color: #8c8c8c;
}
.return-row dl {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: 5px 26px;
  margin: 0;
}
.return-row dt {
  font-size: 10px;
  color: #8c8c8c;
  text-transform: uppercase;
}
.return-row dd {
  margin: 0;
  grid-row: 2;
}
@media (max-width: 900px) {
  .return-row {
    grid-template-columns: auto 1fr;
  }
  .return-row dl,
  .return-row :deep(.ant-btn) {
    grid-column: 1/-1;
  }
  .return-row dl {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .return-page {
    padding: 12px;
  }
}
</style>
