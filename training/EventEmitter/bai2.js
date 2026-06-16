/*
Đề bài

Một ngôi nhà có hệ thống chuông cửa.

Khi chuông được nhấn, hệ thống cần thông báo:

Someone is at the door
Input
doorbell
Output
Someone is at the door
*/

const EventEmitter = require('events');
const myEmitter = new EventEmitter();

myEmitter.on('doorbell',() =>{
    console.log('Someone is at the door');
})

myEmitter.emit('doorbell');