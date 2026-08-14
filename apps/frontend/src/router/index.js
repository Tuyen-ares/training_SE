import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/login/Login.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/login/register.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/main',
      name: 'main',
      component: () => import('../views/train/Main.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/admin/Dashboard.vue'),
      meta: { requiresAuth: true, permission: 'dashboard.view' },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/admin/Users.vue'),
      meta: { requiresAuth: true, permission: 'user.view' },
    },
    {
      path: '/users/new',
      name: 'user-create',
      component: () => import('../views/admin/UserFormView.vue'),
      meta: { requiresAuth: true, permission: 'user.create' },
    },
    {
      path: '/users/:id/edit',
      name: 'user-edit',
      component: () => import('../views/admin/UserFormView.vue'),
      meta: { requiresAuth: true, permission: 'user.update' },
    },
    {
      path: '/users/:id',
      name: 'user-detail',
      component: () => import('../views/admin/UserDetailView.vue'),
      meta: { requiresAuth: true, permission: 'user.view' },
    },
    {
      path: '/assets',
      name: 'assets',
      component: () => import('../views/assets/AssetListView.vue'),
      meta: { requiresAuth: true, permission: 'asset.view' },
    },
    {
      path: '/asset-scan',
      name: 'asset-qr-scan',
      component: () => import('../views/assets/AssetQrScanView.vue'),
      meta: { requiresAuth: true, permission: 'asset.view' },
    },
    {
      path: '/qr/:qrCode',
      name: 'qr-entry',
      component: () => import('../views/assets/AssetQrEntryView.vue'),
      meta: { requiresAuth: true, permission: 'asset.view' },
    },
    {
      path: '/assets/new',
      name: 'asset-create',
      component: () => import('../views/assets/AssetFormView.vue'),
      meta: { requiresAuth: true, permission: 'asset.create' },
    },
    {
      path: '/assets/:id/edit',
      name: 'asset-edit',
      component: () => import('../views/assets/AssetFormView.vue'),
      meta: { requiresAuth: true, permission: 'asset.update' },
    },
    {
      path: '/assets/:id',
      name: 'asset-detail',
      component: () => import('../views/assets/AssetDetailView.vue'),
      meta: { requiresAuth: true, permission: 'asset.view' },
    },
    {
      path: '/borrow-requests/new',
      name: 'borrow-request-create',
      component: () => import('../views/borrow/BorrowRequestCreateView.vue'),
      meta: { requiresAuth: true, permission: 'borrow_request.create' },
    },
    {
      path: '/borrow-requests',
      name: 'my-requests',
      component: () => import('../views/borrow/MyRequestsView.vue'),
      meta: { requiresAuth: true, permission: 'borrow_request.view_own' },
    },
    {
      path: '/borrow-requests/:id',
      name: 'borrow-request-detail',
      component: () => import('../views/borrow/BorrowRequestDetailView.vue'),
      meta: { requiresAuth: true, permission: 'borrow_request.view_own' },
    },
    {
      path: '/approval-queue',
      name: 'approval-queue',
      component: () => import('../views/borrow/ApprovalQueueView.vue'),
      meta: { requiresAuth: true, permission: 'borrow_request.view_all' },
    },
    {
      path: '/approval-queue/:id',
      name: 'approval-detail',
      component: () => import('../views/borrow/ApprovalDetailView.vue'),
      meta: { requiresAuth: true, permission: 'borrow_request.view_all' },
    },
    {
      path: '/handover-return',
      name: 'handover-return',
      component: () => import('../views/borrow/HandoverReturnView.vue'),
      meta: { requiresAuth: true, permissionsAny: ['asset.checkout', 'asset.checkin'] },
    },
    {
      path: '/borrowing-activity',
      name: 'borrowing-activity',
      component: () => import('../views/borrow/BorrowingActivityView.vue'),
      meta: { requiresAuth: true, permissionsAny: ['borrow_history.view_own', 'borrow_history.view_all'] },
    },
    {
      path: '/administration',
      name: 'administration',
      component: () => import('../views/administration/AdministrationIndexView.vue'),
      meta: {
        requiresAuth: true,
        permissionsAny: ['user.view', 'user_registration.review', 'role.view', 'role.assign', 'department.view'],
      },
    },
    {
      path: '/registration-requests',
      name: 'registration-requests',
      component: () => import('../views/administration/RegistrationRequestListView.vue'),
      meta: { requiresAuth: true, permission: 'user_registration.review' },
    },
    {
      path: '/registration-requests/:id',
      name: 'registration-request-detail',
      component: () => import('../views/administration/RegistrationRequestDetailView.vue'),
      meta: { requiresAuth: true, permission: 'user_registration.review' },
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('../views/administration/RoleListView.vue'),
      meta: { requiresAuth: true, permissionsAny: ['role.view', 'role.assign', 'user_registration.review'] },
    },
    {
      path: '/roles/new',
      name: 'role-create',
      component: () => import('../views/administration/RoleFormView.vue'),
      meta: { requiresAuth: true, permission: 'role.create' },
    },
    {
      path: '/roles/:id',
      name: 'role-detail',
      component: () => import('../views/administration/RoleFormView.vue'),
      meta: { requiresAuth: true, permission: 'role.view' },
    },
    {
      path: '/departments',
      name: 'departments',
      component: () => import('../views/administration/DepartmentListView.vue'),
      meta: { requiresAuth: true, permissionsAny: ['department.view', 'user_registration.review'] },
    },
    {
      path: '/borrowing-activity/:id',
      name: 'borrowing-activity-detail',
      component: () => import('../views/borrow/BorrowingActivityDetailView.vue'),
      meta: { requiresAuth: true, permissionsAny: ['borrow_history.view_own', 'borrow_history.view_all'] },
    },
    {
      path: '/asset-catalog',
      name: 'asset-catalog',
      component: () => import('../views/assets/AssetCatalogView.vue'),
      meta: {
        requiresAuth: true,
        permissionsAny: [
          'brand.create', 'brand.update',
          'asset_type.create', 'asset_type.update',
          'asset_model.create', 'asset_model.update',
        ],
      },
    },
    {
      path: '/asset-issues',
      name: 'asset-issues',
      component: () => import('../views/issues/AssetIssueListView.vue'),
      meta: { requiresAuth: true, permission: 'asset_issue.view' },
    },
    {
      path: '/asset-issues/:id',
      name: 'asset-issue-detail',
      component: () => import('../views/issues/AssetIssueDetailView.vue'),
      meta: { requiresAuth: true, permission: 'asset_issue.view' },
    },
    {
      path: '/vendors',
      name: 'vendors',
      component: () => import('../views/vendors/VendorListView.vue'),
      meta: { requiresAuth: true, permission: 'vendor.view' },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../views/notifications/NotificationCenterView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/CartItem',
      name: 'CartItem',
      component: () => import('../views/train/components/SearchBar.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const appStore = useAppStore()
  const authStore = useAuthStore()
  appStore.setLoading(true)
  await authStore.restoreSession()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    const fallback = [
      { name: 'dashboard', permission: 'dashboard.view' },
      { name: 'assets', permission: 'asset.view' },
      { name: 'users', permission: 'user.view' },
      { name: 'registration-requests', permission: 'user_registration.review' },
      { name: 'roles', permission: 'role.view' },
      { name: 'departments', permission: 'department.view' },
    ].find((item) => item.name !== to.name && authStore.hasPermission(item.permission))

    return fallback ? { name: fallback.name } : { name: 'main' }
  }

  if (to.meta.permissionsAny && !to.meta.permissionsAny.some((code) => authStore.hasPermission(code))) {
    return authStore.hasPermission('dashboard.view') ? { name: 'dashboard' } : { name: 'main' }
  }

  return true
})

router.afterEach(() => {
  const appStore = useAppStore()
  appStore.setLoading(false)
})

export default router
