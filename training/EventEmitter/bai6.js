/*Bài 5 - Hệ thống đơn hàng
Đề bài

Khi đơn hàng được tạo:

order-created

hệ thống cần:

Trừ hàng tồn kho.
Gửi email xác nhận.
Ghi log.
Input
order-created
Output
Inventory updated
Confirmation email sent
Order logged
 */

const EventEmitter = require('events');
const myEmitter = new EventEmitter();

myEmitter.on('order-created',()=>{
  console.log('Inventory updated');
})

myEmitter.on('order-created',()=>{
  console.log('Confirmation email sent');
})

myEmitter.on('order-created',()=>{
  console.log('Order logged');
})

myEmitter.emit('order-created');