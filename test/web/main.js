$(document).ready(function() {
  var socket;
  if (typeof io == 'undefined') {
    socket = comet.connect();
  } else {
    socket = io.connect();
  }
  socket.on('connect', function() {
    console.log('connected');
  }).on('test.message', function (data) {
    socket.emit('test.response', data);
  });
});