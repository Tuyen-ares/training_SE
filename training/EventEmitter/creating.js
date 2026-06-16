const EventEmitter = require('events');

const myEmitter = new EventEmitter();

class MyEmitter extends EventEmitter {
  constructor() {
    super();
  }
}

const myEmitter2 = new MyEmitter();