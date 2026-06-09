var Emitter = require('./eventEmitter02');
//var Emitter = require('events');
var emitter = new Emitter();

var eventsConfig = require('./config').events;

emitter.on(eventsConfig.BAD_SCORE,() => {
    console.log("một môn nào đó bị điểm kém");
});

emitter.on(eventsConfig.BAD_SCORE,() => {
    console.log("người dùng đã kết nối");
});

//bảng điểm
var score = [10,4];

for (var s of score){
  if (s < 5) {
    console.log("bad score : ",s);
    emitter.emit(eventsConfig.BAD_SCORE);
  }
}