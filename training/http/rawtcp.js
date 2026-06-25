const net = require('net');
const { Interface } = require('readline');



const user = [{
  id:1,
  username: "thang12",
  password: "secretPassword",
  email: "haha@gmail.com"
}];
const splitRawReq = (data) => {
  let index = data.indexOf('\r\n\r\n');
  const rawHeaders = data.substring(0, index);
  const rawBody = data.substring(index + 4);
  return {rawHeaders, rawBody};
}

const parseMethodAndFullPath = (rawHeaders) => {
   const lines = rawHeaders.split('\r\n');
   const[method, fullPath, version] = lines[0].split(' ');
   return {method, fullPath, version};
}

const parseHeaders = (rawHeaders) => {
    const lines = rawHeaders.split('\r\n');
    const headers = {};
    for(let i = 1; i < lines.length; i++) {
        // const indexLine = lines[i].indexOf(':');
        // const key = lines[i].substring(0, indexLine).trim().toLowerCase();
        // const value = lines[i].substring(indexLine + 1).trim();
        const [key, value] = lines[i].split(':');
        headers[key] = value;
    }
    return headers;
}

//get /users?id=1&name=tuyen
const ParseFullPath = (fullPath) => {
  const index = fullPath.indexOf('?');

  // if(index === -1) {
  //   return { path: fullPath, query: {} };
  // }
  const path = fullPath.substring(0, index);
  const queryString = fullPath.substring(index + 1);
  const query = {};
  const pairs = queryString.split('&');
  for(let i = 0; i < pairs.length; i++){
    const [key,value] = pairs[i].split('=');
    query[key] = value;
  }
  return { path, query };
} 

const response = (version,StatusCode, StatusText, contentType, body) =>{
       const res = 
                `${version} ${StatusCode} ${StatusText}\r\n` +
                `Content-Type: ${contentType}\r\n` +
                `Content-Length: ${Buffer.byteLength(body)}\r\n` +
                `\r\n` +
                body;
        return res;
}

const RequestMethod  = {
  GET: 'GET',
  POST: 'POST'
}

const UserRouting = {
  GET_USER: '/users',
  ADD_USER: '/user'
};


const server = net.createServer((socket) => {
  //console.log('Client connected');
  
  socket.on('data', (data) => {
    let buffer = '';
    buffer += data.toString();

    const req = splitRawReq(buffer);
    //console.log('Parsed request:', req);

    // console.log('raw header line:', req.rawHeaders);
    const {method, fullPath, version} = parseMethodAndFullPath(req.rawHeaders);
    // console.log('\n Method:', method);
    // console.log('\n Path:', path);
    // console.log('\n Version:', version);
    const { path, query } = ParseFullPath(fullPath);
     console.log('\n Path:', path);
     console.log('\n Query:', query);
    //console.log('\n Headers:', headers);
    if (method === RequestMethod.GET && path === UserRouting.GET_USER) {
      const res = response(version, 200, 'OK', 'application/json', JSON.stringify(user));
      socket.write(res);
      socket.end();
    }
    
    if (method === RequestMethod.POST && path === UserRouting.ADD_USER) {
      console.log('Raw body:', req.rawBody);
      const headers = parseHeaders(req.rawHeaders);
      console.log('Headers:', headers);
      const contentLength = parseInt(headers['Content-Length']);
      console.log('Content Length:', contentLength);
      if(contentLength === req.rawBody.length){
        console.log('Content Length matches');
        const parseBody = JSON.parse(req.rawBody);
        console.log('Parsed body:', parseBody);
        user.push(parseBody);
      const res = response(version, 200, 'OK', 'application/json', JSON.stringify(parseBody));
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