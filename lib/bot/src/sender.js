'use strict';

const fetch = require('node-fetch');

class Sender {

  constructor(FACEBOOK_PAGE_ACCESS_TOKEN) {
    this.FACEBOOK_PAGE_ACCESS_TOKEN = FACEBOOK_PAGE_ACCESS_TOKEN;
    this.send = this.send.bind(this);
  }

  /**
   * Send the entry to Facebook
   * @param  {Object} entry
   * @return {Promise}
   */
  send(entry) {
    return fetch(`https://graph.facebook.com/v2.6/me/messages?access_token=${this.FACEBOOK_PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      body: JSON.stringify(entry),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    })
      .then(res => res.json());
  }

}

module.exports = Sender;
