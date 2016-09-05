'use strict';

const Bot = require('../lib/bot');

const PDFImage = require('pdf-image').PDFImage;
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const download = require('download');
const fetch = require('node-fetch');
const shortid = require('shortid');
const fs = require('fs');
const querystring = require('querystring');

const Station = require('../model/station');

const redis = require('../lib/redis');

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
      await (download(pdf.payload.url).then(data => {
        fs.writeFileSync(`tmp/${id}.pdf`, data);
      }));

      let gravities = ['NorthEast', 'SouthEast'];
      let gravity = gravities.pop();
      let data;

      while (gravity && !data) {
        let pdfImage = new PDFImage(`tmp/${id}.pdf`, {
          convertOptions: {
            '-density': 150,
            '-depth': 96,
            '-quality': 85,
            '-gravity': gravity,
            '-crop': '50%x50%+0+0'
          }
        });
        await (pdfImage.convertPage(0));

        data = await (fetch('http://zxing.org/w/decode?u=' + querystring.escape(`https://08b8b289.ngrok.io/${id}-0.png`))
          .then(res => res.text())
          .then(res => {
            let m = res.match(/<pre>(.+)<\/pre>/i);
            if (m && m[1]) {
              return m[1].trim();
            } else {
              return '';
            }
          })
        );

        if (!data) {
          fs.unlinkSync(`tmp/${id}-0.png`);
        }

        gravity = gravities.pop();
      }

      if (!data) {
        await (bot.say('This doesn\'t look like a valid Eurostar ticket.'));
      } else {
        await (bot.say(data));
        await (bot.say(`https://08b8b289.ngrok.io/${id}-0.png`));
      }
    }
  })();
});

bot.use('/sell-ticket/:id/price', function (bot, entry) {
  async (() => {
    if (entry.message.entities && entry.message.entities.amount_of_money) {
      console.log(entry.message.entities.amount_of_money);
    }
  })();
});

bot.use('/sell-ticket/paypal-email', function (bot, entry) {
  async (() => {
  })();
});

bot.use('/buy-ticket', function (bot, entry) {
  bot.say('I\'m afraid we\'ve ran out of ticket.');
});


module.exports = bot;
