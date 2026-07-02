const express = require('express');
const app = express();

const requestTime = function (req, res, next) {
  req.requestTime = Date.now();
   console.log(req.method, req.url);
  console.log("Request received at: " + new Date(req.requestTime).toLocaleString());
  next();
};

app.use(requestTime);

app.get('/', (req, res) => {
  let responseText = 'Hello World!<br>';
  responseText += `<small>Requested at: ${req.requestTime}</small>`;
  res.send(responseText);
});

app.listen((3000), () => {
  console.log('Server is running on port 3000 : http://localhost:3000');
});