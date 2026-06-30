const net = require('net');
const UserRepository = require('./repository/userRepository');
const {splitRawReq, parseMethodAndFullPath, ParseFullPath, parseHeaders} = require('./helpers/Parse');
const {RequestMethod} = require('./method/method');
const {UserRouting} = require('./routing/route');
const {method} = require('./method/method');
const UserService = require('./service/userService');


const usersData = require("./data/userData");
const userRepository = new UserRepository(usersData);
const userService = new UserService(userRepository);

const response = (version,StatusCode, StatusText, contentType, body) =>{
       const res = 
                `${version} ${StatusCode} ${StatusText}\r\n` +
                `Content-Type: ${contentType}\r\n` +
                `Content-Length: ${Buffer.byteLength(body)}\r\n` +
                `\r\n` +
                body;
        return res;
}

const server = net.createServer((socket) => {
 
    let buffer = '';
  socket.on('data', (data) => {
    console.log('Client req :', data.toString());
    buffer += data.toString();

    const req = splitRawReq(buffer);
    //console.log('Parsed request:', req);

    // console.log('raw header line:', req.rawHeaders);
    const {method, fullPath, version} = parseMethodAndFullPath(req.rawHeaders);
    const { path, query } = ParseFullPath(fullPath);
     console.log('\n Path:', path);
     console.log('\n Query:', query);

    if (method === RequestMethod.GET && path === UserRouting.GET_USER) {
      const users = userService.getAllUsers();
      const res = response(version, 200, 'OK', 'application/json', JSON.stringify(users));
      socket.write(res);
      socket.end();
    }
    
    if (method === RequestMethod.POST && path === UserRouting.ADD_USER) {
      console.log('Raw body:', req.rawBody);
      const headers = parseHeaders(req.rawHeaders);
      console.log('Headers:', headers);
      const contentLength = parseInt(headers['content-length']);
      console.log('Content Length:', contentLength);
      if(contentLength === req.rawBody.length){
        // const parseBody = JSON.parse(req.rawBody);
        // userRepository.addUser(parseBody);
        const body = userService.addUser(JSON.parse(req.rawBody));
        const res = response(version, 200, 'OK', 'application/json', JSON.stringify(body));
        socket.write(res);
        socket.end();
      } else{
          const res = response(version, 400, 'Bad Request', 'application/json', JSON.stringify({error: 'Invalid request'}));
          socket.write(res);
          socket.end();
    }

    }

  });
  
  socket.on('end', () => {
    console.log('Client disconnected');
  });
  
  // Handle errors
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});


server.listen(3000, () => {
  console.log('TCP server listening on port 3000');
});