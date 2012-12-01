// Copyright Satoshi Nakajima (@snakajima)
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var comet = (function() {

  var isArray = $.isArray;

  var util = {};
  util.inherits = function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = new superCtor();
    /*
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    */
  };

  function EventEmitter() {
  }
  var defaultMaxListeners = 10;

  EventEmitter.prototype.emit = function() {
    var type = arguments[0];

    if (!this._events) return false;
    var handler = this._events[type];
    if (!handler) return false;

    if (typeof handler == 'function') {
      switch (arguments.length) {
        // fast cases
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        // slower
        default:
          var l = arguments.length;
          var args = new Array(l - 1);
          for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
          handler.apply(this, args);
      }
      return true;
    } else if (isArray(handler)) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
      return true;
    } else {
      return false;
    }
  };

  EventEmitter.prototype.on = function(type, listener) {
    if ('function' !== typeof listener) {
      throw new Error('addListener only takes instances of Function');
    }

    if (!this._events) this._events = {};

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    if (this._events.newListener) {
      this.emit('newListener', type, typeof listener.listener === 'function' ?
                listener.listener : listener);
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    } else if (isArray(this._events[type])) {

      // If we've already got an array, just append.
      this._events[type].push(listener);

    } else {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];

    }

    // Check for listener leak
    if (isArray(this._events[type]) && !this._events[type].warned) {
      var m;
      if (this._maxListeners !== undefined) {
        m = this._maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    return this;
  };

  function Socket(url) {
    this.url = url;
  }
  util.inherits(Socket, EventEmitter);
  Socket.prototype._emit = EventEmitter.prototype.emit;

  Socket.prototype.emit = function(event, options) {
    var self = this;
    var params = { _uuid:self.uuid };
    $.extend(params, options);
    
    $.getJSON('/_comet.io/' + event, params, function(payload) {
      //self._wait();
    });
  };
  
  Socket.prototype.connect = function() {
    var self = this;
    $.ajax({
      url: '/_comet.io/_connect',
      data: null,
      cache: false,
      success: function(payload) {
          self.uuid = payload.uuid;
          self._wait();
          self._emit('connect');
        },
      dataType: "json"
    });
  };
  
  Socket.prototype._wait = function() {
    var self = this;
    $.ajax({
      url: '/_comet.io/_wait',
      data: { uuid:self.uuid },
      cache: false,
      success: function(payload) {
          self._wait();
          if (payload) {
            self._emit(payload.event, payload.params);
          }
        },
      error: function(obj, textStatus, error) {
          if (textStatus == 'timeout') {
            self._wait();
          } else {
            console.error(textStatus, obj.responseText);
          }
        },
      dataType: "json"
    });
  };
  
  return {
    connect: function(url) {
      var socket = new Socket(url);
      socket.connect();
      return socket;
    }
  };
})();
