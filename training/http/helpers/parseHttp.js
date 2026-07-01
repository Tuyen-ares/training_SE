const{ resEnd, resError } = require('./response');

const parseBody = (req) => {
   return new Promise((resolve, reject) => {
     let body = '';
    req.on('data',(chunkData)=>{
      body += chunkData.toString();
    })
    req.on('end',()=>{
      try{
         resolve(JSON.parse(body));
      }catch(err){
        reject(new Error('Invalid JSON'));
      }
    })
   })
  }

module.exports = { parseBody };