<script setup>
import { LockOutlined, MailOutlined } from '@ant-design/icons-vue'
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

const isSubmitting = ref(false)
const showRecoveryHint = ref(false)
const rememberMe = ref(false)
const registrationPending = computed(() => route.query.registration === 'pending')

const clearFieldError = (field) => {
  errors[field] = ''
  errors.form = ''
}

const validateField = (field) => {
  if (field === 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    errors.email = emailPattern.test(loginUser.email.trim())
      ? ''
      : 'Enter a valid email address.'
  }

  if (field === 'password') {
    errors.password = loginUser.password ? '' : 'Enter your password.'
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
      ? 'Your email, password, or account status could not be verified.'
      : 'We could not sign you in right now. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div>
      <a-typography-title :level="2" class="auth-page__title">Login</a-typography-title>
      <a-typography-paragraph type="secondary" class="auth-page__intro">
        Access your asset management system.
      </a-typography-paragraph>

      <a-alert
        v-if="registrationPending"
        class="auth-page__alert"
        type="success"
        show-icon
        message="Registration request submitted"
        description="Your request is pending review. You can sign in after it has been approved."
      />
      <a-alert
        v-if="errors.form"
        class="auth-page__alert"
        type="error"
        show-icon
        :message="errors.form"
      />

      <a-form layout="vertical" @submit.prevent="handleLogin">
        <a-form-item
          label="Email"
          :validate-status="errors.email ? 'error' : undefined"
          :help="errors.email || undefined"
        >
          <a-input
            v-model:value="loginUser.email"
            autocomplete="email"
            placeholder="Enter your email"
            @blur="validateField('email')"
            @input="clearFieldError('email')"
          >
            <template #prefix><MailOutlined /></template>
          </a-input>
        </a-form-item>

        <a-form-item
          :validate-status="errors.password ? 'error' : undefined"
          :help="errors.password || undefined"
        >
          <template #label>
            <div class="auth-page__password-label">
              <span>Password</span>
              <a-button type="link" html-type="button" @click="showRecoveryHint = !showRecoveryHint">Forgot password?</a-button>
            </div>
          </template>
          <a-input-password
            v-model:value="loginUser.password"
            autocomplete="current-password"
            placeholder="Enter password"
            @blur="validateField('password')"
            @input="clearFieldError('password')"
          >
            <template #prefix><LockOutlined /></template>
          </a-input-password>
        </a-form-item>

        <div class="auth-page__actions">
          <a-checkbox v-model:checked="rememberMe">Remember me</a-checkbox>
        </div>

        <a-alert
          v-if="showRecoveryHint"
          class="auth-page__alert"
          type="info"
          show-icon
          message="Contact an administrator to reset your password."
        />

        <div class="auth-page__submit">
          <a-button type="primary" html-type="submit" block :loading="isSubmitting">
            Login
          </a-button>
        </div>
      </a-form>

      <a-typography-paragraph class="auth-page__switch">
        Don't have an account?
        <RouterLink :to="{ name: 'register' }">Sign up now</RouterLink>
      </a-typography-paragraph>
      <a-typography-paragraph type="secondary" class="auth-page__legal">
        ©  BigIn Asset Management
      </a-typography-paragraph>
    </div>
  </AuthLayout>
</template>

<style scoped>
.auth-page__intro { font-size: 12px; line-height: 18px; margin-bottom: 24px; }
.auth-page__title { font-size: 24px; line-height: 32px; margin-bottom: 2px !important; }

.auth-page__alert {
  margin-bottom: 1rem;
}

.auth-page__actions { display: flex; margin-top: 2px; }

.auth-page__password-label { align-items: center; display: flex; gap: 12px; justify-content: space-between; width: 100%; }
.auth-page__password-label :deep(.ant-btn) { font-size: 12px; font-weight: 600; height: auto; line-height: 18px; padding: 0; }
.auth-page__submit { margin-top: 18px; }

.auth-page__switch { font-size: 12px; margin-top: 24px; text-align: center; }

.auth-page__legal { font-size: 10px; margin-top: 44px; text-align: center; }
</style>
