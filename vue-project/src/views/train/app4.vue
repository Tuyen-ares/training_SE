<script setup>
  import {ref,computed} from 'vue';
  import SearchBar from './Component/SearchBar.vue';
  const products = ref([
    { id: 1, name: 'Product A', price: 10, quantity: 1 },
    { id: 2, name: 'Product B', price: 20, quantity: 2 },
    { id: 3, name: 'Product C', price: 30, quantity: 3 },
    { id: 4, name: 'iPhone', price: 40, quantity: 4 },
    { id: 5, name: 'Product E', price: 50, quantity: 5 },
    { id: 6, name: 'Oppo', price: 60, quantity: 6 },
    { id: 7, name: 'Product G', price: 70, quantity: 7 },
    { id: 8, name: 'Samsung', price: 80, quantity: 8 },
    { id: 9, name: 'Product I', price: 90, quantity: 9 },
    { id: 10, name: 'Product J', price: 100, quantity: 10 }
  ]);

  const searchQuery = ref('');
  const filteredProducts = computed(() => {
    if (!searchQuery.value) {
      return products.value;
    }
      return products.value.filter(product =>
      product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });

  const replaceSearchQuery = (newQuery) => {
    searchQuery.value = newQuery;
  };

</script>
<template>
<SearchBar :searchQuery="searchQuery" @search-product="replaceSearchQuery" />
<div>
  <ul>
    <li v-for="product in filteredProducts" :key="product.id">
      {{ product.name }} - ${{ product.price }} - Quantity: {{ product.quantity }}
    </li>
  </ul>
</div>
<p v-if ="filteredProducts.length===0"> Không tìm thấy sản phẩm nào khớp với: "{{ searchQuery }}"</p>
</template>

