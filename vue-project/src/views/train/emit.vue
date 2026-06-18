<script setup>
  import {ref} from 'vue';
  import Player from './Component/player.vue'

  const tongDiem = ref(0);
  const tangDiem = () => {
    tongDiem.value++;
  }
</script>
<template>
  <div>
    <h2>Trang chu</h2>
    <p>Tổng điểm: {{ tongDiem }}</p>
    <Player name="Player 1" @tang-diem="tangDiem" />
    <Player name="Player 2" @tang-diem="tangDiem" />
  </div>
</template>

<style>

</style>