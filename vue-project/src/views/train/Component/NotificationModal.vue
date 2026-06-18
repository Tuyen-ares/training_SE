<script setup>
  defineProps(['show']);
  const emit = defineEmits(['close-modal']);
  const closeModal = () => {
    emit('close-modal');
  }
</script>
<template>
  <div>
    <h3 v-if="show">Thông báo đã mở</h3>
    
    <h3 v-else>Đã đóng thông báo</h3>
    <button @click="closeModal">an toi di</button>
  </div>
</template>

