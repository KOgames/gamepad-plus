(function (window) {

if (!('performance' in window)) {
  window.performance = {};
}

if (!('now' in window.performance)) {
  window.performance.now = function () {
    return +new Date();
  };
}


var raf = window.requestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame;

if (!raf) {
  throw 'requestAnimationFrame is required!';
}

var caf = window.cancelRequestAnimationFrame ||
  window.mozCancelRequestAnimationFrame ||
  window.webkitCancelRequestAnimationFrame;


var utils = {};

utils.getBrowser = function () {
  if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
    // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera).
    return 'opera';
  } else if ('chrome' in window) {
    // Chrome 1+.
    return 'chrome';
  } else if (typeof InstallTrigger !== 'undefined') {
    // Firefox 1.0+.
    return 'firefox';
  } else if (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0) {
    // At least Safari 3+: "[object HTMLElementConstructor]".
    return 'safari';
  } else if (/*@cc_on!@*/false || !!document.documentMode) {
    // At least IE6.
    return 'ie';
  }
};

utils.browser = utils.getBrowser();

utils.getEngine = function (browser) {
  browser = browser || utils.getBrowser();

  if (browser === 'firefox') {
    return 'gecko';
  } else {
    return 'webkit';
  }
};

utils.engine = utils.getEngine(utils.browser);

utils.stripLeadingZeros = function (str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/^0+(?=\d+)/g, '');
};

utils.triggerEvent = function (el, name, data) {
  data = data || {};
  data.detail = data.detail || {};

  if ('CustomEvent' in window) {
    var event = new CustomEvent(name, data.detail);
  } else {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(name, data.bubbles, data.cancelable, data.detail);
  }

  Object.keys(data.detail).forEach(function (key) {
    event[key] = data.detail[key];
  });

  el.dispatchEvent(event);
};


if (!('GamepadButton' in window)) {
  var GamepadButton = window.GamepadButton = function (obj) {
    return {
      pressed: obj.pressed,
      value: obj.value
    };
  };
}


var Gamepads = function (opts) {
  var self = this;

  if (!(self instanceof Gamepads)) {
    return new Gamepads(opts);
  }

  self._allowedOpts = ['buttonThreshold', 'axisThreshold'];

  self._gamepadApis = ['getGamepads', 'webkitGetGamepads', 'webkitGamepads'];
  self._gamepadEvents = ['gamepadconnected', 'gamepaddisconnected'];
  self._gamepadProps = ['id', 'index', 'mapping', 'connected', 'timestamp', 'buttons', 'axes'];
  self.gamepadsSupported = self._hasGamepads();

  self._seenEvents = {};

  self.buttonThreshold = 0.15;
  self.axisThreshold = 0.15;

  self.previousState = {};
  self.state = {};

  var addSeenEvent = function (e) {
    self.addSeenEvent(e.gamepad, e);
  };

  self._gamepadEvents.forEach(function (eventName) {
    window.addEventListener(eventName, addSeenEvent);
  });

  opts = opts || {};
  Object.keys(opts).forEach(function (key) {
    if (self._allowedOpts.indexOf(key) !== -1) {
      self[key] = opts[key];
    }
  });
};


Gamepads.prototype._getVendorProductIds = function (id) {
  var bits = id.split('-');
  var match;

  if (bits.length < 2) {
    match = id.match(/vendor: (\w+) product: (\w+)/i);
    if (match) {
      return match.slice(1).map(utils.stripLeadingZeros);
    }
  }

  match = id.match(/(\w+)-(\w+)/);
  if (match) {
    return match.slice(1).map(utils.stripLeadingZeros);
  }

  return bits.slice(0, 2).map(utils.stripLeadingZeros);
};


/**
 * List of standard button and axis names. The index is according to the
 * standard mapping.
 *
 * @property StandardMappings
 */
