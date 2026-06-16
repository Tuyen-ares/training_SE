
const messageHH = () => new Promise((resolve,reject)=>{
  setTimeout(() => {
  resolve("Hello World");
}, 1000);
});

const getMess = async() =>{
  const result = await messageHH();
  console.log(result);
}

getMess();