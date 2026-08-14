<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AdministrationTabs from '../../components/administration/AdministrationTabs.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const hasAdministrationAccess = computed(() => [
  'user.view',
  'user_registration.review',
  'role.view',
  'role.assign',
  'department.view',
].some((permission) => authStore.hasPermission(permission)))
const redirecting = ref(true)

function openFirstAvailableSection() {
  const destination = authStore.hasPermission('user.view')
    ? 'users'
    : authStore.hasPermission('user_registration.review')
      ? 'registration-requests'
      : ['role.view', 'role.assign'].some((permission) => authStore.hasPermission(permission))
        ? 'roles'
        : authStore.hasPermission('department.view')
          ? 'departments'
        : null

  if (destination) {
    router.replace({ name: destination })
    return
  }

  redirecting.value = false
}

onMounted(openFirstAvailableSection)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Administration</strong></template>
    <AdministrationTabs />
    <main class="administration-index">
      <a-spin v-if="redirecting" size="large" tip="Opening Administration..." />
      <a-result
        v-else-if="!hasAdministrationAccess"
        status="403"
        title="Administration access required"
        sub-title="Your account does not have a permission for an Administration section."
      />
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.administration-index {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 320px;
  padding: 32px;
}
</style>
