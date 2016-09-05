'use strict';

class Bot {

  constructor(config) {
    this._entry = config.entry;
    this._send = config.send;
    this._execute = config.execute;
    this._schedule = config.schedule;
  }

  say(message) {
    if (typeof message === 'string') {
      message = {
        text: message
      };
    }

    return this._send({
      recipient: this._entry.sender,
      message
    });
  }

  ask(message, path) {
    this._schedule(this._entry.sender, path);
    return this.say(message);
  }

  execute(path) {
    return this._execute(path, this._entry);
  }

}

module.exports = Bot;
