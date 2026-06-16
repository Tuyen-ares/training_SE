/*Bài 2 - Đăng nhập
Đề bài

Khi người dùng đăng nhập thành công, hệ thống phải ghi log.

Input
login
Output
User logged in
Yêu cầu
1 event.
1 listener.
 */

const EventEmitter = require('events');
const myEmitter = new EventEmitter();

myEmitter.on('Login',()=>{
  console.log('User logged in');
})

myEmitter.emit('Login');