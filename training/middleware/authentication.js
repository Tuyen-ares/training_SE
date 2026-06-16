const express = require('express');
const app = express();

app.use(express.json());
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if(!authHeader){
    return res.status(401).json({message: 'Unauthorized'});
  }
  //get token
  const token = authHeader.split(' ')[1];

  //verify token
  if(token === 'secret-token'){
    req.data = {id: 1, name: 'John Doe'};
    next();
  }else{
    console.log('Invalid token: ', token);
    return res.status(403).json({message: 'Invalid token'});
  }
}

app.get('/api/protected', authenticate, (req, res) => {
  res.json({message: 'This is a protected route', data: req.data});
});

app.listen(3000, () => {
  console.log('Server is running on port 3000 : http://localhost:3000');
});