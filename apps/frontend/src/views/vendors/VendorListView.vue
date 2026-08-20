<script setup>
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'

import AppTable from '../../components/common/AppTable.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { createVendor, listVendors, updateVendor, updateVendorStatus } from '../../services/vendors/vendor.service'
import { useAuthStore } from '../../stores/auth'
import { actionWidth } from '../../utils/table'

const authStore = useAuthStore()
const loading = ref(true)
const errorMessage = ref('')
const forbidden = ref(false)
const result = reactive({ items: [], page: 1, pageSize: 20, total: 0 })
const filters = reactive({ q: '', isActive: undefined })
const dialog = reactive({ open: false, saving: false, item: null, name: '', contactName: '', phone: '', email: '', address: '', isActive: true })

const canCreate = computed(() => authStore.hasPermission('vendor.create'))
const canUpdate = computed(() => authStore.hasPermission('vendor.update'))
const canManageStatus = computed(() => authStore.hasPermission('vendor.manage_status'))

function displayValue(value) {
  return value || '—'
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  forbidden.value = false
  try {
    const page = await listVendors(authStore.api, {
      q: filters.q.trim() || undefined,
      page: result.page,
      pageSize: result.pageSize,
      isActive: filters.isActive,
    })
    Object.assign(result, page)
  } catch (error) {
    forbidden.value = error.status === 403
    errorMessage.value = forbidden.value ? '' : (error.message || 'Vendor catalog could not be loaded.')
  } finally { loading.value = false }
}

function applyFilters() { result.page = 1; void load() }
function resetFilters() { filters.q = ''; filters.isActive = undefined; result.page = 1; void load() }
function changePage(page, pageSize) { result.page = page; result.pageSize = pageSize; void load() }

function openDialog(item = null) {
  Object.assign(dialog, {
    open: true,
    item,
    name: item?.name || '',
    contactName: item?.contactName || '',
    phone: item?.phone || '',
    email: item?.email || '',
    address: item?.address || '',
    isActive: item?.isActive ?? true,
  })
}