Gamepads.StandardMappings = {
  buttons: [
    // Face buttons
    'FACE_1',
    'FACE_2',
    'FACE_3',
    'FACE_4',

    // Shoulder buttons
    'L_SHOULDER_1',
    'R_SHOULDER_1',
    'L_SHOULDER_2',
    'R_SHOULDER_2',

    // Other buttons
    'SELECT',
    'START',
    'L_STICK_BUTTON',
    'R_STICK_BUTTON',

    // D Pad
    'DPAD_UP',
    'DPAD_DOWN',
    'DPAD_LEFT',
    'DPAD_RIGHT',

    // Vendor-specific button
    'VENDOR',
  ],
  axes: [
    // Analogue Sticks
    'L_STICK_X',
    'L_STICK_Y',
    'R_STICK_X',
    'R_STICK_Y',
  ]
};


/**
 * List of custom button/axis mappings.
 *
 * @property CustomMappings
 */
Gamepads.CustomMappings = {
  standard: {
    buttons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    axes: [0, 1, 2, 3]
  },
  n64_gecko: {
    engine: 'gecko',
    vendor_id: '79',
    product_id: '6',
    buttons: [
      2,   // PAD_FACE_1 -- C-down button
      1,   // PAD_FACE_2 -- C-right button
      3,   // PAD_FACE_3 -- C-left button
      0,   // PAD_FACE_4 -- C-down button
      4,   // PAD_L_SHOULDER_1 -- L button
      5,   // PAD_R_SHOULDER_1 -- R button
      -1,  // PAD_L_SHOULDER_2 -- missing on controller
      -1,  // PAD_R_SHOULDER_2 -- missing on controller
      8,   // SELECT_BACK -- B button
      9,   // START_FORWARD -- START button
      -1,  // LEFT_STICK -- missing on controller
      -1,  // RIGHT_STICK -- missing on controller
      12,  // DPAD_UP -- not supported by API
      13,  // DPAD_DOWN -- not supported by API
      14,  // DPAD_LEFT -- not supported by API
      15,  // DPAD_RIGHT -- not supported by API
      -1   // HOME -- missing on controller
    ],
    axes: [
      1,   // LEFT_STICK_X
      2,   // LEFT_STICK_Y
      -1,  // RIGHT_STICK_X
      -1   // RIGHT_STICK_Y
    ]
  },
  n64_webkit: {
    engine: 'webkit',
    vendor_id: '79',
    product_id: '6',
    buttons: [
      2,   // FACE_1 -- C-down button
      1,   // FACE_2 -- C-right button
      3,   // FACE_3 -- C-left button
      0,   // FACE_4 -- C-down button
      4,   // LEFT_TOP_SHOULDER -- L button
      5,   // RIGHT_TOP_SHOULDER -- R button
      -1,  // LEFT_BOTTOM_SHOULDER -- missing on controller
      -1,  // RIGHT_BOTTOM_SHOULDER -- missing on controller
      8,   // SELECT_BACK -- B button
      9,   // START_FORWARD -- START button
      -1,  // LEFT_STICK -- missing on controller
      -1,  // RIGHT_STICK -- missing on controller
      12,  // DPAD_UP -- D Pad-up button
      13,  // DPAD_DOWN -- D Pad-down button
      14,  // DPAD_LEFT -- D Pad-left button
      15,  // DPAD_RIGHT -- D Pad-right button
      -1   // HOME -- missing on controller
    ],
    axes: [
      0,   // LEFT_STICK_X
      1,   // LEFT_STICK_Y
      -1,  // RIGHT_STICK_X
      -1   // RIGHT_STICK_Y
    ]
  },
  xbox_gecko: {
    vendor_id: '45e',
    product_id: '28e',
    buttons: [0, 1, 2, 3, 4, 5, 15, 16, 9, 8, 6, 7, 11, 12, 13, 14, 10],
    axes: [0, 1, 2, 3]
  },
};


Gamepads.prototype._hasGamepads = function () {
  for (var i = 0; i < this._gamepadApis.length; i++) {
    if (this._gamepadApis[i] in navigator) {
      return true;
    }
  }
  return false;
};


Gamepads.prototype._getGamepads = function () {
  for (var i = 0; i < this._gamepadApis.length; i++) {
    if (this._gamepadApis[i] in navigator) {
      return navigator[this._gamepadApis[i]]();
    }
  }
  return [];
};


