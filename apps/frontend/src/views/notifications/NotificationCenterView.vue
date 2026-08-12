<script setup>
import {
  BellOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'

import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notification.service'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const activeTab = ref('all')
const loading = ref(true)
const actionId = ref(null)
const markingAll = ref(false)
const errorMessage = ref('')
const page = reactive({ items: [], page: 1, pageSize: 10, total: 0, unreadCount: 0 })

const hasUnread = computed(() => page.unreadCount > 0)

const notificationStyles = {
  ASSET_ISSUE_REPORTED: { icon: ExclamationCircleOutlined, color: 'var(--bigin-color-error)', background: 'var(--bigin-surface-error)' },
  ASSET_ISSUE_CONFIRMED: { icon: ExclamationCircleOutlined, color: 'var(--bigin-color-error)', background: 'var(--bigin-surface-error)' },
  ASSET_REPAIR_STARTED: { icon: ToolOutlined, color: 'var(--bigin-color-warning)', background: 'var(--bigin-surface-warning)' },
  ASSET_REPAIR_COMPLETED: { icon: CheckCircleOutlined, color: 'var(--bigin-color-success)', background: 'var(--bigin-surface-success)' },
}

function styleFor(type) {
  return notificationStyles[type] || { icon: BellOutlined, color: 'var(--bigin-color-primary)', background: 'var(--bigin-surface-primary-soft)' }
}

function relativeTime(value) {
  const time = new Date(value).getTime()
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await listNotifications(authStore.api, {
      page: page.page,
      pageSize: page.pageSize,
      isRead: activeTab.value === 'unread' ? false : undefined,
    })
    Object.assign(page, result)
  } catch (error) {
    errorMessage.value = error.message || 'Notifications could not be loaded.'
  } finally {
    loading.value = false
  }
}

function changeTab(key) {
  activeTab.value = key
  page.page = 1
  void load()
}

function changePage(nextPage) {
  page.page = nextPage
  void load()
}

async function markRead(notification) {
  if (notification.isRead) return
  actionId.value = notification.id
  try {
    await markNotificationRead(authStore.api, notification.id)
    notification.isRead = true
    page.unreadCount = Math.max(0, page.unreadCount - 1)
    window.dispatchEvent(new CustomEvent('notifications:changed'))
    if (activeTab.value === 'unread') await load()
  } catch (error) {
    message.error(error.message || 'The notification could not be marked as read.')
  } finally {
    actionId.value = null
  }
}

async function markAllRead() {
  markingAll.value = true
  try {
    await markAllNotificationsRead(authStore.api)
    message.success('All notifications marked as read.')
    window.dispatchEvent(new CustomEvent('notifications:changed'))
    await load()
  } catch (error) {
    message.error(error.message || 'Notifications could not be updated.')
  } finally {
    markingAll.value = false
  }
}

