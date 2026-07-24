<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthLayout from '../../components/layout/AuthLayout.vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loginUser = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
  form: '',
})

const showPassword = ref(false)
const showRecoveryHint = ref(false)
const isSubmitting = ref(false)

const registrationSuccess = computed(() => route.query.registered === '1')

const clearFieldError = (field) => {
  errors[field] = ''
  errors.form = ''
}

const validateField = (field) => {
  if (field === 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    errors.email = emailPattern.test(loginUser.email.trim())
      ? ''
      : 'Vui lòng nhập địa chỉ email hợp lệ.'
  }

  if (field === 'password') {
    errors.password = loginUser.password ? '' : 'Vui lòng nhập mật khẩu.'
  }
}

const handleLogin = async () => {
  validateField('email')
  validateField('password')
  errors.form = ''

  if (errors.email || errors.password) return

  isSubmitting.value = true
  try {
    await authStore.login({
      email: loginUser.email.trim(),
      password: loginUser.password,
    })
    const redirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : null

    await router.push(redirect || { name: 'dashboard' })
  } catch (error) {
    errors.form = error.status === 401
      ? 'Email hoặc mật khẩu không đúng, hoặc tài khoản đã ngừng hoạt động.'
      : 'Không thể đăng nhập lúc này. Vui lòng thử lại.'
  } finally {
    isSubmitting.value = false
  }
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
          <label class="auth-field__label" for="login-email">
            Email
          </label>
          <div class="auth-field__control">
            <input
              id="login-email"
              v-model="loginUser.email"
              class="auth-field__input"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="you@company.com"
              :aria-invalid="Boolean(errors.email)"
              aria-describedby="login-email-message"
              @blur="validateField('email')"
              @input="clearFieldError('email')"
            />
          </div>
          <p
            id="login-email-message"
            class="auth-field__message"
            aria-live="polite"
          >
            {{ errors.email }}
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

        <button class="auth-submit" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập' }}
        </button>
      </form>

      <p class="auth-switch">
        Chưa có tài khoản?
        <RouterLink class="auth-link" :to="{ name: 'register' }">
          Đăng ký
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
