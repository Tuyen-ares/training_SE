const http = require('http');
const RequestMethod = require('./method/method');
const AssetRouting = require('./routing/assetsRouting');
const assetRepository = require('./repository/assetsRepository');
const assetService = require('./service/assetsService');
const assetController = require('./controller/assetsController');
const pool = require('./data/database');
// const assetsData = [
//   { id: 1, type_id: 1, name: "Bàn phím cơ", status: "available", qr_code: "QR001", create_at: new Date() },
//   { id: 2, type_id: 2, name: "Chuột Gaming", status: "available", qr_code: "QR002", create_at: new Date() },
//   { id: 3, type_id: 3, name: "Màn hình 4K", status: "available", qr_code: "QR003", create_at: new Date() }
// ];

const assetRepositoryInstance = new assetRepository(pool);
const assetServiceInstance = new assetService(assetRepositoryInstance);
const assetControllerInstance = new assetController(assetServiceInstance);

const server = http.createServer((req,res)=> {

  // bước 1 : nhận method và url từ request
  const {method,url} = req; //  tls/ssl
  const protocol = req.socket.encrypted? 'https':'http';

  //bước 2 : parse url để lấy pathname
  const parseUrl = new URL(url, `${protocol}://${req.headers.host}`);
  const pathName = parseUrl.pathname;

  //bước 3 : set CORS
 // res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  //bước 4 : xử lý preflight request
  if(method === 'OPTIONS'){
    res.writeHead(204);
    res.end();
    return;
  }


  //bước 5 : route request dựa trên method và pathname
  if(method === RequestMethod.GET && pathName === AssetRouting.GET_ASSET)
    // res.writeHead(200,{'Content-Type':'application/json'});
    assetControllerInstance.getAllAssets(req, res);

  if(method === RequestMethod.POST && pathName === AssetRouting.ADD_ASSET){
    assetControllerInstance.addAsset(req,res);
  }


})

server.listen(3000,()=>{
  console.log('Server is running on port 3000');
})
