const addon = require('./build/Release/mousehook.node');

module.exports = {
  start(callback) {
    addon.start(callback);
  },
  stop() {
    addon.stop();
  }
};