Gamepads.prototype.addGamepad = Gamepads.prototype.updateGamepad = function (gamepad) {
  this.previousState[gamepad.index] = this.state[gamepad.index];
  this.state[gamepad.index] = gamepad;

  if (!this.hasSeenEvent(gamepad, {type: 'gamepadconnected'})) {
    this.fireConnectionEvent(gamepad, true);
  }
};


Gamepads.prototype.existsGamepad = function (gamepad) {
  return gamepad.index in this.state;
};


Gamepads.prototype.removeGamepad = function (gamepad) {
  delete this.state[gamepad.index];

  if (!this.hasSeenEvent(gamepad, {type: 'gamepaddisconnected'})) {
    this.removeSeenEvent(gamepad, {type: 'gamepadconnected'});
    this.fireConnectionEvent(gamepad, false);
  }
};


/**
 * @function
 * @name Gamepads#update
 * @description
 *   Update the current and previous states of the gamepads.
 *   This must be called every frame for `wasPressed()` to work.
 */
Gamepads.prototype.update = function () {
  var self = this;

  // Add/update connected gamepads (and fire polyfilled events, if needed).
  self.poll().forEach(function (pad) {
    self.updateGamepad(pad.raw);
  });

  var previousPad;
  var currentPad;

  // Remove disconnected gamepads (and fire polyfilled events, if needed).
  Object.keys(self.previousState).forEach(function (padIdx) {
    previousPad = self.previousState[padIdx];
    currentPad = self.state[padIdx];

    if (previousPad && self.existsGamepad(previousPad) &&
        !self.existsGamepad(currentPad)) {

      self.removeGamepad(previousPad);
    }
  });
};


/**
 * @function
 * @name Gamepads#poll
 * @description Poll for the latest data from the gamepad API.
 * @returns {Array} An array of gamepads and mappings for the model of the connected gamepad.
 * @example
 *   var gamepads = new Gamepads();
 *   var pads = gamepads.poll();
 */
Gamepads.prototype.poll = function () {
  var pads = [];

  if (this.gamepadsSupported) {
    var padsRaw = this._getGamepads();
    var pad;
    var padIds;
    var padObj;

    for (var i = 0; i < padsRaw.length; i++) {
      pad = padsRaw[i];

      if (pad) {
        padIds = this._getVendorProductIds(pad.id);

        padObj = {
          raw: pad,
          vendor_id: padIds[0],
          product_id: padIds[1]
        };

        this._mapGamepad(padObj);

        padObj.timestamp = pad.timestamp ? pad.timestamp : window.performance.now();
        padObj.mapped.timestamp = padObj.mapped.timestamp ? padObj.mapped.timestamp : window.performance.now();

        pads.push(padObj);
      }
    }
  }

  return pads;
};


/**
 * @function
 * @name Gamepads#_mapAxis
 * @description Set the value for one of the analogue axes of the pad.
 * @param {Number} axis The button to get the value of.
 * @returns {Number} The value of the axis between -1 and 1.
 */
Gamepads.prototype._mapAxis = function (axis) {
  if (Math.abs(axis) < this.axisThreshold) {
    return 0;
  }

  return axis;
};


/**
 * @function
 * @name Gamepads#_mapButton
 * @description Set the value for one of the buttons of the pad.
 * @param {Number} button The button to get the value of.
 * @returns {Object} An object resembling a `GamepadButton` object.
 */
Gamepads.prototype._mapButton = function (button) {
  if (typeof button === 'number') {
    // Old versions of the API used to return just numbers instead
    // of `GamepadButton` objects.
    button = new GamepadButton({
      pressed: button === 1.0,
      value: button
    });
  }

  if (button.pressed && Math.abs(button.value) < this.buttonThreshold) {
    button.pressed = false;
  }

  return button;
};


Gamepads.prototype._doesMapMatch = function (pad, mapping) {
  if ((mapping.engine && mapping.engine !== utils.engine) ||
      (mapping.browser && mapping.browser !== utils.browser)) {
    return false;
  }

  return mapping.vendor_id === pad.vendor_id &&
         mapping.product_id === pad.product_id;
};


Gamepads.prototype._getButtonName = function (idx) {
  return Gamepads.StandardMappings.buttons[idx];
};


Gamepads.prototype._getAxisName = function (idx) {
  return Gamepads.StandardMappings.axes[idx];
};


