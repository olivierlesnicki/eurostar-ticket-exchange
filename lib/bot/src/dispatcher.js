'use strict';

const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Routes = require('routes');
const redis = require('../../redis');

const Bot = require('./bot');

const Dispatcher = function Dispatcher(config) {
  this._routes = new Routes();
  this._wit = config.wit;
  this._send = config.send;

  this.execute = this.execute.bind(this);
  this.dispatch = this.dispatch.bind(this);
  this.schedule = this.schedule.bind(this);
};

Dispatcher.prototype = {

  use(path, fn) {
    this._routes.addRoute(path, fn);
  },

  execute: async (function (path, entry) {
    let scheduledPath;
    let bot = new Bot({
      entry: entry,
      send: this._send,
      execute: this.execute,
      schedule: this.schedule
    });

    scheduledPath = await (redis.getAsync(`awaiting:${entry.sender.id}`));

    if (scheduledPath) {
      path = scheduledPath;
      await (redis.delAsync(`awaiting:${entry.sender.id}`));
    }

    // Find the corresponding path
    let route = this._routes.match(path || '/');

    entry.params = route.params;

    return route.fn.apply(null, [bot, entry]);
  }),

  schedule: async(function (interlocutor, path) {
    if (path && this._routes.match(path)) {
      await (redis.setAsync(`awaiting:${interlocutor.id}`, path));
    }
  }),

  dispatch: async(function (entry) {
    let route;

    // Route text entries to wit
    if (entry.message && entry.message.text && this._wit) {
      let entities = await (this._wit.message({q: entry.message.text}));
      entry.message.entities = entities;
    }

    return await (this.execute(null, entry));
  })

};

module.exports = Dispatcher;
