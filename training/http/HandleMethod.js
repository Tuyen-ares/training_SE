const http = require('http');
const url = require('url');

let userData = [
 { id: 1, name: 'Alice' },
 { id: 2, name: 'Bob' }
];

const server = http.createServer((req, res) => {
  const {method,url} = req;
  const parseUrl = new URL(url, `http://${req.headers.host}`);
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
        const UserId = users.Length>0?Math.max(...users.map(u=>u.id)) + 1 : 1;
        newUser.id = UserId;
        userData.push(newUser);
        res.writeHead(201,{'Content-Type':'application/json'});
        res.end(JSON.stringify(newUser));
      }
      catch(err){
        res.writeHead(400,{'Content-Type':'application/json'});
        ress.end(JSON.stringify({error:'Invalid JSON'}));
      }
    })
  }

});

  

server.listen(3000,()=>{ 
  console.log('Server running at http://localhost:3000/');
})