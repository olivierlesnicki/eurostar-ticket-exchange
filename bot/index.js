'use strict';

const PDFImage = require('pdf-image').PDFImage;
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const download = require('download');
const fetch = require('node-fetch');
const shortid = require('shortid');
const fs = require('fs');
const querystring = require('querystring');

const Ticket = require('../models/ticket');
const Bot = require('../lib/bot');
const scan = require('../lib/scan');
const paypal = require('../lib/paypal');

const CURRENCIES = {
  '£': 'GBP',
  '€': 'EUR'
};

// Instantiate the bot
const bot = new Bot({
  FACEBOOK_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
  FACEBOOK_VERIFY_TOKEN: process.env.FACEBOOK_VERIFY_TOKEN,
  WIT_ACCESS_TOKEN: process.env.WIT_ACCESS_TOKEN
});

bot.use('/', function (bot, entry) {
  async (() => {
    if (entry.message.entities && entry.message.entities.intent) {
      if (entry.message.entities.intent.find(i => i.value === 'buy-ticket')) {
        await (bot.execute('/buy-ticket'));
      } else if (entry.message.entities.intent.find(i => i.value === 'sell-ticket')) {
        await (bot.execute('/sell-ticket'));
      }
    } else if (entry.message && entry.message.attachments && entry.message.attachments.find(a => a.type === 'file')) {
      await (bot.execute('/sell-ticket/pdf'));
    }
  })();
});

bot.use('/sell-ticket', function (bot, entry) {
  async (() => {
    await (bot.ask('OK, send me the PDF version of your ticket. Only the person who will pay for it will be able to access it.', '/sell-ticket/pdf'));
  })();
});

bot.use('/sell-ticket/pdf', function (bot, entry) {
  async (() => {
    let id = shortid.generate();

    if (entry.message && entry.message.attachments) {
      let pdf = entry.message.attachments.find(a => a.type === 'file');
      let url = pdf.payload.url;
      let data = await (scan(url));

      if (!data) {
        await (bot.say('This doesn\'t look like a valid Eurostar ticket.'));
      } else {
        let ticket = new Ticket({
          url,
          user: entry.sender.id,
          from: data.from,
          to: data.to,
          date: new Date(data.date)
        });
        await (ticket.save());
        await (bot.ask('Great. How much do you want to charge for this ticket?', `/sell-ticket/${ticket._id}/price`));
      }
    }
  })();
});

bot.use('/sell-ticket/:id/price', function (bot, entry) {
  async (() => {
    if (entry.message.entities && entry.message.entities.amount_of_money) {
      let ticket = await (Ticket.findOne({_id: entry.params.id}));

      ticket.price = entry.message.entities.amount_of_money[0].value;
      ticket.currency = CURRENCIES[entry.message.entities.amount_of_money[0].unit];

      await (ticket.save());
      await (bot.ask('What is your PayPal e-mail?'));
    }
  })();
});

bot.use('/sell-ticket/paypal-email', function (bot, entry) {
  async (() => {
    let email = entry.message.text.trim();
    let ticket = await (Ticket.findOne({_id: entry.params.id}));
    let paymentUrl = await (paypal.fetchPaymentApprovalUrl({
      currency: ticket.currency,
      memo: 'Eurostar Ticket Exchange',
      successURI: `${process.env.API_HOST}purchase/success/${entry.sender.id}/${ticket._id}`,
      errorURI: `${process.env.API_HOST}purchase/error/${entry.sender.id}`,
      receivers: [{
        email,
        amount: ticket.price,
        primary: true
      }]
    }));

    ticket.paymentUrl = paymentUrl;
    await (ticket.save());

    await (bot.say('It\'s all done. I\'ll notify you as soon as someone buys your ticket and transfer the money in your PayPal account.'));
    await (bot.say('If ever you sell your ticket through other means or decide to change its price let me know.'));
  })();
});


module.exports = bot;
