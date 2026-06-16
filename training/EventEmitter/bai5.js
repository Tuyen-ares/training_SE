/*
Bài 4 - Truyền dữ liệu
Đề bài

Khi người dùng đăng nhập, hệ thống phát event kèm tên người dùng.

Input
{
  username: "tuyen"
}
Output
Welcome tuyen
Yêu cầu
Event phải truyền dữ liệu.
Listener phải nhận dữ liệu.
*/

const EventEmitter = require('events');
const myEmitter = new EventEmitter();

const user = {
  username: 'tuyen'
}

myEmitter.on('login',(user) => {
  console.log(`Welcome ${user.username}`);
});

myEmitter.emit('login',user);