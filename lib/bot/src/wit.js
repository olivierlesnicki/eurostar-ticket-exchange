'use strict';

const fetch = require('node-fetch');
const queryString = require('query-string');
const shortid = require('shortid');

const async = require('asyncawait/async');
const await = require('asyncawait/await');

const request = function request(token, url) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  .then(res => res.json());
};

const WIT = function (WIT_ACCESS_TOKEN) {
  this.WIT_ACCESS_TOKEN = WIT_ACCESS_TOKEN;
};

WIT.prototype = {
  message(options) {
    let url = 'https://api.wit.ai/message?v=20160526';
    let params = queryString.stringify(options);

    return fetch(`${url}&${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.WIT_ACCESS_TOKEN}`
      }
    })
    .then(res => res.json())
    .then(res => res.entities);
  }
};

module.exports = WIT;
