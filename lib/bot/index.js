'use strict';

const async = require('asyncawait/async');
const await = require('asyncawait/await');

const Dispatcher = require('./src/dispatcher');
const Router = require('./src/router');
const Wit = require('./src/wit');
const Sender = require('./src/sender');

class Bot {
  constructor(config) {
    this.wit = new Wit(config.WIT_ACCESS_TOKEN);
    this.sender = new Sender(config.FACEBOOK_PAGE_ACCESS_TOKEN);

    this.dispatcher = new Dispatcher({
      wit: this.wit,
      send: this.sender.send
    });

    this.send = this.sender.send;
    this.router = new Router(config.FACEBOOK_VERIFY_TOKEN, entry => {
      this.dispatcher.dispatch(entry);
    });
  }

  use(path, fn) {
    return this.dispatcher.use(path, fn);
  }
}

module.exports = Bot;
