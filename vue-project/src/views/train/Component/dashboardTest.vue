<script setup>
import {ref,onMounted, onBeforeUpdate, onUpdated, onUnmounted} from 'vue';
  let time = null;
  let cpuLoad = ref(10);

  onMounted(()=>{
    time = setInterval(()=>{
      cpuLoad.value = Math.floor(Math.random() * 91)+10;
    },500)
  })
  let isRed = ref(false);
  onBeforeUpdate(()=>{
      if(cpuLoad.value > 85){
        console.log("CPU load is high: ", cpuLoad.value);
        document.title = "CPU load is high: " + cpuLoad.value + "%";
        isRed.value = true;
      }else{isRed.value = false;
        document.title = "CPU load is normal: " + cpuLoad.value + "%";
      }
  })

  onUpdated(()=>{
    if(cpuLoad.value == 100)
     console.warn("Cảnh báo: CPU quá tải chạm đỉnh!")
     })
  onUnmounted(()=>{
    clearInterval(time);
  })
</script>
<template>
  <div>
    <h2>Dashboard hieu nang</h2>
    <p :class="{'text-danger': isRed}">CPU Load: {{ cpuLoad }}%</p>
  </div>
</template>

<style scoped>
.text-danger {
  color: red !important;
  font-weight: bold;
}
</style>