async function saveDialog() {
  if (!dialog.name.trim()) return message.warning('Vendor name is required.')
  dialog.saving = true
  try {
    const body = {
      name: dialog.name.trim(),
      contactName: dialog.contactName,
      phone: dialog.phone,
      email: dialog.email,
      address: dialog.address,
    }
    if (dialog.item) {
      if (canUpdate.value) await updateVendor(authStore.api, dialog.item.id, body)
    } else {
      await createVendor(authStore.api, body)
    }
    if (dialog.item && canManageStatus.value && dialog.isActive !== dialog.item.isActive) {
      await updateVendorStatus(authStore.api, dialog.item.id, dialog.isActive)
    }
    message.success(dialog.item ? 'Vendor updated.' : 'Vendor created.')
    dialog.open = false
    await load()
  } catch (error) { message.error(error.message || 'Vendor could not be saved.') }
  finally { dialog.saving = false }
}

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Vendors</strong></template>
    <main class="vendor-page bigin-page-container">
      <header class="vendor-page__header">
        <div><h1>Vendors</h1><p>Shared vendor master data for repairs and future asset workflows.</p></div>
        <a-button v-if="canCreate" type="primary" class="bigin-touch-target" @click="openDialog()"><template #icon><PlusOutlined /></template>Add vendor</a-button>
      </header>
      <a-result v-if="forbidden" status="403" title="You do not have access to Vendor Management" sub-title="The vendor.view permission is required to open this screen." />
      <a-alert v-else-if="errorMessage" type="error" show-icon :message="errorMessage"><template #action><a-button size="small" @click="load">Retry</a-button></template></a-alert>
      <section v-else class="table-panel">
        <div class="filter-panel">
          <a-input v-model:value="filters.q" allow-clear placeholder="Search vendor name" style="width: 280px" @press-enter="applyFilters" />
          <a-select v-model:value="filters.isActive" allow-clear placeholder="All statuses" style="width: 180px" :options="[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]" />
          <a-button type="primary" @click="applyFilters">Search</a-button>
          <a-button @click="resetFilters">Clear</a-button>
          <a-button :icon="h(ReloadOutlined)" :loading="loading" @click="load">Refresh</a-button>
        </div>
        <AppTable
          :loading="loading"
          :data-source="result.items"
          row-key="id"
          scroll-mode="intentional"
          empty-description="No vendors found."
          :pagination="{ current: result.page, pageSize: result.pageSize, total: result.total, label: 'vendors' }"
          @page-change="changePage"
        >
          <a-table-column title="Vendor" key="vendor" :width="220"><template #default="{ record }"><strong>{{ record.name }}</strong></template></a-table-column>
          <a-table-column title="Contact name" key="contactName" :width="180"><template #default="{ record }">{{ displayValue(record.contactName) }}</template></a-table-column>
          <a-table-column title="Phone" key="phone" :width="160"><template #default="{ record }">{{ displayValue(record.phone) }}</template></a-table-column>
          <a-table-column title="Email" key="email" :width="240"><template #default="{ record }">{{ displayValue(record.email) }}</template></a-table-column>
          <a-table-column title="Address" key="address" :width="260"><template #default="{ record }">{{ displayValue(record.address) }}</template></a-table-column>
          <a-table-column title="Status" :width="130"><template #default="{ record }"><a-tag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Active' : 'Inactive' }}</a-tag></template></a-table-column>
          <a-table-column title="Action" fixed="right" :width="actionWidth('normal')" align="right"><template #default="{ record }"><a-button v-if="canUpdate || canManageStatus" type="link" class="bigin-touch-target" @click="openDialog(record)"><template #icon><EditOutlined /></template>Edit</a-button></template></a-table-column>
          <template #mobileRow="{ record }">
            <div class="vendor-mobile-row"><div class="vendor-cell"><strong>{{ record.name }}</strong><span>Contact: {{ displayValue(record.contactName) }}</span><span>Phone: {{ displayValue(record.phone) }}</span><span>Email: {{ displayValue(record.email) }}</span><small>Address: {{ displayValue(record.address) }}</small></div><div class="vendor-mobile-meta"><a-tag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Active' : 'Inactive' }}</a-tag><a-button v-if="canUpdate || canManageStatus" type="link" class="bigin-touch-target" @click="openDialog(record)">Edit</a-button></div></div>
          </template>
        </AppTable>
      </section>
    </main>
    <a-modal v-model:open="dialog.open" wrap-class-name="bigin-modal-content" :title="dialog.item ? 'Edit vendor' : 'Create vendor'" :confirm-loading="dialog.saving" ok-text="Save" @ok="saveDialog">
      <a-form layout="vertical">
        <a-form-item label="Name" required><a-input v-model:value="dialog.name" :disabled="dialog.item && !canUpdate" maxlength="255" /></a-form-item>
        <a-form-item label="Contact name"><a-input v-model:value="dialog.contactName" :disabled="dialog.item && !canUpdate" maxlength="255" /></a-form-item>
        <a-form-item label="Phone"><a-input v-model:value="dialog.phone" :disabled="dialog.item && !canUpdate" maxlength="50" /></a-form-item>
        <a-form-item label="Email"><a-input v-model:value="dialog.email" :disabled="dialog.item && !canUpdate" maxlength="255" /></a-form-item>
        <a-form-item label="Address"><a-textarea v-model:value="dialog.address" :disabled="dialog.item && !canUpdate" :rows="3" maxlength="1000" show-count /></a-form-item>
        <a-form-item v-if="dialog.item && canManageStatus" label="Status"><a-switch v-model:checked="dialog.isActive" checked-children="Active" un-checked-children="Inactive" /></a-form-item>
      </a-form>
    </a-modal>
  </WorkspaceLayout>
</template>

<style scoped>
.vendor-page { margin: 0; max-width: none; padding: 28px 32px 48px; }
.vendor-page__header { align-items: flex-start; display: flex; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.vendor-page h1 { font-size: 28px; margin: 0; }
.vendor-page__header p { color: var(--bigin-text-secondary); margin: 6px 0 0; }
.table-panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; padding: 16px; }
.filter-panel { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.vendor-cell { display: grid; gap: 3px; min-width: 0; }.vendor-cell strong, .vendor-cell span, .vendor-cell small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.vendor-cell span { color: var(--bigin-text-secondary); font-size: 12px; }.vendor-cell small { color: var(--bigin-text-tertiary); font-size: 11px; }.vendor-mobile-row { display: grid; gap: 12px; }.vendor-mobile-meta { align-items: center; display: flex; justify-content: space-between; gap: 8px; }
@media (max-width: 700px) { .vendor-page { padding: 18px 14px 32px; } .vendor-page__header { flex-direction: column; } .vendor-page__header :deep(.ant-btn) { width: 100%; } .filter-panel { align-items: stretch; flex-direction: column; } .filter-panel :deep(.ant-input), .filter-panel :deep(.ant-select), .filter-panel :deep(.ant-btn) { width: 100% !important; } }
</style>
