const net = require('net');

// Create a TCP client
const client = net.createConnection({ port: 8080 }, () => {
  console.log('Connected to server');
  
  // Send a message to the server
  client.write('Hello from client!');
});

// Set encoding
client.setEncoding('utf8');

// Handle data from server
client.on('data', (data) => {
  console.log(JSON.stringify(data.toString()));
  
  // Send another message
  client.write('More data from client');
});

// Handle connection end
client.on('end', () => {
  console.log('Disconnected from server');
});

// Handle errors
client.on('error', (err) => {
  console.error('Connection error:', err);
});