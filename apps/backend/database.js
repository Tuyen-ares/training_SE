const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.query('SELECT * FROM users', (err, results) => {
    if (err) {
        console.error('Error executing query:', err.message);
        return;
    }
    console.log('Query results:', results);
  });

connection.query("select * from users where id = 1 and department = 'Engineering'", (err, results) => {
    if (err) {
        console.error('Error executing query:', err.message);
        return;
    }
    console.log(' \n Query results:', results);
});

// connection.query("INSERT INTO users (name, email, department) VALUES ('La Hoàn Tuyên ', 'tuyendz@gmail.com', 'Software Engineering');", (err, results) => {
//     if (err) {
//         console.error('Error executing query:', err.message);
//         return;
//     }
//     console.log(' \n Query results:', results);
// });

module.exports = connection;