const getMessage = new Promise((resolve,reject)=>{
  resolve("Hello World");
})

getMessage.then((message)=>{
  console.log(message);
})

const getCheckAge = (age) => {
  return new Promise((resolve, reject) => {
    if (age >= 18) {
      resolve("Bạn đủ tuổi để vào trang web này");
    } else {
      reject("Bạn không đủ tuổi để vào trang web này");
    }
  });
};

getCheckAge(17).then((message) => {console.log(message)}).catch(error => console.log(error));

const user = {
  id : 1,
  name : "tuyen"
}

const getUser = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(user);
  }, 3000);
})

getUser.then((tuyen)=>{
  console.log("Dữ liệu người dùng đã được lấy: ", tuyen);
})