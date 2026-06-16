const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const validateUserCreation = (req, res, next) => {
  const { username, password, email } = req.body;
  if(!username || username.Length < 3){
    return res.status(400).json({message: 'Username must be at least 3 characters'});
  } 
  if(!password || password.Length < 6){
    return res.status(400).json({message: 'Password must be at least 6 characters'});
  }
  if(!email || !email.includes('@')){
    return res.status(400).json({message: 'Valid email is required'});
  }
  next();
}

app.post('/api/users', validateUserCreation, (req, res) => {
  res.status(201).json({message: 'User created successfully', data: req.body});
});

app.listen(3000, () => {
  console.log('Server is running on port 3000 : http://localhost:3000');
});