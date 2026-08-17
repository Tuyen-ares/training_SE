<script setup>
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'

import WorkspaceLayout from '../../../components/layout/WorkspaceLayout.vue'
import AdministrationTabs from '../../../components/administration/AdministrationTabs.vue'
import { createDepartment, listDepartments, updateDepartment, updateDepartmentStatus } from '../../../services/administration/department.service'
import { useAuthStore } from '../../../stores/auth'

const authStore = useAuthStore()
const departments = ref([])
const loading = ref(true)
const errorMessage = ref('')
const dialog = reactive({ open: false, saving: false, item: null, name: '', isActive: true })

const canCreate = computed(() => authStore.hasPermission('department.create'))
const canUpdate = computed(() => authStore.hasPermission('department.update'))
const canManageStatus = computed(() => authStore.hasPermission('department.manage_status'))

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    departments.value = await listDepartments(authStore.api)
  } catch (error) {
    errorMessage.value = error.message || 'Departments could not be loaded.'
  } finally {
    loading.value = false
  }
}

function openDialog(item = null) {
  Object.assign(dialog, {
    open: true,
    item,
    name: item?.name || '',
    isActive: item?.isActive ?? true,
  })
}

async function save() {
  if (!dialog.name.trim()) return message.warning('Department name is required.')
  dialog.saving = true
  try {
    if (dialog.item) {
      if (canUpdate.value) await updateDepartment(authStore.api, dialog.item.id, { name: dialog.name.trim() })
    } else {
      await createDepartment(authStore.api, { name: dialog.name.trim() })
    }
    if (dialog.item && canManageStatus.value && dialog.isActive !== dialog.item.isActive) {
      await updateDepartmentStatus(authStore.api, dialog.item.id, dialog.isActive)
    }
    message.success(dialog.item ? 'Department updated.' : 'Department created.')
    dialog.open = false
    await load()
  } catch (error) {
    message.error(error.message || 'Department could not be saved.')
  } finally {
    dialog.saving = false
  }
}

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Administration</strong></template>
    <AdministrationTabs />
    <main class="department-page bigin-page-container">
      <header class="department-page__header">
        <div><h1>Departments</h1><p>Manage reference departments while preserving existing assignments and history.</p></div>
        <a-button v-if="canCreate" type="primary" class="bigin-touch-target" @click="openDialog()"><template #icon><PlusOutlined /></template>Add department</a-button>
      </header>
      <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage"><template #action><a-button size="small" @click="load">Retry</a-button></template></a-alert>
      <section class="table-panel">
        <a-skeleton v-if="loading" active :paragraph="{ rows: 6 }" />
        <a-empty v-else-if="!departments.length" description="No departments found." />
        <div v-else class="bigin-table-scroll-wrapper">
          <a-table :data-source="departments" row-key="id" :loading="loading" :pagination="false" :scroll="{ x: 'max-content' }">
            <a-table-column title="Name" data-index="name" />
            <a-table-column title="Status" :width="140"><template #default="{ record }"><a-tag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Active' : 'Inactive' }}</a-tag></template></a-table-column>
            <a-table-column title="Actions" :width="120"><template #default="{ record }"><a-button v-if="canUpdate || canManageStatus" type="link" class="bigin-touch-target" @click="openDialog(record)"><template #icon><EditOutlined /></template>Edit</a-button></template></a-table-column>
          </a-table>
        </div>
        <div class="table-footer"><span>{{ departments.length }} departments</span><a-button :icon="h(ReloadOutlined)" :loading="loading" @click="load">Refresh</a-button></div>
      </section>
    </main>
    <a-modal v-model:open="dialog.open" wrap-class-name="bigin-modal-content" :title="dialog.item ? 'Edit department' : 'Create department'" :confirm-loading="dialog.saving" ok-text="Save" @ok="save">
      <a-form layout="vertical">
        <a-form-item label="Name" required><a-input v-model:value="dialog.name" :disabled="dialog.item && !canUpdate" maxlength="30" /></a-form-item>
        <a-form-item v-if="dialog.item && canManageStatus" label="Status"><a-switch v-model:checked="dialog.isActive" checked-children="Active" un-checked-children="Inactive" /></a-form-item>
      </a-form>
    </a-modal>
  </WorkspaceLayout>
</template>

<style scoped>
.department-page { margin: 0 auto; max-width: 1100px; padding: 28px 32px 48px; }
.department-page__header { align-items: flex-start; display: flex; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.department-page h1 { font-size: 28px; margin: 0; }.department-page__header p { color: var(--bigin-text-secondary); margin: 6px 0 0; }
.table-panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; margin-top: 16px; padding: 16px; }
.table-footer { align-items: center; color: var(--bigin-text-tertiary); display: flex; justify-content: space-between; padding-top: 16px; }
@media (max-width: 700px) { .department-page { padding: 18px 14px 32px; }.department-page__header { flex-direction: column; }.department-page__header :deep(.ant-btn) { width: 100%; } }
</style>
