const net = require('net');
const client = net.connect(3000, 'localhost');

client.write(
  'POST /users HTTP/1.1\r\n' +
  'Content-Length: 16\r\n' +
  '\r\n' +
  '{"name":"Tu'
);

setTimeout(() => {
  client.write('yen"}');
}, 1000);