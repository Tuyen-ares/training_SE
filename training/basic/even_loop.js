console.log("Start");
console.log("1");
console.log("2");

setTimeout(() => {
    console.log("3.5");
}, 1000);


const user = () => {
   const user = { id : 10,
    name:"tuyen"
     };
    return user;
}

const fetchVNeID = (call) =>{
    console.log("Fetching user from VNeID...");
    call(user());
}

 fetchVNeID = (user) => {
    console.log("User fetched from VNeID: ", user);
    return console.log("đây là user.id: ", user.id);

};

console.log("3");
console.log("4");