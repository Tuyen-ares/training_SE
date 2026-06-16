/*
Ứng dụng cần:

Lấy thông tin người dùng.
Sau khi có người dùng mới lấy danh sách bài viết của người đó
*/

const user = {
  id : 1,
  name : "tuyen"
}

const post = [
  "JavaScript Basics",
  "Promise Tutorial"
]

const getuser = async() =>{
  return user; 
}

const getPost = async()=>{
  return post;
}

const getPostByUser = async() =>{
  const user = await getuser();
  console.log("Thông tin người dùng: ", user);
  const post = await getPost();
  console.log("Danh sách bài viết của người dùng: ", post);
}
getPostByUser();