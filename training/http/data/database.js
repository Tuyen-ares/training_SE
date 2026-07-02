const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();



module.exports = pool;