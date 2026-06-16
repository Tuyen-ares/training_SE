const express = require('express');
const router = express.Router();
const app = express();

app.use(express.json());

const requestLogger = (req,res,next) =>{
  const timestamp = new Date().toISOString();
  console.log(`time stamp: [${timestamp}] \n req method: ${req.method} \n req url: ${req.url}`);
  next();
}

app.use(requestLogger);


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});