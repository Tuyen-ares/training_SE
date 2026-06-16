/*
Khi người dùng mở Facebook, hệ thống phải:

Đăng nhập
↓
Lấy hồ sơ
↓
Lấy danh sách bạn bè
↓
Lấy bài viết


Output
Login Success
Profile Loaded
Friends Loaded
Posts Loaded
Yêu cầu
Promise.
async/await.
try/catch.
*/

const login = async (state) =>{
  if(state == true){ return "Login Success"; }
  else{ throw new Error("Login Failed"); }
} 

const getProfile = async() =>{
  return "Profile Loaded";
}
const listFriend = [
  "Friend 1",
  "Friend 2",
  "Friend 3"
]

const getListFriend = async() =>{
  return listFriend;
}

const post = [
  "Post 1",
  "Post 2",
  "Post 3"

]

const getPost = async() =>{
  return post;
}

const main1 = async() =>{
  try{
    const Login = await login(true);
    console.log(Login);
    const profile = await getProfile();
    console.log(profile);
    const friends = await getListFriend();
    console.log("Friends Loaded: ", friends);
    const posts = await getPost();
    console.log("Posts Loaded: ", posts);
  }
  catch(error){
    console.log(error.message);
  }
}

main1();