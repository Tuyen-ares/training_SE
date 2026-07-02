 function Emitter () {
  this.events = {};
}

Emitter.prototype.on = function(type, listener) {
  if (!this.events[type]) {
    this.events[type] = this.events[type] || [];
  }
  this.events[type].push(listener);
}

//phát ra sự kiện nào đó
Emitter.prototype.emit = function(type) {
  if (this.events[type]) {
    this.events[type].forEach(listener => {
      listener(); // duyệt mảng & gọi hàm
    });
  }
}

module.exports = Emitter;