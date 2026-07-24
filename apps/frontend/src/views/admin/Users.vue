<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const users = ref([])
const departments = ref([])
const roles = ref([])
const statusFilter = ref('all')
const isLoading = ref(true)
const isSubmitting = ref(false)
const loadError = ref('')
const formError = ref('')
const successMessage = ref('')
const showCreateDialog = ref(false)

const canCreate = computed(() => authStore.hasPermission('user.create'))
const canUpdate = computed(() => authStore.hasPermission('user.update'))
const canDelete = computed(() => authStore.hasPermission('user.delete'))
const canAssignRoles = computed(() => authStore.hasPermission('role.assign'))

const form = reactive({
  name: '',
  email: '',
  phone: '',
  departmentId: '',
  password: '',
  confirmPassword: '',
  roleIds: [],
})

const resetForm = () => {
  Object.assign(form, {
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    password: '',
    confirmPassword: '',
    roleIds: [],
  })
  formError.value = ''
}

const loadUsers = async () => {
  users.value = await authStore.api(`/users?status=${statusFilter.value}`)
}

const loadPage = async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    const requests = [
      loadUsers(),
      authStore.api('/departments'),
    ]
    if (canAssignRoles.value) {
      requests.push(authStore.api('/rbac/roles'))
    }

    const [, departmentData, roleData = []] = await Promise.all(requests)
    departments.value = departmentData
    roles.value = roleData
  } catch (error) {
    loadError.value = error.status === 403
      ? 'Bạn chưa có đủ quyền để tải dữ liệu hỗ trợ của màn hình người dùng.'
      : 'Không thể tải danh sách người dùng. Vui lòng thử lại.'
  } finally {
    isLoading.value = false
  }
}

const openCreateDialog = () => {
  resetForm()
  showCreateDialog.value = true
}

const closeCreateDialog = () => {
  if (isSubmitting.value) return
  showCreateDialog.value = false
  resetForm()
}

const toggleRole = (roleId) => {
  const index = form.roleIds.indexOf(roleId)
  if (index >= 0) {
    form.roleIds.splice(index, 1)
  } else {
    form.roleIds.push(roleId)
  }
}

const createUser = async () => {
  formError.value = ''
  successMessage.value = ''

  if (form.password !== form.confirmPassword) {
    formError.value = 'Mật khẩu xác nhận chưa khớp.'
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      departmentId: Number(form.departmentId),
      password: form.password,
      ...(canAssignRoles.value && form.roleIds.length > 0
        ? { roleIds: [...form.roleIds] }
        : {}),
    }

    await authStore.api('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    showCreateDialog.value = false
    successMessage.value = form.roleIds.length > 0
      ? 'Đã tạo người dùng và gán vai trò đã chọn.'
      : 'Đã tạo người dùng với vai trò mặc định staff.'
    resetForm()
    await loadUsers()
  } catch (error) {
    if (error.status === 409) {
      formError.value = error.message
    } else if (error.status === 400) {
      formError.value = 'Thông tin chưa hợp lệ. Hãy kiểm tra phòng ban, vai trò và dữ liệu nhập.'
    } else if (error.status === 403) {
      formError.value = 'Bạn không có quyền gán vai trò đã chọn.'
    } else {
      formError.value = 'Không thể tạo người dùng lúc này.'
    }
  } finally {
    isSubmitting.value = false
  }
}

const deactivateUser = async (user) => {
  const confirmed = window.confirm(
    `Ngừng hoạt động tài khoản ${user.name}? Các phiên refresh token sẽ bị thu hồi.`,
  )
  if (!confirmed) return

  try {
    await authStore.api(`/users/${user.id}`, { method: 'DELETE' })
    successMessage.value = `Đã ngừng tài khoản ${user.name}.`
    await loadUsers()
  } catch {
    loadError.value = 'Không thể ngừng tài khoản. Vui lòng thử lại.'
  }
}

const activateUser = async (user) => {
  try {
    await authStore.api(`/users/${user.id}/activate`, { method: 'PATCH' })
    successMessage.value = `Đã kích hoạt lại tài khoản ${user.name}.`
    await loadUsers()
  } catch {
    loadError.value = 'Không thể kích hoạt tài khoản. Vui lòng thử lại.'
  }
}

const logout = async () => {
  await authStore.logout()
  await router.push({ name: 'login' })
}

watch(statusFilter, () => {
  void loadPage()
})
onMounted(() => {
  void loadPage()
})
</script>

