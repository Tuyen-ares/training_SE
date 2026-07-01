 const resEnd = (res, status, type, data) => {
     res.writeHead(status,{'Content-Type':type});
     console.log(`Response ${status}:`, data);
     return res.end(JSON.stringify(data));
  }
  
  const resError = (res,status, type, message) => {
    res.writeHead(status, {'Content-Type': type});
    console.error(`Error ${status}: ${message}`);
    return res.end(JSON.stringify({ error: message }));
  };

module.exports = { resEnd, resError };