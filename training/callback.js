


// console.log('1');
// console.log('2');
// console.log('3');

// const user = {
//     id: 10,
//     name: "tuyen"
// };

// const fetchVNeID = (callback) => {
//   console.log("Fetching user from VNeID...");
//   callback(user);
//   console.log("Done fetching user from VNeID.");
// }

// fetchVNeID((tuyen) => {
//     console.log("User fetched from VNeID: ", tuyen.id);
// })


// viết hàm tính toán

const caculator = (a,b,callback) =>{
   let result = callback(a,b);
   console.log("Kết quả: ", result);
}

const add = (a,b) => a + b;

caculator(5,10,add);

// Giả lập lấy dữ liệu người dùng

const tuyen ={
  id : 1,
  name : "tuyen"
}

const fetchUser = (fetchData) =>{
  console.log("Đang lấy dữ liệu người dùng...");
  setTimeout(() => {
  fetchData(tuyen);
  },3000);
}

fetchUser(() => {
  console.log("Dữ liệu người dùng đã được lấy: ", tuyen);
})