<template>
  <div class="users-page">
    <header class="topbar">
      <RouterLink class="brand" :to="{ name: 'dashboard' }">
        <span class="brand__mark">BI</span>
        <span>BigIn Asset</span>
      </RouterLink>
      <nav class="topbar__actions" aria-label="Điều hướng tài khoản">
        <span>{{ authStore.user?.name }}</span>
        <button type="button" class="button button--quiet" @click="logout">
          Đăng xuất
        </button>
      </nav>
    </header>

    <main class="page-shell">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Quản trị hệ thống</p>
          <h1>Người dùng</h1>
          <p>Quản lý tài khoản, phòng ban, trạng thái hoạt động và vai trò ban đầu.</p>
        </div>
        <button
          v-if="canCreate"
          type="button"
          class="button button--primary"
          @click="openCreateDialog"
        >
          Thêm người dùng
        </button>
      </div>

      <div v-if="successMessage" class="notice notice--success" role="status">
        {{ successMessage }}
      </div>

      <section class="panel" aria-labelledby="users-list-title">
        <div class="panel__header">
          <div>
            <h2 id="users-list-title">Danh sách tài khoản</h2>
            <p>Password và password hash không được trả về màn hình này.</p>
          </div>
          <label class="filter">
            <span>Trạng thái</span>
            <select v-model="statusFilter">
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã ngừng</option>
            </select>
          </label>
        </div>

        <div v-if="loadError" class="notice notice--error" role="alert">
          <span>{{ loadError }}</span>
          <button type="button" class="text-button" @click="loadPage">Thử lại</button>
        </div>

        <div v-if="isLoading" class="loading" role="status">
          Đang tải danh sách người dùng…
        </div>

        <div v-else-if="!users.length && !loadError" class="empty-state">
          <h3>Chưa có người dùng phù hợp</h3>
          <p>Đổi bộ lọc trạng thái hoặc tạo tài khoản mới.</p>
        </div>

        <div v-else-if="users.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Liên hệ</th>
                <th>Phòng ban</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th class="actions-column">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <strong>{{ user.name }}</strong>
                  <small>#{{ user.id }}</small>
                </td>
                <td>
                  <span>{{ user.email }}</span>
                  <small>{{ user.phone }}</small>
                </td>
                <td>{{ user.department.name }}</td>
                <td>
                  <div class="badges">
                    <span
                      v-for="role in user.roles"
                      :key="role.id"
                      class="badge"
                    >
                      {{ role.name }}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    class="status"
                    :class="user.isActive ? 'status--active' : 'status--inactive'"
                  >
                    {{ user.isActive ? 'Hoạt động' : 'Đã ngừng' }}
                  </span>
                </td>
                <td class="row-actions">
                  <button
                    v-if="user.isActive && canDelete"
                    type="button"
                    class="text-button text-button--danger"
                    @click="deactivateUser(user)"
                  >
                    Ngừng
                  </button>
                  <button
                    v-if="!user.isActive && canUpdate"
                    type="button"
                    class="text-button"
                    @click="activateUser(user)"
                  >
                    Kích hoạt
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <div
      v-if="showCreateDialog"
      class="dialog-backdrop"
      role="presentation"
      @click.self="closeCreateDialog"
    >
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
      >
        <div class="dialog__header">
          <div>
            <p class="eyebrow">Tài khoản mới</p>
            <h2 id="create-user-title">Thêm người dùng</h2>
          </div>
          <button
            type="button"
            class="icon-button"
            aria-label="Đóng"
            @click="closeCreateDialog"
          >
            ×
          </button>
        </div>

        <form class="user-form" @submit.prevent="createUser">
          <div v-if="formError" class="notice notice--error" role="alert">
            {{ formError }}
          </div>

          <label>
            <span>Họ và tên</span>
            <input v-model="form.name" required maxlength="30" autocomplete="name" />
          </label>

          <div class="form-grid">
            <label>
              <span>Email</span>
              <input
                v-model="form.email"
                required
                maxlength="40"
                type="email"
                autocomplete="email"
              />
            </label>
            <label>
              <span>Số điện thoại</span>
              <input
                v-model="form.phone"
                required
                pattern="[0-9]{10}"
                maxlength="10"
                inputmode="numeric"
                autocomplete="tel"
              />
            </label>
          </div>

          <label>
            <span>Phòng ban</span>
            <select v-model="form.departmentId" required>
              <option disabled value="">Chọn phòng ban</option>
              <option
                v-for="department in departments"
                :key="department.id"
                :value="department.id"
              >
                {{ department.name }}
              </option>
            </select>
          </label>

          <div class="form-grid">
            <label>
              <span>Mật khẩu</span>
              <input
                v-model="form.password"
                required
                minlength="6"
                maxlength="72"
                type="password"
                autocomplete="new-password"
              />
            </label>
            <label>
              <span>Xác nhận mật khẩu</span>
              <input
                v-model="form.confirmPassword"
                required
                minlength="6"
                maxlength="72"
                type="password"
                autocomplete="new-password"
              />
            </label>
          </div>

          <fieldset v-if="canAssignRoles" class="role-fieldset">
            <legend>Vai trò ban đầu</legend>
            <p>Nếu không chọn vai trò, backend tự gán <strong>staff</strong>.</p>
            <label
              v-for="role in roles"
              :key="role.id"
              class="role-option"
            >
              <input
                type="checkbox"
                :checked="form.roleIds.includes(role.id)"
                @change="toggleRole(role.id)"
              />
              <span>{{ role.name }}</span>
            </label>
          </fieldset>

          <div v-else class="role-default">
            Tài khoản sẽ được gán vai trò mặc định <strong>staff</strong>.
          </div>

          <div class="dialog__actions">
            <button
              type="button"
              class="button button--quiet"
              :disabled="isSubmitting"
              @click="closeCreateDialog"
            >
              Hủy
            </button>
            <button
              type="submit"
              class="button button--primary"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Đang tạo…' : 'Tạo người dùng' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.users-page {
  min-height: 100vh;
  color: #172033;
  background: #f4f6f9;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 0 32px;
  color: #fff;
  background: #172033;
}

