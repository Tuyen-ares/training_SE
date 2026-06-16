//promise chaining

const step1 = new Promise((resolve, reject) => {
  resolve('Step 1 completed');
});

const step2 = new Promise((resolve, reject) => {
  resolve('Step 2 completed');
});

const step3 = new Promise((resolve, reject) => {
  resolve('Step 3 completed');
});

step1.then((message)=>{
  console.log(message);
  return step2;
}).then((message)=>{
  console.log(message);
  return step3;
}).then((message)=>{
  console.log(message);
})


