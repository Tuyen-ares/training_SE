
/*Bài tập 3: "Vòng bảo vệ kép của Giám đốc" (Chaining Middleware)
Tình huống: Trang xem lương của ban giám đốc (GET /admin/salary) là một khu vực cực kỳ nhạy cảm. Nó cần đi qua 2 lớp bảo vệ riêng biệt để dễ dàng bảo trì sau này.

Yêu cầu thực hiện:

Viết Middleware 1 (checkLogin): Kiểm tra xem Header Authorization có chứa token là Secret123 không.

Nếu ĐÚNG: Gán một thuộc tính tự chế req.user = { name: 'Sếp Tổng', role: 'ADMIN' } và cho đi tiếp.

Nếu SAI: Trả về 401 "Chưa đăng nhập!".

Viết Middleware 2 (checkRole): Lấy thông tin từ req.user (do thằng số 1 truyền sang). Kiểm tra xem role có phải là 'ADMIN' hay không.

Nếu ĐÚNG: Cho đi tiếp.

Nếu SAI: Trả về 403 "Bạn không đủ thẩm quyền xem trang này!".

Viết Route GET /admin/salary và xếp chồng cả 2 Middleware trên vào giữa Route này theo đúng thứ tự logic. Route cuối cùng trả về: "Lương tháng này là 1 Tỷ VND"
 */
const express = require('express');
const app = express();
app.use(express.json());

const checkLogin = (req,res,next) =>{
  const authHeader = req.header['authorization']; 
    if(!authHeader){
      res.status(401).json({message: 'Unauthorized'});
    }
    const token = authHeader.split(' ')[1];
    if(token === 'giam-doc-token'){
      req.user = {name : 'director', role: 'admin'};
      next();
    }else{
      res.status(401).json({message: 'chua dang nhap'});
    }
}

const checkRoleAdmin = (req,res,next) =>{
  const {name,role} = req.user;
  if(role ==='admin'){
    next();
  }else{
    res.status(403).json({message: 'ban khong du tham quyen xem trang nay'});
  }
}

app.get('/admin', checkLogin, checkRoleAdmin, (req,res) =>{
  res.json({message: 'Lương tháng này là 1 Tỷ VND'});
});

app.listen(3000, () => {
  console.log('Server is running on port 3000 : http://localhost:3000');
});