.brand,
.topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand {
  font-weight: 700;
}

.brand__mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #2f6fed;
}

.page-shell {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 40px 0;
}

.page-heading,
.panel__header,
.dialog__header,
.dialog__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.page-heading {
  margin-bottom: 24px;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: 30px;
}

h2 {
  margin-bottom: 4px;
}

.page-heading p,
.panel__header p,
.role-fieldset p {
  margin-bottom: 0;
  color: #667085;
}

.eyebrow {
  margin-bottom: 6px;
  color: #2f6fed;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel {
  overflow: hidden;
  border: 1px solid #e2e7ef;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(16 24 40 / 5%);
}

.panel__header {
  padding: 22px 24px;
  border-bottom: 1px solid #e8ecf2;
}

.filter {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 13px;
  font-weight: 600;
}

select,
input {
  min-height: 42px;
  padding: 9px 11px;
  border: 1px solid #cfd6e2;
  border-radius: 8px;
  color: #172033;
  background: #fff;
  font: inherit;
}

select:focus-visible,
input:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 3px solid rgb(47 111 237 / 30%);
  outline-offset: 2px;
}

.button {
  min-height: 40px;
  padding: 9px 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.button--primary {
  color: #fff;
  background: #2f6fed;
}

.button--quiet {
  border-color: #d7dde7;
  color: inherit;
  background: transparent;
}

.topbar .button--quiet {
  border-color: #647088;
}

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 9px;
}

.notice--success {
  border: 1px solid #a8dfc1;
  color: #146c43;
  background: #eefaf3;
}

.notice--error {
  border: 1px solid #f1b4b7;
  color: #9c2a31;
  background: #fff4f4;
}

.panel > .notice {
  margin: 16px 24px;
}

.loading,
.empty-state {
  padding: 56px 24px;
  text-align: center;
  color: #667085;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 15px 18px;
  border-bottom: 1px solid #edf0f5;
  text-align: left;
  vertical-align: middle;
}

th {
  color: #667085;
  background: #fafbfc;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

td strong,
td span,
td small {
  display: block;
}

td small {
  margin-top: 4px;
  color: #7a8497;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge,
.status {
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.badge {
  color: #304b85;
  background: #eaf0ff;
}

.status--active {
  color: #146c43;
  background: #e8f7ef;
}

.status--inactive {
  color: #6d4450;
  background: #f2e9ec;
}

.actions-column,
.row-actions {
  text-align: right;
}

.text-button,
.icon-button {
  padding: 4px;
  border: 0;
  color: #2f6fed;
  background: transparent;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.text-button--danger {
  color: #b4232c;
}

.dialog-backdrop {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  overflow-y: auto;
  padding: 32px 16px;
  place-items: center;
  background: rgb(17 24 39 / 55%);
}

.dialog {
  width: min(680px, 100%);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  padding: 24px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 24px 70px rgb(15 23 42 / 30%);
}

.icon-button {
  color: #667085;
  font-size: 28px;
  line-height: 1;
}

.user-form,
.user-form label {
  display: grid;
  gap: 7px;
}

.user-form {
  gap: 18px;
  margin-top: 22px;
}

.user-form label > span,
.role-fieldset legend {
  color: #344054;
  font-size: 14px;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.role-fieldset {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #dce2eb;
  border-radius: 9px;
}

.role-option {
  display: flex !important;
  grid-template-columns: none;
  align-items: center;
  gap: 9px !important;
}

.role-option input {
  width: 17px;
  min-height: auto;
  height: 17px;
}

.role-default {
  padding: 12px 14px;
  border-radius: 9px;
  color: #475467;
  background: #f5f7fa;
}

.dialog__actions {
  justify-content: flex-end;
  padding-top: 4px;
}

@media (max-width: 720px) {
  .topbar {
    padding: 0 16px;
  }

  .topbar__actions > span {
    display: none;
  }

  .page-shell {
    width: min(100% - 24px, 1180px);
    padding: 24px 0;
  }

  .page-heading,
  .panel__header {
    align-items: stretch;
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
