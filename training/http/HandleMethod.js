const http = require('http');
const url = require('url');

let userData = [
 { id: 1, name: 'Jinna' },
 { id: 2, name: 'Hayete' }
];

const server = http.createServer((req, res) => {
  const {method,url} = req;
  const protocol = req.socket.encrypted ? 'https' : 'http';
  //console.log(`Received ${method} request for ${url}`);
  const parseUrl = new URL(url, `${protocol}://${req.headers.host}`);
  //console.log("parrseURL chứa: ", parseUrl);
  const pathName = parseUrl.pathname;

  //set CORS header
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  //Accept preflight request
  if(method === 'OPTIONS'){
    res.writeHead(204);
    res.end();
    return;
  }

  //Route : Get 
  if(method === 'GET' && pathName === '/users'){
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify(Object.values(userData)));
    return;
  }

  //Route : POST
  if(method === 'POST' && pathName === '/users'){
    let body = '';
    req.on('data', chunk =>{
      body += chunk.toString();
    })
    req.on('end',()=>{
      try{
        const newUser = JSON.parse(body);
        const userId = users.Length > 0 ? Math.max(...users.map(u=>u.id)) + 1 : 1;
        newUser.id = userId;
        userData.push(newUser);
        res.writeHead(201,{'Content-Type':'application/json'});
        res.end(JSON.stringify(newUser));
      }
      catch(err){
        res.writeHead(400,{'Content-Type':'application/json'});
        res.end(JSON.stringify({error:'Invalid JSON'}));
      }
    })
  }

});

  

server.listen(3000,()=>{ 
  console.log('Server running at http://localhost:3000/');
})