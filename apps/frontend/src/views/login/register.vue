<script setup>
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthLayout from '../../components/layout/AuthLayout.vue'

const router = useRouter()
const isSubmitting = ref(false)

const registration = reactive({
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
})

const errors = reactive({
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: '',
})

const clearFieldError = (field) => {
  errors[field] = ''

  if (field === 'password' && registration.confirmPassword) {
    errors.confirmPassword = ''
  }
}

const validateField = (field) => {
  if (field === 'fullName') {
    errors.fullName = registration.fullName.trim().length >= 2
      ? ''
      : 'Enter at least 2 characters.'
  }

  if (field === 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    errors.email = emailPattern.test(registration.email.trim())
      ? ''
      : 'Enter a valid email address.'
  }

  if (field === 'phone') {
    errors.phone = /^\d{10}$/.test(registration.phone.trim())
      ? ''
      : 'Enter a 10-digit phone number.'
  }

  if (field === 'password') {
    errors.password = registration.password.length >= 6
      ? ''
      : 'Use at least 6 characters.'
  }

  if (field === 'confirmPassword') {
    errors.confirmPassword = registration.confirmPassword === registration.password
      && registration.confirmPassword
      ? ''
      : 'Passwords do not match.'
  }

  if (field === 'acceptedTerms') {
    errors.acceptedTerms = registration.acceptedTerms
      ? ''
      : 'Confirm that the information is accurate.'
  }
}

const handleRegister = async () => {
  const fields = [
    'fullName',
    'email',
    'phone',
    'password',
    'confirmPassword',
    'acceptedTerms',
  ]

  fields.forEach(validateField)
  if (fields.some((field) => errors[field])) return

  isSubmitting.value = true
  try {
    message.success('Your registration request is ready for review.')
    await router.push({
      name: 'login',
      query: { registration: 'pending' },
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div>
      <a-typography-title :level="2" class="auth-page__title">Create an Account</a-typography-title>
      <a-typography-paragraph type="secondary" class="auth-page__intro">
        Submit your details for review. Access is assigned after approval.
      </a-typography-paragraph>

      <a-form layout="vertical" @submit.prevent="handleRegister">
        <div class="auth-page__fields">
          <a-form-item
            label="Full name"
            :validate-status="errors.fullName ? 'error' : undefined"
            :help="errors.fullName || undefined"
          >
            <a-input
              v-model:value="registration.fullName"
              autocomplete="name"
              placeholder="Alex Morgan"
              @blur="validateField('fullName')"
              @input="clearFieldError('fullName')"
            />
          </a-form-item>

          <a-form-item
            label="Work email"
            :validate-status="errors.email ? 'error' : undefined"
            :help="errors.email || undefined"
          >
            <a-input
              v-model:value="registration.email"
              autocomplete="email"
              placeholder="alex@company.com"
              @blur="validateField('email')"
              @input="clearFieldError('email')"
            />
          </a-form-item>

          <a-form-item
            label="Phone number"
            :validate-status="errors.phone ? 'error' : undefined"
            :help="errors.phone || undefined"
          >
            <a-input
              v-model:value="registration.phone"
              autocomplete="tel"
              inputmode="numeric"
              placeholder="0123456789"
              @blur="validateField('phone')"
              @input="clearFieldError('phone')"
            />
          </a-form-item>

          <a-form-item
            label="Password"
            :validate-status="errors.password ? 'error' : undefined"
            :help="errors.password || undefined"
          >
            <a-input-password
              v-model:value="registration.password"
              autocomplete="new-password"
              placeholder="Create a password"
              @blur="validateField('password')"
              @input="clearFieldError('password')"
            />
          </a-form-item>

          <a-form-item
            label="Confirm password"
            :validate-status="errors.confirmPassword ? 'error' : undefined"
            :help="errors.confirmPassword || undefined"
          >
            <a-input-password
              v-model:value="registration.confirmPassword"
              autocomplete="new-password"
              placeholder="Enter your password again"
              @blur="validateField('confirmPassword')"
              @input="clearFieldError('confirmPassword')"
            />
          </a-form-item>
        </div>

        <p class="auth-page__password-hint">Use at least 6 characters.</p>

        <a-form-item
          :validate-status="errors.acceptedTerms ? 'error' : undefined"
          :help="errors.acceptedTerms || undefined"
        >
          <a-checkbox
            v-model:checked="registration.acceptedTerms"
            @change="clearFieldError('acceptedTerms')"
          >
            I confirm that this information is accurate and I will follow the
            internal system-use policy.
          </a-checkbox>
        </a-form-item>

        <a-button type="primary" html-type="submit" block :loading="isSubmitting">
          Sign Up
        </a-button>
      </a-form>

      <a-typography-paragraph class="auth-page__switch">
        Already have an account?
        <RouterLink :to="{ name: 'login' }">Login now</RouterLink>
      </a-typography-paragraph>
      <a-typography-paragraph type="secondary" class="auth-page__legal">
        © BigIn Asset Management
      </a-typography-paragraph>
    </div>
  </AuthLayout>
</template>

<style scoped>
.auth-page__title { font-size: 24px; line-height: 32px; margin-bottom: 2px !important; }
.auth-page__intro { font-size: 12px; line-height: 18px; margin-bottom: 20px; }
.auth-page__fields { display: block; }
.auth-page__password-hint { color: var(--ant-color-text-secondary); font-size: 11px; line-height: 16px; margin: -16px 0 16px; }
.auth-page__switch { font-size: 12px; margin-top: 24px; text-align: center; }
.auth-page__legal { font-size: 10px; margin-top: 28px; text-align: center; }
</style>
