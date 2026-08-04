<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
 <main>
    <h1>Asset Detail</h1>
    <p>Asset ID: {{ route.params.id }}</p>
  </main>
</template>

<style>

</style>
