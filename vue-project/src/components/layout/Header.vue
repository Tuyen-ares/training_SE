<script setup>
import {ref} from 'vue';

const username = ref('Tuyendz');
</script>
<template>
   <header>
    <img src="@/assets/logo.svg" witdth="60px" height="60px" class="logo" alt="Vite logo" />
    <nav>
      <div class="nav-item">
        <span>profile: {{ username }}</span>
      </div>
    </nav>
  </header>
</template>
<style>
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .4rem .2rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  width: 100vw;
  box-sizing: border-box;
}

nav {
  display: flex;
  gap: 1rem;

}

.nav-item {
  margin-right: 1rem;
}
span{
  font-size: 1.2rem;
  font-weight: 500;
}
</style>