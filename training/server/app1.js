const net = require('net');

const server = net.createServer((socket) => {
  let buffer = '';
  let isProcessing = false;

  //listen data 
  socket.on('data', (chunk) => {
    buffer += chunk.toString();

    if(isProcessing) return;
    
    // Parse ranh giới header
    const headerEndIndex = buffer.indexOf('\r\n\r\n');
    if(headerEndIndex === -1) return; //chưa đủ header
    isProcessing = true;

    // lấy từ đầu đến cuối header(trước phần \r\n\r\n)
    //tách header và body để xử lí
    const rawHeader = buffer.slice(0,headerEndIndex);
    let rawBody = buffer.slice(headerEndIndex + 4); // lấy phần body sau header
      //GET ../api/user?id=1&name=tuyen .. HTTP/1.1
      // phân tích xử lí luồng request
      const lines = rawHeader.split('\r\n');
      const requestLine = lines[0];
      const[method,fullpath,version] = requestLine.split(' '); // tách method, fullpath, version
      const[path, queryString] = fullpath.split('?'); // tách path(ten api cua phuong thuc get/post) và query string
      // parse header
    const headers = {};
    for(let i = 1; i < lines.length; i++) {
      if(!lines[i]) continue; // bỏ qua dòng trống
      const colonIndex = lines[i].indexOf(':');
      if(colonIndex === -1) continue; // bỏ qua dòng không hợp lệ
      const key = lines[i].slice(0, colonIndex).trim().toLowerCase(); // lấy key và chuyển về chữ thường
      const value = lines[i].slice(colonIndex + 1).trim();
      headers[key] = value;
    }

    // parse query string
    const query = {};
    if(queryString) {
      queryString.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        query[key] = value; 
      });
    }
    //gui response
    const responseBod = (version,StatusCode, StatusText, contentType, body) =>{
       const response = 
                `${version} ${StatusCode} ${StatusText}\r\n` +
                `Content-Type: ${contentType}\r\n` +
                `Content-Length: ${Buffer.byteLength(body)}\r\n` +
                `Connection: close\r\n` +
                `\r\n` +
                body;
       socket.write(response);
       socket.end();

       //reset buffer va dat lai process flag
        buffer = '';
        isProcessing = false;
    }

    //xu ly get request
    if(method === 'GET' && path === '/user') {
      const responseBody = JSON.stringify({
        query: query
      });
      responseBod(200, 'OK', 'application/json', responseBody);
    }
    //xu ly post request
    else if(method === 'POST' && path === '/user') {
      const contentLength = parseInt(headers['content-length'] || '0');
      //kiem tra da du body chua
      if(rawBody.length < contentLength) {
        //neu chua du, giu buffer va cho chunk tiep theo
        console.log(`  Chờ thêm body: ${rawBody.length}/${contentLength} bytes`);
        isProcessing = false;
        return; //khong gui response, cho them du lieu
      }

      //lay dung body va gui response
     const bodyData = rawBody.slice(0, contentLength); //lay dung body theo content-length
      let parsedBody = bodyData; 

      if(headers['content-type'] === 'application/json') {
        try {
          parsedBody = JSON.parse(bodyData); //parse body neu la json
        } catch (err) {
          console.error('Lỗi khi parse JSON:', err.message);
          responseBod(400, 'Bad Request', 'text/plain', 'Invalid JSON');
          return;
        }
      }
      const responseBody = JSON.stringify({
         status: 'created',
         method: 'POST',
        data : parsedBody
      });
      responseBod(version,200, 'OK', 'application/json', responseBody);
    } else {
            console.log(`    404: ${method} ${path} not found`);
            sendResponse(404, 'Not Found', 'text/plain', 'Not Found');
        }
    
  });

  socket.on('error', (err) =>{
    console.error('Socket error:', err.message);
    buffer = '';
    isProcessing = false;
  })
});

server.listen(3000, ()=>{
  console.log("server start at port 3000");
})