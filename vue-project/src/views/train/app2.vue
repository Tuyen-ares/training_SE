<script setup>
  import {ref} from 'vue';
  import NotificationModal from './Component/NotificationModal.vue';
  let isOpen = ref(true);

  const toggleModal = () => {
    isOpen.value = !isOpen.value;
  }

</script>
<template>
  <div>
    <NotificationModal :show="isOpen" @close-modal="toggleModal" />
  </div>
</template>

