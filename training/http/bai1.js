const http = require('http');

const productsData = [
  { id: 1, name: "Bàn phím cơ", price: 1000, category: "gear" },
  { id: 2, name: "Chuột Gaming", price: 500, category: "gear" },
  { id: 3, name: "Màn hình 4K", price: 4000, category: "screen" }
];

const server = http.createServer((req,res)=> {
  
  // bước 1 : nhận method và url từ request
  const {method,url} = req;
  const protocol = req.socket.encrypted? 'https':'http';

  //bước 2 : parse url để lấy pathname 
  const parseUrl = new URL(url, `${protocol}://${req.headers.host}`);
  const pathName = parseUrl.pathname;

  //bước 3 : set CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  //bước 4 : xử lý preflight request
  if(method === 'OPTIONS'){
    res.writeHead(204);
    res.end();
    return;
  }
  //bước 5 : route request dựa trên method và pathname
  if(method === 'GET' && pathName === '/products'){
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify(productsData));
    return;
  }
  if(method === 'POST' && pathName === '/products'){
    let body = '';
   
    req.on('data',(chunkData)=>{
      body += chunkData.toString();
    })
    req.on('end',()=>{
      try{
        const newProduct = JSON.parse(body);
        const newProductId = productsData.length > 0 ? Math.max(...productsData.map(p=>p.id)) + 1 : 1;
        newProduct.id = newProductId; 
        productsData.push(newProduct);
        res.writeHead(201,{'Content-Type':'application/json'});
        res.end(JSON.stringify(newProduct));
      }catch(err){
        res.writeHead(400,{'Content-Type':'application/json'});
        res.end(JSON.stringify({error:'Invalid JSON'}));
      }
    })
  }
  //bước 6 : xử lý lỗi và trả về response

})

server.listen(3000,()=>{
  console.log('Server is running on port 3000');
})