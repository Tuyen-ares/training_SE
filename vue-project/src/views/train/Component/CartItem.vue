
<script setup>
  defineProps(['cartItems']);
  const emit = defineEmits(['increase-quantity']);
  const increaseQuantity = (item) => {
    emit('increase-quantity', item);
  };
</script>

<template>
  <div>
    <ul>
      <li v-for="item in cartItems" :key="item.id">
        {{ item.name }} - ${{ item.price }} - Quantity: {{ item.quantity }}
        <button @click="increaseQuantity(item)">Increase Quantity</button>
      </li>
    </ul>
  </div>  
</template>

<style>

</style>
