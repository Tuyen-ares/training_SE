const http = require('http');
const url = require('url');

const server = http.createServer((req,res)=>{

  const parseUrl = url.parse(req.url, true);

  const pathName = parseUrl.pathname;
  const query = parseUrl.query;
  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end(JSON.stringify({
    pathName,
    query,
    fullUrl: req.url
  },null,2));
})
server.listen(3000);