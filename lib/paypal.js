'use strict';

let Paypal = require('paypal-adaptive');
let path = require('path');
let btoa = require('btoa');
const currencies = require('./currencies');

let paypal = new Paypal({
  userId: process.env.PAYPAL_SECURITY_USERID,
  password: process.env.PAYPAL_SECURITY_PASSWORD,
  signature: process.env.PAYPAL_SECURITY_SIGNATURE,
  appId: process.env.PAYPAL_APPLICATION_ID,
  sandbox: process.env.NODE_ENV !== 'production'
});

function profile(email) {
  return new Promise((resolveFetchProfile, rejectFetchProfile) => {
    var promise = Promise.resolve(),
      profile = {
        id: email,
        email,
        exists: true,
        currencies: []
      };

    currencies.forEach((currency, i) => {
      promise = promise.then(() => new Promise((resolve, reject) => {
        fetchPaymentApprovalUrl({
          receivers: [{
            email,
            amount: 1,
            primary: true
          }, {
            email: process.env.PAYPAL_EMAIL,
            amount: 1,
            primary: false
          }],
          currency
        }).then(() => {
          profile.currencies.push(currency);
          resolve();
        }, err => {
          if (err && err.errorId === '559044') {
            resolve();
          } else if (err && err.errorId === '520009') {
            profile.exists = false;
            resolveFetchProfile(profile);
          } else {
            reject(err);
          }
        });
      }));
    });

    promise
      .then(() => resolveFetchProfile(profile), rejectFetchProfile);
  });
}

function fetchPaymentApprovalUrl(params) {

  params = params || {};

  let payload = {
    requestEnvelope: {
      errorLanguage:  'en_US'
    },
    actionType: 'PAY',
    currencyCode: params.currency || 'GBP',
    feesPayer: 'PRIMARYRECEIVER',
    memo: params.memo || 'fileship.io',
    cancelUrl: params.errorURI || process.env.API_DOMAIN,
    returnUrl: params.successURI || process.env.API_DOMAIN,
    receiverList: {
      receiver: params.receivers
    }
  };

  return new Promise((resolve, reject) => {
    paypal.pay(payload, (err, response) => {
      if (err) {
        let error = response && response.error && response.error.length && response.error[0];
        reject(error || err);
      } else {
        resolve(response.paymentApprovalUrl);
      }
    });
  });

}

module.exports = {
  fetchPaymentApprovalUrl,
  profile
};
