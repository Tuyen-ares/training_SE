<script setup>
defineProps(['name']);
const emit = defineEmits(['tang-diem']);
const ghiDiem =()=>{
  emit('tang-diem');
}
</script>

<template>
  <div class="card-player">
    <h3>Player: {{ name }}</h3>
    <button style="margin-left: 20px;" @click="ghiDiem">Ghi điểm</button>
  </div>
</template>

<style>
.card-player{
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  border-radius: 5px;
  width: 250px;
}
</style>