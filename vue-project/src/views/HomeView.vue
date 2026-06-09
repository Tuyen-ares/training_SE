<script setup>
import TheWelcome from '../components/TheWelcome.vue'
import {ref} from 'vue'

const count = ref(10);

const handleIncrease=(data)=>{
  count.value= count.value + data;
}
</script>

<template>
  <main>
    <TheWelcome :counting = "count" @handle-increase="handleIncrease"/>
  </main>
</template>
