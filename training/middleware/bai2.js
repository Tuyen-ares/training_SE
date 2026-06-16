/*Bài tập 2: "Cửa hàng đồ uống có cồn" (Validation Middleware với req.body)
Tình huống: Cửa hàng của bạn có một tính năng là POST /api/buy-alcohol. Pháp luật quy định chỉ những người từ 18 tuổi trở lên mới được phép thực hiện thao tác này.

Yêu cầu thực hiện:

Setup Server có sử dụng bộ dịch JSON (express.json()).

Viết một Middleware tên là checkAge.

Khách hàng sẽ gửi lên một JSON Body gồm: {"name": "Nguyen Van A", "age": 17}.

Trong Middleware checkAge:

Nếu người dùng quên không gửi age, trả về mã lỗi 400 kèm câu chửi: "Vui lòng cung cấp tuổi!".

Nếu age < 18, chặn request lại, trả về mã lỗi 403 kèm thông báo: "Trẻ vị thành niên không được mua rượu bia!".

Nếu hợp lệ (age >= 18), cho phép đi tiếp.

Áp dụng Middleware này ĐÚNG DÀNH RIÊNG cho Route POST /api/buy-alcohol. Nếu thành công,
 Route sẽ trả về mã 200 OK kèm chữ "Giao dịch thành công!".
 */
const express = require('express');
const app = express();
app.use(express.json());

const checkAge =( (req, res, next) => {
  const {name,age} = req.body;
  if(!age){
    res.status(400).json({message: "Vui lòng cung cấp tuổi!"});
  }else if(age < 18){
    res.status(403).json({message: "Trẻ vị thành niên không được mua rượu bia!"});
  }else{
    next();
  }
});

app.post('/api/buy-alcohol',checkAge,(req,res)=>{
  res.status(200).json({message: "Giao dịch thành công!"})
})

app.listen(3000, () => {
  console.log('Server is running on port 3000 : http://localhost:3000');
});