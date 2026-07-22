<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthLayout from '../../components/layout/AuthLayout.vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loginUser = reactive({
  username: '',
  password: '',
})

const errors = reactive({
  username: '',
  password: '',
  form: '',
})

const showPassword = ref(false)
const showRecoveryHint = ref(false)

const registrationSuccess = computed(() => route.query.registered === '1')

const clearFieldError = (field) => {
  errors[field] = ''
  errors.form = ''
}

const validateField = (field) => {
  if (field === 'username') {
    errors.username = loginUser.username.trim() ? '' : 'Vui lòng nhập tên đăng nhập.'
  }

  if (field === 'password') {
    errors.password = loginUser.password ? '' : 'Vui lòng nhập mật khẩu.'
  }
}

const handleLogin = () => {
  validateField('username')
  validateField('password')
  errors.form = ''

  if (errors.username || errors.password) return

  if (loginUser.username.trim() === 'admin' && loginUser.password === '123456') {
    authStore.login()

    const redirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : null

    router.push(redirect || { name: 'dashboard' })
    return
  }

  errors.form = 'Tên đăng nhập hoặc mật khẩu chưa đúng. Hãy dùng tài khoản demo bên dưới.'
}
</script>

<template>
  <AuthLayout>
    <div class="auth-panel">
      <header class="auth-heading">
        <p class="auth-heading__eyebrow">Chào mừng trở lại</p>
        <h2>Đăng nhập</h2>
        <p class="auth-heading__description">
          Sử dụng tài khoản nội bộ để tiếp tục vào hệ thống.
        </p>
      </header>

      <div
        v-if="registrationSuccess"
        class="auth-alert auth-alert--success"
        role="status"
      >
        Thông tin đăng ký đã được ghi nhận trên giao diện. Bạn có thể dùng tài
        khoản demo để đăng nhập.
      </div>

      <div
        v-if="errors.form"
        class="auth-alert auth-alert--error"
        role="alert"
      >
        {{ errors.form }}
      </div>

      <form class="auth-form" novalidate @submit.prevent="handleLogin">
        <div class="auth-field">
          <label class="auth-field__label" for="login-username">
            Tên đăng nhập
          </label>
          <div class="auth-field__control">
            <input
              id="login-username"
              v-model="loginUser.username"
              class="auth-field__input"
              type="text"
              name="username"
              autocomplete="username"
              placeholder="Nhập tên đăng nhập"
              :aria-invalid="Boolean(errors.username)"
              aria-describedby="login-username-message"
              @blur="validateField('username')"
              @input="clearFieldError('username')"
            />
          </div>
          <p
            id="login-username-message"
            class="auth-field__message"
            aria-live="polite"
          >
            {{ errors.username }}
          </p>
        </div>

        <div class="auth-field">
          <label class="auth-field__label" for="login-password">
            Mật khẩu
          </label>
          <div class="auth-field__control">
            <input
              id="login-password"
              v-model="loginUser.password"
              class="auth-field__input auth-field__input--password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              placeholder="Nhập mật khẩu"
              :aria-invalid="Boolean(errors.password)"
              aria-describedby="login-password-message"
              @blur="validateField('password')"
              @input="clearFieldError('password')"
            />
            <button
              class="auth-field__toggle"
              type="button"
              :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ẩn' : 'Hiện' }}
            </button>
          </div>
          <p
            id="login-password-message"
            class="auth-field__message"
            aria-live="polite"
          >
            {{ errors.password }}
          </p>
        </div>

        <div class="auth-form__options">
          <button
            class="auth-link--button"
            type="button"
            :aria-expanded="showRecoveryHint"
            @click="showRecoveryHint = !showRecoveryHint"
          >
            Quên mật khẩu?
          </button>
        </div>

        <div
          v-if="showRecoveryHint"
          class="auth-alert auth-alert--info"
          role="status"
        >
          Bản giao diện hiện chưa kết nối backend. Vui lòng liên hệ quản trị viên
          để được cấp lại mật khẩu.
        </div>

        <button class="auth-submit" type="submit">Đăng nhập</button>
      </form>

      <div class="auth-demo" aria-label="Thông tin tài khoản demo">
        <strong>Tài khoản demo:</strong>
        <code>admin</code>
        <span>/</span>
        <code>123456</code>
      </div>

      <p class="auth-switch">
        Chưa có tài khoản?
        <RouterLink class="auth-link" :to="{ name: 'register' }">
          Đăng ký
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
