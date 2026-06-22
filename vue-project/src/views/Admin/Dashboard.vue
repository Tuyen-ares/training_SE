
<script setup>
import Footer from '../../components/layout/Footer.vue';
import Header from '../../components/layout/Header.vue';
import Sidebar from '../../components/layout/Sidebar.vue';
import { useAppStore } from '../../stores/app'
const appStore = useAppStore()
</script>

<template>
  <div class = "theme" :class="appStore.theme">
  <header>
    <Header />
</header>
  <div class="dashboard-wrapper" >

<Sidebar class="sideBar" />
<main>
  <div class="about">
  <h1>This is a Dashboard page admin</h1>
  <button @click="appStore.toggleTheme">
  Đổi màu nền (Hiện tại: {{ appStore.theme }})
</button>
</div>
</main>



 </div>
 <Footer />
 </div>
</template>

<style>
.dashboard-wrapper {
 display: flex;
  min-height: 100vh;
}

header{
  position: sticky;

}

body {
  display: flex;
  justify-content: center;
  
}

.sideBar {
 position: sticky;
}

/* light */
.theme.light {
  background-color: #ffffff;
}

/* dark */
.theme.dark {
  background-color: #1a1a1a;
  color: #ffffff;
}
</style>
