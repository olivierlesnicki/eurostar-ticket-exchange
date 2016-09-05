'use strict';

const mongoose = require('../lib/mongoose');
const shortid = require('shortid');

const schema = mongoose.Schema({
  _id: {
    type: String,
    'default': shortid.generate
  },
  name: {
    type: String,
    required: true
  },
  country: {
    type: String,
    enum: ['FR', 'BE', 'GB'],
    required: true
  }
});

const Station = mongoose.model('Station', schema);

[
  ['London St Pancras International', 'GB', 'SPX'],
  ['Ebbsfleet International', 'GB'],
  ['Ashford International', 'GB'],
  ['Paris Gare du Nord', 'GB', 'PNO'],
  ['Calais Fréthun', 'FR'],
  ['Lille Europe', 'FR'],
  ['Brussels Midi/Zuid', 'BE', 'BMI'],
].forEach(entry => {
  Promise
    .resolve()
    .then(() => {
      return Station.findOne({
        name: entry[0]
      });
    })
    .then(station => {
      console.log(station);
      if (!station) {
        station = new Station();
      }

      station.name = entry[0];
      station.country = entry[1];
      station.code = entry[2];

      return station.save();
    });
});

module.exports = Station;
