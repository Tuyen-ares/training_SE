const EventEmitter = require('events');
const myEmitter = new EventEmitter();

// myEmitter.on('events',()=>{
//     console.log('an event occurred!');
// })

// myEmitter.emit('events');

// myEmitter.on('status', (code,message)=>{
//     console.log(`status code: ${code}, message: ${message}`);
// });

// myEmitter.emit('status', 200, 'ok');

// // Error event handler
// myEmitter.on('error', (err) => {
//   console.error('Error occurred:', err.message);
// });

// // Emit an error event
// myEmitter.emit('error', new Error('Something went wrong'));


// Add some listeners
myEmitter.on('event1', () => console.log('Event 1'));
myEmitter.on('event2', () => console.log('Event 2'));
myEmitter.on('event2', () => console.log('Event 2 again'));

// Get all event names
console.log('Event names:', myEmitter.eventNames());

// Get listeners for a specific event
console.log('Listeners for event2:', myEmitter.listeners('event2'));

// Count listeners
console.log('Listener count for event2:', myEmitter.listenerCount('event2'));

myEmitter.emit('event2');