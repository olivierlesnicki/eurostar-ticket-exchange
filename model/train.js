'use strict';

const mongoose = require('../lib/mongoose');
const shortid = require('shortid');

const schema = mongoose.Schema({
  _id: {
    type: String,
    'default': shortid.generate
  },
  number: {
    type: Number,
    required: true
  },
  dayOfTheWeek: {
    type: Number,
    required: true
  },
  station: {
    type: String,
    ref: 'Station',
    required: true
  }
});

module.exports = mongoose.model('Train', schema);
