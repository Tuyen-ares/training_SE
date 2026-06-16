/*Bài 3 - Nhiều Listener
Đề bài

Khi người dùng đăng ký tài khoản, hệ thống phải:

Gửi email chào mừng.
Ghi log.
Tạo hồ sơ mặc định.
Input
user-created
Output
Welcome email sent
Audit log created
Default profile created
Yêu cầu
1 event.
3 listeners.
 */

const EventEmitter = require('events');
const myEmitter = new EventEmitter();

myEmitter.on('user-created',()=>{
  console.log('Welcome email sent');
})

myEmitter.on('user-created',()=>{
  console.log('Audit log created');
})

myEmitter.on('user-created',()=>{
  console.log('Default profile created');
})

myEmitter.emit('user-created');