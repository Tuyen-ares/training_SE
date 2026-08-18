<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { LockOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import MediaUploader from '../../components/common/MediaUploader.vue'
import { changeMyPassword, getMyProfile, updateMyProfile } from '../../services/administration/profile.service'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const profile = ref(null)
const loading = ref(true)
const savingProfile = ref(false)
const changingPassword = ref(false)
const errorMessage = ref('')
const passwordError = ref('')
const profileSuccess = ref('')

const profileForm = reactive({ name: '', phone: '', avatarUrl: '', avatarMediaId: null })
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const initials = computed(() => profile.value?.name
  ?.split(/\s+/)
  .filter(Boolean)
  .slice(-2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'U')

function syncProfile(nextProfile) {
  profile.value = nextProfile
  Object.assign(profileForm, {
    name: nextProfile.name,
    phone: nextProfile.phone,
    avatarUrl: nextProfile.avatarUrl || '',
    avatarMediaId: nextProfile.avatarMediaId || null,
  })
  authStore.setCurrentUser(nextProfile)
}

async function loadProfile() {
  loading.value = true
  errorMessage.value = ''
  try {
    syncProfile(await getMyProfile(authStore.api))
  } catch (error) {
    errorMessage.value = error.status === 404
      ? 'Your account could not be found.'
      : 'We could not load your profile. Please try again.'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  errorMessage.value = ''
  profileSuccess.value = ''
  savingProfile.value = true
  try {
    const saved = await updateMyProfile(authStore.api, {
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
      ...(profileForm.avatarMediaId
        ? { avatarMediaId: profileForm.avatarMediaId }
        : { avatarUrl: profileForm.avatarUrl.trim() || null }),
    })
    syncProfile(saved)
    profileSuccess.value = 'Profile updated successfully.'
  } catch (error) {
    if (error.status === 409) errorMessage.value = 'This phone number is already in use.'
    else if (error.status === 400) errorMessage.value = 'Review your name, phone number, and avatar URL.'
    else errorMessage.value = 'We could not update your profile. Please try again.'
  } finally {
    savingProfile.value = false
  }
}

async function changePasswordHandler() {
  passwordError.value = ''
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'The new password confirmation does not match.'
    return
  }

  changingPassword.value = true
  try {
    await changeMyPassword(authStore.api, {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    message.success('Password changed. Please sign in again.')
    try {
      await authStore.logout()
    } catch {
      // logout always clears the local session, even if the revoked cookie fails remotely.
    }
    await router.replace({ name: 'login' })
  } catch (error) {
    passwordError.value = error.status === 400
      ? error.details?.currentPassword?.[0] || 'Review the password fields.'
      : 'We could not change your password. Please try again.'
  } finally {
    changingPassword.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Profile</strong></template>
    <main class="profile-page bigin-page-container">
      <header class="page-heading">
        <div>
          <h1>Profile</h1>
          <p>Manage your personal information and account security.</p>
        </div>
      </header>

      <a-skeleton v-if="loading" active :paragraph="{ rows: 12 }" />
      <a-result v-else-if="errorMessage && !profile" status="error" title="Unable to open profile" :sub-title="errorMessage">
        <template #extra><a-button @click="loadProfile">Try Again</a-button><a-button type="primary" @click="router.push({ name: 'dashboard' })">Back to Dashboard</a-button></template>
      </a-result>
      <template v-else-if="profile">
        <a-alert v-if="errorMessage" class="page-alert" type="error" show-icon :message="errorMessage" />
        <a-alert v-if="profileSuccess" class="page-alert" type="success" show-icon :message="profileSuccess" />

        <div class="profile-grid">
          <section class="summary-card">
            <a-avatar :size="96" :src="profile.avatarUrl">{{ initials }}</a-avatar>
            <h2>{{ profile.name }}</h2>
            <p class="user-code">{{ profile.userCode }}</p>
            <StatusTag :status="profile.isActive ? 'ACTIVE' : 'INACTIVE'" />
            <a-divider />
            <dl class="summary-list">
              <dt>Email</dt><dd>{{ profile.email }}</dd>
              <dt>Department</dt><dd>{{ profile.department?.name || 'Unassigned' }}</dd>
              <dt>Roles</dt><dd>{{ profile.roles.map((role) => role.name.replaceAll('_', ' ')).join(', ') || 'No roles assigned' }}</dd>
            </dl>
          </section>

          <div class="profile-content">
            <section class="content-card">
              <div class="section-heading"><div><h2>Personal information</h2><p>Keep your contact details up to date.</p></div></div>
              <form class="profile-form" @submit.prevent="saveProfile">
                <label><span>Full name <b>*</b></span><a-input v-model:value="profileForm.name" required :maxlength="30" /></label>
                <label><span>Email</span><a-input :value="profile.email" disabled /></label>
                <label><span>Phone number <b>*</b></span><a-input v-model:value="profileForm.phone" required :maxlength="10" /></label>
                <label><span>Avatar URL</span><a-input v-model:value="profileForm.avatarUrl" type="url" :maxlength="500" placeholder="https://example.com/avatar.jpg" @input="profileForm.avatarMediaId = null" /></label>
                <MediaUploader
                  purpose="USER_AVATAR"
                  label="Upload avatar"
                  :model-value="profileForm.avatarMediaId"
                  @update:model-value="profileForm.avatarMediaId = $event; profileForm.avatarUrl = ''"
                />
                <footer class="form-footer"><a-button type="primary" html-type="submit" class="primary-action bigin-touch-target" :loading="savingProfile"><template #icon><SaveOutlined /></template>Save changes</a-button></footer>
              </form>
            </section>

            <section class="content-card">
              <div class="section-heading"><div><h2>Change password</h2><p>Changing your password will sign you out of all sessions.</p></div><LockOutlined class="section-icon" /></div>
              <a-alert v-if="passwordError" class="password-alert" type="error" show-icon :message="passwordError" />
              <form class="password-form" @submit.prevent="changePasswordHandler">
                <label><span>Current password <b>*</b></span><a-input v-model:value="passwordForm.currentPassword" autocomplete="current-password" required type="password" :maxlength="72" /></label>
                <label><span>New password <b>*</b></span><a-input v-model:value="passwordForm.newPassword" autocomplete="new-password" required type="password" minlength="6" :maxlength="72" /></label>
                <label><span>Confirm new password <b>*</b></span><a-input v-model:value="passwordForm.confirmPassword" autocomplete="new-password" required type="password" minlength="6" :maxlength="72" /></label>
                <footer class="form-footer"><a-button type="primary" html-type="submit" class="primary-action bigin-touch-target" :loading="changingPassword">Change password</a-button></footer>
              </form>
            </section>
          </div>
        </div>
      </template>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.profile-page { margin: 0 auto; max-width: 1120px; padding: 24px 28px 48px; }.page-heading { margin-bottom: 20px; }.page-heading h1 { font-size: 22px; margin: 0 0 5px; }.page-heading p,.section-heading p { color: var(--bigin-text-tertiary); margin: 0; }.page-alert { margin-bottom: 16px; }
.profile-grid { align-items: start; display: grid; gap: 20px; grid-template-columns: 280px minmax(0, 1fr); }.summary-card,.content-card { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; padding: 24px; }.summary-card { align-items: center; display: flex; flex-direction: column; }.summary-card h2 { font-size: 20px; margin: 16px 0 4px; text-align: center; }.user-code { color: var(--bigin-text-tertiary); margin: 0 0 10px; }.summary-card :deep(.ant-divider) { align-self: stretch; }.summary-list { align-self: stretch; margin: 0; }.summary-list dt { color: var(--bigin-text-tertiary); font-size: 12px; margin-top: 14px; text-transform: uppercase; }.summary-list dd { margin: 6px 0 0; overflow-wrap: anywhere; }
.profile-content { display: grid; gap: 20px; }.section-heading { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 20px; }.section-heading h2 { font-size: 16px; margin: 0 0 4px; }.section-icon { color: var(--bigin-color-primary); font-size: 18px; }.profile-form,.password-form { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }.profile-form label,.password-form label { display: grid; gap: 7px; }.profile-form label > span,.password-form label > span { font-size: 13px; font-weight: 600; }.profile-form b,.password-form b { color: var(--bigin-color-error); }.profile-form label:nth-child(2),.password-form label:first-child { grid-column: 1 / -1; }.form-footer { border-top: 1px solid var(--bigin-border-secondary); display: flex; grid-column: 1 / -1; justify-content: flex-end; padding-top: 16px; }.primary-action { background: var(--bigin-color-primary); }.password-alert { margin-bottom: 16px; }
@media (max-width: 820px) { .profile-grid { grid-template-columns: 1fr; }.summary-card { align-items: flex-start; display: grid; grid-template-columns: auto 1fr; column-gap: 16px; }.summary-card h2,.summary-card .user-code,.summary-card :deep(.ant-tag) { grid-column: 2; text-align: left; }.summary-card h2 { margin: 0 0 4px; }.summary-card :deep(.ant-avatar) { grid-row: span 3; }.summary-card :deep(.ant-divider),.summary-list { grid-column: 1 / -1; } }
@media (max-width: 575px) { .profile-page { padding: 16px 12px 32px; }.summary-card,.content-card { padding: 16px; }.profile-form,.password-form { grid-template-columns: 1fr; }.profile-form label:nth-child(2),.password-form label:first-child { grid-column: auto; }.form-footer { align-items: stretch; }.form-footer :deep(.ant-btn) { width: 100%; } }
</style>
