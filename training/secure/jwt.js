const jwt = require('jsonwebtoken');
const express = require('express');

const app = express();

app.use(express.json());
/*
Luồng:
  login {
    hứng username và password
    kiểm tra password 
    nạp payload 
    đúng pass thì đi đăng ký token kèm reresh token
    đẩy làm mới lên arr
    res về 2 token đó để test
  }
    kiểm tra auth{
      bắt thằng req authorization từ headers
      kiểm tra headers 
      lấy token từ headers
      nếu hợp lệ thì verify token và attach user vào req.user
      next() để đi vào route
      nếu không hợp lệ thì res về lỗi
    }
*/
const JWT_SECRET = 'Tuyen';

const REFRESH_SECRET = 'TuyenRefresh';

const refreshTokens = [];
const user = {
  id: 1, name :'Tuyenla', role: 'admin', password: 'tuyenla'
}

//login to create token
app.post('/login',(req,res)=>{
  const {name, password} = req.body;
  if(name !== user.name || password !== user.password){
    return res.status(401).json({error: 'Invalid credentials'});
  }

  const payload = {
    id: user.id,
    name: user.name,
    role: user.role
  }
  const token = jwt.sign(payload,JWT_SECRET,{expiresIn: '30s'});
  const refreshToken = jwt.sign(payload,REFRESH_SECRET,{expiresIn: '7d'});
  refreshTokens.push(refreshToken);
  return res.json({message:'Login success', token, refreshToken});
})

//// Middleware for JWT verification
const authenticateToken = (req,res,next)=>{
  const authHeader = req.headers['authorization'];
  if(!authHeader){
    return res.status(401).json({error: 'Missing token'});
  }
  const token = authHeader.split(' ')[1];
  try{
  const decode = jwt.verify(token,JWT_SECRET);
  // Attach user to request
  req.user = decode;
  next();
  } catch(err){
    return res.status(403).json({error: 'Invalid or expired token'});
  }
}

app.post('/refreshToken',(req,res)=>{
  const {refreshToken} = req.body;
  if(!refreshToken){
    return res.status(401).json({error: 'Missing refresh token'});
  }
  if(!refreshTokens.includes(refreshToken)){
    return res.status(403).json({error: 'Invalid refresh token'});
  }
  try {
    const decode = jwt.verify(refreshToken,REFRESH_SECRET);
    const newToken = jwt.sign({id: decode.id},JWT_SECRET,{expiresIn: '30s'});
    res.json({message: 'Token refreshed', token: newToken});
  }catch(err){
    return res.status(403).json({error: 'Invalid or expired refresh token'});
  }
})

// Protected route 
app.get('/ProfileUser',authenticateToken,(req,res)=>{
  return res.json({message: 'Profile success', user: req.user});
})

// role-based access control
app.get('/admin',authenticateToken,(req,res)=>{
  if(req.user.role !=='admin'){
    return res.status(403).json({error: 'Access denied: admin role required'});
  }
  res.json({ message: 'Admin panel accessed',user : req.user });
})

app.listen(3000,()=>{
  console.log('Server running on port 3000');
})