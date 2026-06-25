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

  if(index === -1) {
    return { path: fullPath, query: {} };
  }
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
module.exports = {splitRawReq, parseMethodAndFullPath, ParseFullPath, parseHeaders};