/**
 * @function
 * @name Gamepads#_mapGamepad
 * @description Set the value for one of the buttons of the pad.
 * @returns {Object} The mapping of the gamepad.
 */
Gamepads.prototype._mapGamepad = function (pad) {
  var self = this;

  pad._remapped = false;
  pad.mapped = {};

  self._gamepadProps.forEach(function (prop) {
    pad.mapped[prop] = pad.raw[prop];
  });

  pad.mapped.buttons = pad.raw.buttons.map(function (button, idx) {
    pad[self._getButtonName(idx)] = button;

    return self._mapButton(button);
  });

  pad.mapped.axes = pad.raw.axes.map(function (axis, idx) {
    pad[self._getAxisName(idx)] = axis;

    return self._mapAxis(axis);
  });

  if (pad.mapping === 'standard') {
    return;
  }

  var mapping;

  Object.keys(Gamepads.CustomMappings).forEach(function (key) {
    mapping = Gamepads.CustomMappings[key];

    // Find a mapping.
    if (self._doesMapMatch(pad, mapping)) {
      pad._remapped = true;
      pad.mapping = 'standard';  // Per the Gamepad spec.

      pad.mapped.buttons = mapping.buttons.map(function (idx) {
        pad[self._getButtonName(idx)] = pad.mapped.buttons[idx];

        return pad.mapped.buttons[idx];
      });

      pad.mapped.axes = mapping.axes.map(function (idx) {
        pad[self._getAxisName(idx)] = pad.mapped.axes[idx];

        return pad.mapped.axes[idx];
      });
    }
  });
};


Gamepads.prototype.fireConnectionEvent = function (gamepad, connected) {
  var name = connected ? 'gamepadconnected' : 'gamepaddisconnected';
  var data = {
    bubbles: false,
    cancelable: false,
    detail: {
      gamepad: gamepad
    }
  };
  utils.triggerEvent(window, name, data);
};


Gamepads.prototype.addSeenEvent = function (gamepad, e) {
  if (typeof this._seenEvents[gamepad.index] === 'undefined') {
    this._seenEvents[gamepad.index] = {};
  }

  this._seenEvents[gamepad.index][e.type] = e;
};


Gamepads.prototype.hasSeenEvent = function (gamepad, e) {
  if (this._seenEvents[gamepad.index]) {
    return e.type in this._seenEvents[gamepad.index];
  }

  return false;
};


Gamepads.prototype.removeSeenEvent = function (gamepad, e) {
  if (e.type) {
    if (this._seenEvents[gamepad.index]) {
      delete this._seenEvents[gamepad.index][e.type];
    }
  } else {
    delete this._seenEvents[gamepad.index];
  }
};



var gamepads = new Gamepads();
gamepads.polling = false;


function gamepadConnected(e) {
  console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.',
    e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);

  updateStatus();
}

function gamepadDisconnected(e) {
  console.log('Gamepad removed at index %d: %s.', e.gamepad.index, e.gamepad.id);
}


function updateStatus() {
  if (gamepads.polling) {
    return;
  }

  gamepads.polling = true;

  gamepads.update();

  raf(updateStatus);
}

function cancelLoop() {
  gamepads.polling = false;

  if (gamepads.nonFirefoxInterval) {
    window.clearInterval(gamepads.nonFirefoxInterval);
  }

  caf(updateStatus);
}


if (gamepads.gamepadsSupported) {
  window.addEventListener('gamepadconnected', gamepadConnected);
  window.addEventListener('gamepaddisconnected', gamepadDisconnected);

  // At the time of this writing, Firefox is the only browser that correctly
  // fires the `gamepadconnected` event. For the other browsers
  // <https://crbug.com/344556>, we start polling every 100ms until the
  // first gamepad is connected.
  if (utils.browser !== 'firefox') {
    gamepads.nonFirefoxInterval = window.setInterval(function () {
      if (gamepads.poll().length) {
        updateStatus();
        window.clearInterval(gamepads.nonFirefoxInterval);
      }
    }, 100);
  }
}


window.Gamepads = Gamepads;
window.gamepads = gamepads;

})(window);
