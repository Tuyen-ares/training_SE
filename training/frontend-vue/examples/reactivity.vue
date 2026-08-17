<script setup >
  import { ref,reactive } from 'vue';

  // Bài tập 1: Bộ đếm bước chân (Thực hành ref cơ bản)
  const count = ref(0);
  const increment = () =>{
    console.log("count trước khi tăng: ", count.value);
    count.value++;
  };

  //bài 2
  const employees = reactive([
    { id: 1,  name: 'Tuyen', age: 30, salary: 50000, skills: ['JavaScript', 'Vue.js'] },
    { id: 2, name: 'Cuong', age: 25, salary: 40000, skills: ['Python', 'Django'] },
    { id: 3,name: 'Phu', age: 35, salary: 60000, skills: ['React', 'Node.js'] }
  ]);

  const increaseSalary = (employee) => {
    employee.salary += 1000;
  };

  const addSkill = ((employee,skill)=>{
    employee.skills.push(skill);
  });

  //bai 4
  const products = reactive([
    { id: 1, name: 'Laptop', price: 1000, quantity: 2 },
    { id: 2, name: 'Smartphone', price: 500, quantity: 3 },
    { id: 3, name: 'Headphones', price: 200, quantity: 5 }
  ]);
  const searchQuery = ref('');
  const filteredProducts= ref([...products]);


  
  const filterData = ()=>{
    const query = searchQuery.value.trim().toLowerCase();
     if(query === ''){
    filteredProducts.value = [...products];
  }else{
    filteredProducts.value = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
  }
}
</script>
<template>
  <!-- Bài 3 -->
  <div>
    <h4>Filtered Products</h4>
   
    <input v-model="searchQuery" placeholder="Search products..." />
    <p v-if = "searchQuery">search: {{ searchQuery }}</p>
     <ul>
      <li v-for="product in filteredProducts" :key="product.id">
        {{ product.name }} - ${{ product.price }} (Quantity: {{ product.quantity }})
      </li>
    </ul>
    <p v-if ="filteredProducts.length===0" style="color: red"> khong tim thay</p>
    <button @click="filterData">Filter</button>
  </div>


  <!-- Bài tập 1: Bộ đếm bước chân (Thực hành ref cơ bản) -->
   <h3> Bài tập 1: Bộ đếm bước chân (Thực hành ref cơ bản) </h3>
  <div>
    <h1>Reactivity tuyen</h1>
    <p>Count : {{count}}</p>
    <button @click="increment()">click me baby</button>
  </div>
<!--bài 2 -->
  <h3> Bài 2 Quản lý Hồ sơ Nhân viên (Thực hành reactive & Gom cụm State) </h3>
  <div>
    <ul> <h4>Danh sach nhan vien</h4></ul>
    <li v-for ="employee in employees":key="employee.id">
      <p>Name: {{employee.name}}</p>
      <p>Age: {{employee.age}}</p>
      <p>Salary: {{employee.salary}}</p>
      <p>Skills: {{employee.skills.join(', ')}}</p>
      <button @click="increaseSalary(employee)">Tang luong</button>
      <input v-model="newSkill" placeholder="Nhap ky nang moi" />
      <button @click="addSkill(employee,newSkill)">Them ky nang</button>
    </li>
  </div>

</template>

<style>
h3{
  padding-top: 20px;
  padding-bottom: 10px;
}
ul{
  
}
</style>