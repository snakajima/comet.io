$(document).ready(function() {
  var socket = comet.connect();
  socket.on('connect', function() {
    console.log('connected');
  }).on('test.message', function (data) {
    socket.emit('test.response', data);
  });
});