<script setup>
import {ref,reactive} from 'vue';
import { useRouter } from 'vue-router';
import {useAuthStore} from '../../stores/auth';
const loginUser = reactive({
  username: '',
  password: ''
});

// const handleLogin = () => {
//   // Handle login logic here
//   console.log('Username:', loginUser.username);
//   console.log('Password:', loginUser.password);
// };
const router = useRouter();
const authStore = useAuthStore();

const handleLogin = () => {
  if (loginUser.username === 'admin' && loginUser.password === '123456') {
    authStore.login();
    router.push({ name: 'dashboard' });
  } else {
    alert('Invalid credentials');
  }
};

</script>

<template>
  <div class="wrapper">
  <form class="login" @submit.prevent="handleLogin()">
     <div class="label"> <p>Login</p></div>
      <div class="form-group">
        <label >Username: </label>
        <input type="text" placeholder="Username" v-model="loginUser.username" required/>
      </div>
      <div class="form-group">
        <label >Password: </label>
        <input type="password" placeholder="Password" v-model="loginUser.password" required/>
      </div>
      <button type="submit">Login</button>
    </form>
  </div>
  </template>

<style>

.wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
}
.form-group label {

  justify-content: center;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  margin-right: 0.6rem;
}

.label{
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
}

.form-group input{
  padding: 0.5rem;
  border: 1px solid #4a4343;
  border-radius: 7px;
}

.login {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 30vh;
  width: 15vw;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  border-radius: 8px;
}
.form-group {
  margin-bottom: 1.5rem;
}
</style>