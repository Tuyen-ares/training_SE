const express = require('express');
const app = express();

app.get('/error', (req, res) => {
  throw new Error('Something went wrong!');
});

//Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error: ', err.message);
  res.status(500).json({message: 'Internal Server Error'});
});

app.listen(3000, () => {
  console.log('Server is running on port 3000 : http://localhost:3000');
});