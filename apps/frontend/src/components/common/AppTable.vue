<script setup>
import { computed, ref, useAttrs, useSlots, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  columns: { type: Array, default: undefined },
  dataSource: { type: Array, default: () => [] },
  rowKey: { type: [String, Function], default: 'id' },
  loading: { type: Boolean, default: false },
  pagination: { type: [Boolean, Object], default: false },
  scroll: { type: Object, default: undefined },
  scrollMode: { type: String, default: 'responsive' },
  emptyDescription: { type: String, default: 'No records found.' },
})

const emit = defineEmits(['page-change'])
const attrs = useAttrs()
const slots = useSlots()
const clientPage = ref(1)

const paginationConfig = computed(() => {
  if (!props.pagination) return null
  return typeof props.pagination === 'object' ? props.pagination : {}
})

const isClientPagination = computed(() => paginationConfig.value?.mode === 'client')
const currentPage = computed(() => {
  if (isClientPagination.value) return clientPage.value
  return paginationConfig.value?.current || 1
})
const pageSize = computed(() => paginationConfig.value?.pageSize || 20)
const total = computed(() => isClientPagination.value
  ? props.dataSource.length
  : paginationConfig.value?.total ?? props.dataSource.length)
const displayedDataSource = computed(() => {
  if (!isClientPagination.value) return props.dataSource
  const start = (currentPage.value - 1) * pageSize.value
  return props.dataSource.slice(start, start + pageSize.value)
})
const tableScroll = computed(() => {
  if (props.scroll) return props.scroll
  return props.scrollMode === 'intentional' ? { x: 'max-content' } : undefined
})
const tablePagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: false,
  showLessItems: true,
  ...paginationConfig.value,
  mode: undefined,
  label: undefined,
}))
const hasPagination = computed(() => Boolean(paginationConfig.value))
const hasMobileRow = computed(() => Boolean(slots.mobileRow))
const useMobileLayout = computed(() => hasMobileRow.value && !props.loading && displayedDataSource.value.length > 0)
const forwardedSlotNames = computed(() => Object.keys(slots).filter((name) => !['default', 'emptyText', 'headerCell', 'mobileRow', 'pagination'].includes(name)))
const paginationLabel = computed(() => paginationConfig.value?.label || 'records')
const paginationSummary = computed(() => {
  if (!total.value) return `0 of 0 ${paginationLabel.value}`
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total.value)
  return `Showing ${start}-${end} of ${total.value} ${paginationLabel.value}`
})

watch(() => props.pagination, (value) => {
  if (value && typeof value === 'object' && value.current) clientPage.value = value.current
}, { deep: true })
watch(() => props.dataSource.length, () => {
  if (isClientPagination.value && clientPage.value > 1 && (clientPage.value - 1) * pageSize.value >= props.dataSource.length) {
    clientPage.value = 1
  }
})

function rowKeyFor(record, index) {
  return typeof props.rowKey === 'function' ? props.rowKey(record) : record?.[props.rowKey] ?? index
}

function handlePageChange(page, nextPageSize) {
  if (isClientPagination.value) clientPage.value = page
  emit('page-change', page, nextPageSize)
}
</script>

<template>
  <div class="bigin-app-table" :class="{ 'bigin-app-table--mobile': useMobileLayout }">
    <div class="bigin-app-table__surface">
      <a-table
        v-bind="attrs"
        :columns="columns"
        :data-source="displayedDataSource"
        :loading="loading"
        :pagination="false"
        :row-key="rowKey"
        :scroll="tableScroll"
      >
        <slot />
        <template #headerCell="{ title, column }">
          <slot name="headerCell" :title="title" :column="column">
            <span
              :class="{
                'bigin-app-table__action-heading': title === 'Action' || column?.title === 'Action',
              }"
            >
              {{ title }}
            </span>
          </slot>
        </template>
        <template #emptyText>
          <slot name="emptyText">
            <a-empty :description="emptyDescription" />
          </slot>
        </template>
        <template v-for="slotName in forwardedSlotNames" :key="slotName" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
      </a-table>
    </div>

    <div v-if="hasMobileRow && !loading && displayedDataSource.length" class="bigin-app-table__mobile-list">
      <article v-for="(record, index) in displayedDataSource" :key="rowKeyFor(record, index)" class="bigin-app-table__mobile-row">
        <slot name="mobileRow" :record="record" :index="index" />
      </article>
    </div>

    <footer v-if="hasPagination" class="bigin-app-table__pagination bigin-responsive-footer">
      <span>{{ paginationSummary }}</span>
      <slot name="pagination" :pagination="tablePagination">
        <a-pagination
          class="bigin-touch-target"
          v-bind="tablePagination"
          @change="handlePageChange"
        />
      </slot>
    </footer>
  </div>
</template>

<style scoped>
.bigin-app-table { min-width: 0; width: 100%; }
.bigin-app-table__surface { min-width: 0; width: 100%; }
.bigin-app-table :deep(.ant-table) { font-size: 13px; }
.bigin-app-table :deep(.ant-table-content), .bigin-app-table :deep(.ant-table-body) { overscroll-behavior-inline: contain; }
.bigin-app-table :deep(.ant-table-thead > tr > th) {
  background: var(--bigin-surface-subtle);
  color: var(--bigin-text-secondary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  padding: var(--bigin-table-header-padding-y) var(--bigin-table-header-padding-x);
  text-transform: uppercase;
}
.bigin-app-table :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--bigin-border-secondary);
  padding: var(--bigin-table-cell-padding-y) var(--bigin-table-cell-padding-x);
  vertical-align: middle;
}
.bigin-app-table :deep(.ant-table-tbody > tr:last-child > td) { border-bottom: 0; }
.bigin-app-table__action-heading { display: block; text-align: center; width: 100%; }
.bigin-app-table__pagination {
  align-items: center;
  border-top: 1px solid var(--bigin-border-secondary);
  color: var(--bigin-text-tertiary);
  display: flex;
  font-size: 12px;
  justify-content: space-between;
  min-height: 52px;
  padding: 8px var(--bigin-table-cell-padding-x);
}
.bigin-app-table__mobile-list { display: none; }
.bigin-app-table__mobile-row {
  background: var(--bigin-surface-panel);
  border: 1px solid var(--bigin-border-secondary);
  border-radius: var(--bigin-radius-control);
  min-width: 0;
  padding: var(--bigin-table-cell-padding-y) var(--bigin-table-cell-padding-x);
}
@media (max-width: 767px) {
  .bigin-app-table--mobile .bigin-app-table__surface { display: none; }
  .bigin-app-table--mobile .bigin-app-table__mobile-list { display: grid; gap: 8px; }
  .bigin-app-table__pagination { align-items: flex-start; flex-direction: column; gap: 8px; }
}
</style>
