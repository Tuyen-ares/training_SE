<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useAuthStore } from '../../stores/auth'
import { reportAssetIssue } from '../../services/assets/asset.service'

const props = defineProps({
  assetId: { type: Number, required: true },
})
const emit = defineEmits(['close', 'reported'])
const authStore = useAuthStore()
const description = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const remaining = computed(() => 1000 - description.value.length)

async function submit() {
  const value = description.value.trim()
  if (!value) {
    errorMessage.value = 'Vui lòng mô tả sự cố.'
    return
  }

  submitting.value = true
  errorMessage.value = ''
  try {
    await reportAssetIssue(authStore.api, props.assetId, value)
    message.success('Đã gửi báo cáo sự cố.')
    emit('reported')
    emit('close')
  } catch (error) {
    if (error.status === 403) errorMessage.value = 'Bạn không có quyền báo sự cố cho thiết bị này.'
    else if (error.status === 404) errorMessage.value = 'Thiết bị không còn tồn tại.'
    else if (error.status === 400) errorMessage.value = error.details?.description?.[0] || 'Mô tả sự cố chưa hợp lệ.'
    else errorMessage.value = error.message || 'Không thể gửi báo cáo. Vui lòng thử lại.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <a-modal
    :open="true"
    wrap-class-name="bigin-modal-content"
    title="Báo sự cố"
    :confirm-loading="submitting"
    ok-text="Gửi báo cáo"
    cancel-text="Hủy"
    @ok="submit"
    @cancel="emit('close')"
  >
    <a-form layout="vertical" @submit.prevent="submit">
      <a-form-item label="Mô tả sự cố" :validate-status="errorMessage ? 'error' : ''" :help="errorMessage || `${remaining} ký tự còn lại`">
        <a-textarea
          v-model:value="description"
          :disabled="submitting"
          :maxlength="1000"
          :auto-size="{ minRows: 5, maxRows: 10 }"
          show-count
          aria-describedby="issue-description-help"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