async function openRelated(notification) {
  await markRead(notification)
  if (!notification.relatedEntityId) return message.info('This notification has no related record.')

  if (notification.relatedEntityType === 'ASSET_ISSUE' && authStore.hasPermission('asset_issue.view')) {
    return router.push({ name: 'asset-issue-detail', params: { id: notification.relatedEntityId } })
  }
  if (notification.relatedEntityType === 'BORROW_REQUEST') {
    const routeName = authStore.hasPermission('borrow_request.view_all')
      ? 'approval-detail'
      : authStore.hasPermission('borrow_request.view_own') ? 'borrow-request-detail' : null
    if (routeName) return router.push({ name: routeName, params: { id: notification.relatedEntityId } })
  }
  message.warning('You do not have access to the related record.')
}

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Notifications</strong></template>
    <main class="notification-page">
      <header class="notification-page__header">
        <div>
          <h1>Notifications</h1>
          <p>Updates about your requests, handovers, returns, and asset issues.</p>
        </div>
        <a-button
          :disabled="!hasUnread"
          :loading="markingAll"
          :icon="h(CheckOutlined)"
          @click="markAllRead"
        >Mark all as read</a-button>
      </header>

      <section class="notification-panel">
        <a-tabs :active-key="activeTab" @change="changeTab">
          <a-tab-pane key="all" tab="All" />
          <a-tab-pane key="unread">
            <template #tab><a-badge :count="page.unreadCount" :offset="[10, 0]">Unread</a-badge></template>
          </a-tab-pane>
        </a-tabs>

        <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage">
          <template #action><a-button size="small" @click="load">Retry</a-button></template>
        </a-alert>
        <a-skeleton v-else-if="loading" active :paragraph="{ rows: 7 }" />
        <a-empty v-else-if="!page.items.length" description="No notifications here yet." />
        <div v-else class="notification-list">
          <article
            v-for="notification in page.items"
            :key="notification.id"
            class="notification-item"
            :class="{ 'notification-item--unread': !notification.isRead }"
          >
            <span
              class="notification-item__icon"
              :style="{ color: styleFor(notification.notificationType).color, background: styleFor(notification.notificationType).background }"
            ><component :is="styleFor(notification.notificationType).icon" /></span>
            <div class="notification-item__content">
              <div class="notification-item__heading">
                <strong>{{ notification.title }}</strong>
                <time :datetime="notification.createdAt">{{ relativeTime(notification.createdAt) }}</time>
              </div>
              <p>{{ notification.message }}</p>
              <a-space wrap>
                <StatusTag v-if="!notification.isRead" status="UNREAD" />
                <a-button
                  v-if="!notification.isRead"
                  type="link"
                  size="small"
                  :loading="actionId === notification.id"
                  @click="markRead(notification)"
                >Mark as read</a-button>
                <a-button
                  v-if="notification.relatedEntityId"
                  type="link"
                  size="small"
                  @click="openRelated(notification)"
                >View related</a-button>
              </a-space>
            </div>
          </article>
        </div>

        <footer v-if="page.total > page.pageSize" class="notification-panel__footer">
          <span>Showing {{ page.items.length }} of {{ page.total }} notifications</span>
          <a-pagination
            :current="page.page"
            :page-size="page.pageSize"
            :total="page.total"
            :show-size-changer="false"
            @change="changePage"
          />
        </footer>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.notification-page { margin: 0 auto; max-width: 1180px; padding: 28px 32px 48px; }
.notification-page__header { align-items: flex-start; display: flex; gap: 24px; justify-content: space-between; margin-bottom: 18px; }
.notification-page h1 { font-size: 28px; line-height: 1.25; margin: 0; }
.notification-page p { color: var(--bigin-text-secondary); margin: 6px 0 0; }
.notification-panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; min-height: 520px; padding: 0 22px; }
.notification-list { border: 1px solid var(--bigin-border-secondary); border-radius: 8px; overflow: hidden; }
.notification-item { align-items: flex-start; background: var(--bigin-surface-panel); border-bottom: 1px solid var(--bigin-border-secondary); display: flex; gap: 16px; padding: 20px; }
.notification-item:last-child { border-bottom: 0; }
.notification-item--unread { background: var(--bigin-surface-unread); box-shadow: inset 3px 0 var(--bigin-color-primary); }
.notification-item__icon { align-items: center; border-radius: 50%; display: inline-flex; flex: 0 0 42px; font-size: 19px; height: 42px; justify-content: center; }
.notification-item__content { min-width: 0; width: 100%; }
.notification-item__heading { align-items: flex-start; display: flex; gap: 18px; justify-content: space-between; }
.notification-item__heading strong { color: var(--bigin-text-primary); font-size: 15px; }
.notification-item__heading time { color: var(--bigin-text-tertiary); flex: 0 0 auto; font-size: 12px; }
.notification-item__content p { line-height: 1.55; margin: 6px 0 10px; }
.notification-panel__footer { align-items: center; color: var(--bigin-text-tertiary); display: flex; justify-content: space-between; padding: 18px 0; }
@media (max-width: 700px) {
  .notification-page { padding: 18px 14px 32px; }
  .notification-page__header { align-items: stretch; flex-direction: column; }
  .notification-panel { padding: 0 14px; }
  .notification-item { padding: 16px 12px; }
  .notification-item__heading { flex-direction: column; gap: 4px; }
  .notification-panel__footer { align-items: flex-start; flex-direction: column; gap: 12px; }
}
</style>
