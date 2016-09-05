'use strict';

const express = require('express');

module.exports = function (FACEBOOK_VERIFY_TOKEN, callback) {
  let router = express.Router();

  router.get('/', function (req, res) {
    if (
      req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === FACEBOOK_VERIFY_TOKEN
    ) {
      res.send(req.query['hub.challenge']);
    } else {
      res.status(403);
      res.send();
    }
  });

  router.post('/', function (req, res) {
    let data = req.body;
    if (data.object === 'page') {
      data.entry.forEach(entry => {
        entry.messaging.forEach(e => {
          callback(e);
        });
      });
    }
    res.send();
  });

  return router;
};
