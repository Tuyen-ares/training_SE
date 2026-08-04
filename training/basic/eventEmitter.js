const EventEmitter = require('events');

const myEvent = new EventEmitter();

// on : lắng nghe sự kiện nào đó
//once : lắng nghe sự kiện nào đó nhưng chỉ được gọi 1 lần
myEvent.on('geterror', (err, err2) => {
    console.log(`Error : `,err,err2);
});

setTimeout(() => {
    // emit : phát ra sự kiện nào đó
    myEvent.emit('geterror', {msg: 'Lỗi rồi mng ơi'}, {msg: 'Lỗi rồi mng ơi 2'});
}, 2000);