'use strict';

const mongoose = require('../lib/mongoose');
const shortid = require('shortid');

const schema = mongoose.Schema({
  _id: {
    type: String,
    'default': shortid.generate
  },
  sold: {
    type: Boolean,
    'default': false
  },
  user: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  paymentUrl: {
    type: String
  },
  from: {
    type: String,
    enum: ['LSPI', 'EI', 'AI', 'CF', 'LE', 'BMZ', 'PGDN'],
    required: true
  },
  to: {
    type: String,
    enum: ['LSPI', 'EI', 'AI', 'CF', 'LE', 'BMZ', 'PGDN'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
  },
  currency: {
    type: String,
    enum: ['GBP', 'EUR']
  }
});

module.exports = mongoose.model('Artist', schema);
