const net = require('net');

const server = net.createServer((socket) => {
    let buffer = '';          // Tích lũy dữ liệu thô
    let isProcessing = false; // Tránh xử lý song song

    // Lắng nghe dữ liệu từ client
    socket.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Tránh xử lý trùng lặp
        if (isProcessing) return;
        
        // Tìm ranh giới header
        const headerEndIndex = buffer.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) return; // Chưa đủ header
        
        isProcessing = true;
        
        // Tách header và body
        // lấy phần header từ đầu đến vị trí kết thúc header, phần body là phần còn lại sau header
        const rawHeader = buffer.slice(0, headerEndIndex);
        let rawBody = buffer.slice(headerEndIndex + 4);
        
        // ===== 1. PARSE REQUEST LINE =====
        const lines = rawHeader.split('\r\n');
        const requestLine = lines[0]; // ví dụ: GET /get-user?name=Tuyen HTTP/1.1
        // method   = "GET"
        // fullPath = "/get-user?name=Tuyen"
        // version  = "HTTP/1.1"
        const [method, fullPath, version] = requestLine.split(' ');
        
        // Tách path và query string
        // Nếu fullPath là "/get-user?name=Tuyen", thì path sẽ là "/get-user" và queryString sẽ là "name=Tuyen"
        const [path, queryString] = fullPath.split('?');
        
        console.log(`\n📨 ${method} ${fullPath}`);
        console.log(`   Path: ${path}`);
        
        // ===== 2. PARSE HEADERS =====
        const headers = {}; // khởi tạo object headers để lưu trữ các header dưới dạng key-value
        /* ví dụ: 
        đầu vào 
        lines = [
    "GET /get-user?name=Tuyen HTTP/1.1",  // dòng 0 (request line)
    "Host: localhost:3000",               // dòng 1
    "User-Agent: curl/7.68.0",            // dòng 2
    "Accept: application/json",           // dòng 3
    "Authorization: Bearer token123"      // dòng 4
]
      đầu ra 
      === KẾT QUẢ CUỐI CÙNG ===
{
  host: 'localhost:3000',
  'user-agent': 'curl/7.68.0',
  accept: 'application/json',
  authorization: 'Bearer token123'
}
        */
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue;
            const colonIndex = lines[i].indexOf(':');
            if (colonIndex === -1) continue;
            
            const key = lines[i].substring(0, colonIndex).toLowerCase().trim();
            const value = lines[i].substring(colonIndex + 1).trim();
            headers[key] = value;
        }
        
        // ===== 3. PARSE QUERY STRING =====
        const query = {};
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                query[key] = decodeURIComponent(value || '');
            });
        }
        
        console.log('   Query:', query);
        console.log('   Headers:', Object.keys(headers));
        
        // ===== 4. HÀM XỬ LÝ RESPONSE =====
        const sendResponse = (statusCode, statusText, contentType, body) => {
            const response = 
                `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
                `Content-Type: ${contentType}\r\n` +
                `Content-Length: ${Buffer.byteLength(body)}\r\n` +
                `Connection: close\r\n` +
                `\r\n` +
                body;
            
            socket.write(response);
            socket.end();
            
            // reset buffer sau khi xử lý xong
            buffer = '';
            isProcessing = false;
        };
        
        // ===== 5. XỬ LÝ GET REQUEST =====
        if (method === 'GET' && path === '/user') {
            const responseBody = JSON.stringify({ 
                query: query 
            });
            sendResponse(200, 'OK', 'application/json', responseBody);
        }
        
        // ===== 6. XỬ LÝ POST REQUEST =====
        else if (method === 'POST' && path === '/user') {
            const contentLength = parseInt(headers['content-length'] || '0');
            
            //   kiểm tra đã đủ body chưa
            if (rawBody.length < contentLength) {
                // Nếu chưa đủ, giữ buffer và chờ chunk tiếp theo
                console.log(`  Chờ thêm body: ${rawBody.length}/${contentLength} bytes`);
                isProcessing = false;
                return; // Không gửi response, chờ thêm dữ liệu
            }
            
            // Đã đủ body
            const bodyData = rawBody.slice(0, contentLength);
            let parsedBody = bodyData;
            
            if (headers['content-type'] === 'application/json') {
                try {
                    parsedBody = JSON.parse(bodyData);
                } catch (e) {
                    parsedBody = { error: 'Invalid JSON' };
                }
            }
            
            console.log(`   Body:`, parsedBody);
            
            const responseBody = JSON.stringify({ 
                status: "Created", 
                data: parsedBody 
            });
            sendResponse(201, 'Created', 'application/json', responseBody);
        }
        
        // ===== 7. 404 NOT FOUND =====
        else {
            console.log(`    404: ${method} ${path} not found`);
            sendResponse(404, 'Not Found', 'text/plain', 'Not Found');
        }
    });
    
    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
        buffer = '';
        isProcessing = false;
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});