<template>

   <nav>
        <RouterLink to="/about/user">user</RouterLink>
   </nav>
  <div class="about">
    <h1>This is an about page</h1>
  </div>

  <!-- nested route outlet -->
  <router-view />
</template>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
