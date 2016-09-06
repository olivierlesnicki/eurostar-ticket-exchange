'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

const bot = require('./bot/index');
const Ticket = require('./models/ticket');

var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'tmp')));

app.use('/', bot.router);

app.get('/purchase/success/:user/:ticket', function (req, res) {
  let recipient = {
    id: req.params.user
  };

  Ticket.findOne({
    _id: req.params.ticket
  }).then(ticket => {
    ticket.sold = true;
    return ticket.save();
  }).then(ticket => {
    bot.send({
      recipient,
      message: {
        text: `Thanks for your payment, here's your ticket:`
      }
    });
    bot.send({
      recipient,
      message: {
        attachment: {
          type: 'file',
          url: ticket.url
        }
      }
    });
    res.redirect(ticket.url);
  });
});

app.get('/purchase/error/:user', function (req, res) {
  let recipient = {
    id: req.params.user
  };

  bot.send({
    recipient,
    message: {
      text: 'It looks that the payment has failed. Your PayPal account wasn\'t debited. Is there anything I can help you with?'
    }
  });

  res.send();
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {}
  });
});


module.exports = app;
