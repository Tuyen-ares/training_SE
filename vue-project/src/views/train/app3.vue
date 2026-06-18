
<script setup>
  import {ref} from 'vue';
  import CartItem from './Component/CartItem.vue';
  let cartItems = ref([
    { id: 1, name: 'Item 1', price: 10, quantity: 1 },
    { id: 2, name: 'Item 2', price: 20, quantity: 1 },
    { id: 3, name: 'Item 3', price: 30, quantity: 1 }
  ]);

  const increaseQuantity = (item) => {
    item.quantity++;
  };
</script>

<template>
  <div >
    <h1>This is a assets page employee</h1>
    <CartItem :cartItems="cartItems" @increase-quantity="increaseQuantity" />
  </div>
</template>

<style>

</style>
