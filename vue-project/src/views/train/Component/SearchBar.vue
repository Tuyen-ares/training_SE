<script setup>
  //defineProps(['searchQuery']);
 
  const emit = defineEmits(['search-product']);
  const searchProduct = (event) => {
    emit('search-product', event.target.value);
  };
</script>
<template>
  <div class="search-bar">
    <label>Search Products:</label>
    <input
      type="text"
      placeholder="Search products..."
      @input="searchProduct"
    />
  </div>
</template>

