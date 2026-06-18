<script setup >
  import HookTrain from './Component/hookTrain.vue'
  import {ref} from 'vue';

  const isShow = ref(true);

</script>


<template>
  <div>
    <h2>Trang chu</h2>
    <button @click="isShow = !isShow">
      {{ isShow ? 'Hủy tiêu đề' : 'Đổi tiêu đề' }}
    </button>
    <HookTrain v-if="isShow" />
  </div>
</template>

<style>
</style>