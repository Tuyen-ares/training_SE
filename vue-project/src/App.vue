<script setup>
import { RouterLink } from 'vue-router'

</script>

<template>
  <header>
    <img src="@/assets/logo.svg" witdth="60px" height="60px" class="logo" alt="Vite logo" />
    <nav>
      <RouterLink to="/">
          <div class="btn-main">
              Home
            </div>
     </RouterLink>
     <RouterLink to="/">
        <div class="btn-action">
        Login
          </div>
      </RouterLink>
       <RouterLink to="/create">
        <div class="btn-action">
        Create
          </div>
      </RouterLink>
    </nav>
  </header>
  <router-view></router-view>
</template>

<style scoped>

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .4rem .2rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

nav {
  display: flex;
  gap: 1rem;
}

</style>
