<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthLayout from '../../components/layout/AuthLayout.vue'

const router = useRouter()
const showPassword = ref(false)

const registration = reactive({
  fullName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
})

const errors = reactive({
  fullName: '',
  email: '',
  username: '',
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
      : 'Họ và tên cần có ít nhất 2 ký tự.'
  }

  if (field === 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    errors.email = emailPattern.test(registration.email.trim())
      ? ''
      : 'Vui lòng nhập địa chỉ email hợp lệ.'
  }

  if (field === 'username') {
    const username = registration.username.trim()

    if (username.length < 4) {
      errors.username = 'Tên đăng nhập cần có ít nhất 4 ký tự.'
    } else if (!/^[A-Za-z0-9._-]+$/.test(username)) {
      errors.username = 'Chỉ dùng chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'
    } else {
      errors.username = ''
    }
  }

  if (field === 'password') {
    errors.password = registration.password.length >= 6
      ? ''
      : 'Mật khẩu cần có ít nhất 6 ký tự.'
  }

  if (field === 'confirmPassword') {
    errors.confirmPassword = registration.confirmPassword === registration.password
      && registration.confirmPassword
      ? ''
      : 'Mật khẩu xác nhận chưa khớp.'
  }

  if (field === 'acceptedTerms') {
    errors.acceptedTerms = registration.acceptedTerms
      ? ''
      : 'Bạn cần xác nhận điều khoản sử dụng nội bộ.'
  }
}

const handleRegister = () => {
  const fields = [
    'fullName',
    'email',
    'username',
    'password',
    'confirmPassword',
    'acceptedTerms',
  ]

  fields.forEach(validateField)

  if (fields.some((field) => errors[field])) return

  router.push({
    name: 'login',
    query: { registered: '1' },
  })
}
</script>

<template>
  <AuthLayout wide>
    <div class="auth-panel">
      <header class="auth-heading">
        <p class="auth-heading__eyebrow">Tạo hồ sơ nội bộ</p>
        <h2>Đăng ký tài khoản</h2>
        <p class="auth-heading__description">
          Hoàn tất thông tin cơ bản. Dữ liệu hiện chỉ được kiểm tra trên giao
          diện và chưa gửi tới backend.
        </p>
      </header>

      <form class="auth-form" novalidate @submit.prevent="handleRegister">
        <div class="auth-form-grid">
          <div class="auth-field">
            <label class="auth-field__label" for="register-full-name">
              Họ và tên
            </label>
            <div class="auth-field__control">
              <input
                id="register-full-name"
                v-model="registration.fullName"
                class="auth-field__input"
                type="text"
                name="name"
                autocomplete="name"
                placeholder="Nguyễn Văn An"
                :aria-invalid="Boolean(errors.fullName)"
                aria-describedby="register-full-name-message"
                @blur="validateField('fullName')"
                @input="clearFieldError('fullName')"
              />
            </div>
            <p
              id="register-full-name-message"
              class="auth-field__message"
              aria-live="polite"
            >
              {{ errors.fullName }}
            </p>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="register-email">Email</label>
            <div class="auth-field__control">
              <input
                id="register-email"
                v-model="registration.email"
                class="auth-field__input"
                type="email"
                name="email"
                autocomplete="email"
                placeholder="an@bigin.vn"
                :aria-invalid="Boolean(errors.email)"
                aria-describedby="register-email-message"
                @blur="validateField('email')"
                @input="clearFieldError('email')"
              />
            </div>
            <p
              id="register-email-message"
              class="auth-field__message"
              aria-live="polite"
            >
              {{ errors.email }}
            </p>
          </div>

          <div class="auth-field auth-field--full">
            <label class="auth-field__label" for="register-username">
              Tên đăng nhập
            </label>
            <div class="auth-field__control">
              <input
                id="register-username"
                v-model="registration.username"
                class="auth-field__input"
                type="text"
                name="username"
                autocomplete="username"
                placeholder="Ví dụ: nguyenvanan"
                :aria-invalid="Boolean(errors.username)"
                aria-describedby="register-username-message"
                @blur="validateField('username')"
                @input="clearFieldError('username')"
              />
            </div>
            <p
              id="register-username-message"
              class="auth-field__message"
              aria-live="polite"
            >
              {{ errors.username }}
            </p>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="register-password">
              Mật khẩu
            </label>
            <div class="auth-field__control">
              <input
                id="register-password"
                v-model="registration.password"
                class="auth-field__input auth-field__input--password"
                :type="showPassword ? 'text' : 'password'"
                name="new-password"
                autocomplete="new-password"
                placeholder="Tối thiểu 6 ký tự"
                :aria-invalid="Boolean(errors.password)"
                aria-describedby="register-password-message"
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
              id="register-password-message"
              class="auth-field__message"
              aria-live="polite"
            >
              {{ errors.password }}
            </p>
          </div>

          <div class="auth-field">
            <label class="auth-field__label" for="register-confirm-password">
              Xác nhận mật khẩu
            </label>
            <div class="auth-field__control">
              <input
                id="register-confirm-password"
                v-model="registration.confirmPassword"
                class="auth-field__input auth-field__input--password"
                :type="showPassword ? 'text' : 'password'"
                name="confirm-password"
                autocomplete="new-password"
                placeholder="Nhập lại mật khẩu"
                :aria-invalid="Boolean(errors.confirmPassword)"
                aria-describedby="register-confirm-password-message"
                @blur="validateField('confirmPassword')"
                @input="clearFieldError('confirmPassword')"
              />
              <button
                class="auth-field__toggle"
                type="button"
                :aria-label="showPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Ẩn' : 'Hiện' }}
              </button>
            </div>
            <p
              id="register-confirm-password-message"
              class="auth-field__message"
              aria-live="polite"
            >
              {{ errors.confirmPassword }}
            </p>
          </div>

          <div class="auth-field auth-field--full">
            <label class="auth-checkbox">
              <input
                v-model="registration.acceptedTerms"
                type="checkbox"
                :aria-invalid="Boolean(errors.acceptedTerms)"
                aria-describedby="register-terms-message"
                @change="clearFieldError('acceptedTerms')"
              />
              <span>
                Tôi xác nhận thông tin trên là chính xác và đồng ý tuân thủ quy
                định sử dụng hệ thống nội bộ.
              </span>
            </label>
            <p
              id="register-terms-message"
              class="auth-field__message"
              aria-live="polite"
            >
              {{ errors.acceptedTerms }}
            </p>
          </div>
        </div>

        <button class="auth-submit" type="submit">Hoàn tất đăng ký</button>
      </form>

      <p class="auth-switch">
        Đã có tài khoản?
        <RouterLink class="auth-link" :to="{ name: 'login' }">
          Quay lại đăng nhập
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
