'use strict';

const download = require('download');
const fs = require('fs');
const shortid = require('shortid');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const PDFImage = require('pdf-image').PDFImage;
const fetch = require('node-fetch');
const moment = require('moment');
const momentTz = require('moment-timezone');
const querystring = require('querystring');

const redis = require('./redis');

const read = async (function read(id) {
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

    data = await (fetch('http://zxing.org/w/decode?u=' + querystring.escape(`${process.env.HOST}${id}-0.png`))
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

  return data;
});

/**
 * Decode a Eurostar string
 * @param  {String} url
 * @return {Object}
 */
const DECODE_REGEX = /^eRIV([A-Z]{6}).*100(\d{1})(\d{3})(\d{3}).*([A-Z]{2})([A-Z]{3})([A-Z]{2})([A-Z]{3})\d*(\d{4})\d{7}(\d{3})(\d{3})(\d[A-Z])[A-Z]$/;
const DECODE_FIELDS = ['referenceNumber', 'bookingYear', 'bookingDay', 'travelDay', 'fromCountry', 'fromStation', 'toCountry', 'toStation', 'trainNumber', 'coach', 'seat', 'class'];
const decode = function decode(string) {
  let decoded = {};
  let matches = string.replace(/ /g,'').match(DECODE_REGEX);

  DECODE_FIELDS.forEach((key, index) => {
    decoded[key] = matches && matches[index + 1];
  });

  return decoded;
};

/**
 * Normalize a decoded Eurostar object
 * @param  {Object} obj
 * @return {Object}
 */
const STATIONS = {
  SPX: 'LSPI',
  SPI: 'LSPI',
  BMI: 'BMZ',
  PNO: 'PGDN',
  EI: 'EI',
  AI: 'AI',
  CF: 'CF',
  LE: 'LE'
};
const TIMEZONES = {
  GB: 'Europe/London',
  FR: 'Europe/Paris',
  BE: 'Europe/Belgium'
};
const normalize = function normalize (obj) {
  let normalized = {
    from: STATIONS[obj.fromStation],
    to: STATIONS[obj.toStation],
    timezone: TIMEZONES[obj.fromCountry]
  };
  let travelYear = 2010 + Number(obj.bookingYear) + (Number(obj.bookingDay) < Number(obj.travelDay) ? 0 : 1);
  let dayIndex = moment(`${obj.travelDay} ${travelYear}`, 'DDD YYYY').format('d');
  let timeKey = `${obj.trainNumber}:${normalized.from}:${dayIndex}`;

  return redis
    .getAsync(timeKey)
    .then(time => {
      time = time.split(':');

      let date = moment()
        .year(travelYear)
        .dayOfYear(obj.travelDay)
        .hour(time[0])
        .minute(time[1])
        .second(0)
        .millisecond(0)
        .tz(normalized.timezone);

      normalized.date = date.toISOString();
      normalized.format = moment(normalized.date).tz(normalized.timezone).format('HH:mm');

      return normalized;
    });
};

const scan = function scan(url) {
  let id = shortid.generate();

  return Promise
    .resolve()
    // Download the pdf
    .then(() => {
      return download(url);
    })
    // Write the pdf in the temporary folder
    .then(data => {
      return new Promise((resolve, reject) => {
        fs.writeFile(`tmp/${id}.pdf`, data, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    })
    // Read the QR code in the PDF
    .then(() => read(id))
    // Decode the QR code
    .then(decode)
    // Normalize the object
    .then(normalize);
};

/**
 * Populate the redis instance
 * with the Eurostar timetable
 * http://www.eurostar.com/sites/default/files/pdf/timetable/6551%20UK%20issue%2077.pdf
 */
[
  "P P P P P - - 05:40 05:58 06:24 09:17 9080",
  "- - - - - P - 06:18 - 06:55 09:47 9002",
  "P P P P P - - 07:01 - - 10:17 9004",
  "P P P P P P - 07:55 08:12 - 11:17 9008",
  "- - - - - - P 08:19 08:38 - 11:47 9010",
  "P - - - P P - 08:31 - - 11:47 9010",
  "- P P P - - - 08:31 - - 11:47 9010",
  "P P P P P - - 09:17 09:34 09:55 12:47 9014",
  "- - - - - - P 09:22 - 09:55 12:47 9014",
  "- - - - - P - 09:24 09:41 - 12:47 9014",
  "- - - - - - P 10:01 - - 13:17 9016",
  "- - - - - P - 10:01 - - 13:17 9016",
  "P P P P P - P 10:24 10:42 - 13:47 9018",
  "- - - - - P - 11:01 - - 14:17 9020",
  "- - - - - - P 11:01 - - 14:17 9020",
  "- - - - - P - 11:22 - 11:55 14:17 9022",
  "P - - P P - P 11:31 - - 14:47 9022",
  "- P P - - - - 11:31 - - 14:47 9022",
  "P - - P P - - 12:01 - - 15:17 9060",
  "- - - - - P - 12:01 - - 15:17 9060",
  "- P P - - - - 12:01 - - 15:17 9060",
  "P P P P P P P 12:24 12:42 - 15:47 9024",
  "- - - - P P P 13:31 - - 16:47 9028",
  "P P P P - - - 13:31 - - 16:47 9028",
  "- - - - P - P 14:01 - - 17:17 9030",
  "P P P P P P P 14:22 - 14:55 17:47 9032",
  "P P P P P P P 15:31 - - 18:47 9036",
  "- - - - P - P 16:01 - - 19:17 9038",
  "P - - - - - - 16:01 - - 19:17 9038",
  "P P P P P P P 16:31 - - 19:47 9040",
  "P P P P P P P 17:31 - - 20:47 9044",
  "P P P P P - - 18:01 - - 21:17 9046",
  "- - - - P - P 18:31 - - 21:47 9048",
  "- - - - - P - 18:31 - - 21:47 9048",
  "P - - P - - - 18:31 - - 21:47 9048",
  "- P P - - - - 18:31 - - 21:47 9048",
  "P P P P P - P 19:01 - - 22:17 9050",
  "- - - - P - - 19:25 - - 22:47 9052",
  "P P P P P P P 20:01 - - 23:17 9054",
  "- - - - - - P 20:31 - - 23:47 9056",
  "P - - - - - - 06:43 - - 08:02 9005",
  "P P P P P P - 07:13 - - 08:32 9007",
  "P P P P P - - 07:43 - - 09:00 9009",
  "- - - - - P P 08:13 - - 09:30 9011",
  "P - - - - - - 08:43 09:37 - 10:09 9013",
  "- P P P P - - 08:43 09:37 - 10:09 9013",
  "P P P P P P P 09:13 - 10:18 10:39 9015",
  "- - - P P P - 10:13 - - 11:30 9019",
  "P - - - - - - 10:13 - - 11:30 9019",
  "- P P - - - P 10:13 - - 11:30 9019",
  "- - - - P - - 10:43 - - 12:00 9021",
  "- - - - - - P 10:43 - - 12:00 9021",
  "P P P P P P P 11:13 12:07 - 12:39 9023",
  "- - - - - P - 11:43 - - 13:00 9025",
  "P - - - P - P 12:13 - - 13:30 9027",
  "- P P P - - - 12:13 - - 13:30 9027",
  "- - - - - P - 12:13 - - 13:30 9027",
  "P - - P P - - 12:43 - - 14:00 9029",
  "- P P - - - - 12:43 - - 14:00 9029",
  "- - - - - - P 12:43 - 13:48 14:09 9029",
  "- - - - - - P 13:13 - - 14:30 9031",
  "P P P P P P - 13:13 - 14:18 14:39 9031",
  "- - - - - P - 13:43 - - 15:00 9033",
  "- - - - - P P 14:13 - - 15:30 9035",
  "- - - - P - - 14:43 - - 16:02 9037",
  "P - - P - - P 14:43 - - 16:02 9037",
  "- P P - - - - 14:43 - - 16:02 9037",
  "P P P P P P P 15:13 - - 16:30 9039",
  "P P P P P P P 16:13 - 17:18 17:39 9043",
  "- - - - - - P 16:43 17:37 - 18:12 9045",
  "- - - - P - - 16:43 - 17:48 18:12 9045",
  "P P P P P P P 17:13 - - 18:32 9047",
  "P P P P P - P 18:13 - 19:18 19:39 9051",
  "- - - - P - - 18:43 - - 20:02 9053",
  "- P P P - - P 18:43 - - 20:02 9053",
  "P - - - - - - 18:43 - - 20:02 9053",
  "P P P P P P P 19:13 20:07 - 20:39 9055",
  "P P P P P P P 20:13 - 21:18 21:39 9059",
  "- - - - - - P 20:43 - - 22:00 9061",
  "P P P P P - P 21:13 - 22:18 22:39 9063",
  "P - - - - - - 06:13 06:30 06:52 - - 09:28 9108",
  "- P P P P - - 06:50 07:07 07:28 08:59 09:30 10:07 9110",
  "- - - - - P - 06:57 - 07:28 - 09:26 10:05 9110",
  "P - - - - - - 07:19 - 07:55 - 09:51 - 9084",
  "P P P P P - - 08:04 - - - 10:26 11:05 9114",
  "- P P P P - - 08:55 09:15 - - 11:26 12:05 9116",
  "P - - - - - - 08:55 09:15 - 10:59 11:30 12:11 9116",
  "- - - - - P P 08:58 09:15 - 10:59 11:30 12:08 9116",
  "P P P P P P - 10:58 11:15 - - 13:26 14:05 9126",
  "- - - - - - P 11:04 - - - 13:26 14:05 9126",
  "P P P P P P P 12:58 13:15 - 14:59 15:30 16:08 9132",
  "- - - - P - P 14:04 - - - 16:26 17:05 9136",
  "P P P P - - - 14:04 - - - 16:26 17:05 9136",
  "P P P P P - P 15:04 - - - 17:26 18:05 9140",
  "- - - - - P - 16:04 - - - 18:26 19:05 9144",
  "P P P P P - P 17:04 - - - 19:26 20:05 9148",
  "- - - - - P - 17:04 - - - 19:26 20:05 9148",
  "- - - - - - P 17:55 - 18:28 - 20:26 21:05 9152",
  "P P P P P - - 18:04 - - - 20:26 21:05 9152",
  "- - - - - P P 19:04 - - 20:59 21:30 22:08 9156",
  "P P P P P - - 19:34 - - 21:29 22:00 22:38 9158",
  "- - - - - - P 20:03 - - - 22:26 23:05 9162",
  "P - - - - - - 06:56 07:36 - - - 07:59 9109",
  "P P P P P P - 07:56 08:36 - - - 08:59 9113",
  "P P P P P P P 08:52 09:30 10:01 - - 09:57 9117",
  "P P P P P - - 10:56 11:36 - - - 11:57 9125",
  "- - - - - P - 10:56 11:36 - - - 11:57 9125",
  "- - - - - - P 11:56 12:36 - - - 12:57 9129",
  "P P P P P P - 12:52 13:30 14:01 - 13:45 14:05 9133",
  "- - - - - - P 14:52 15:30 16:01 - 15:45 16:05 9141",
  "P P P P P P - 14:56 15:36 - - 15:45 16:05 9141",
  "- - - - P - P 15:56 16:36 - - - 16:57 9145",
  "P P P P - - - 15:56 16:36 - - - 16:57 9145",
  "- - - - - - P 16:56 17:36 - - 17:45 18:03 9149",
  "P P P P P P - 16:56 17:36 - 17:34 - 18:06 9149",
  "P P P P P - - 17:56 18:36 - - 18:45 19:03 9153",
  "- - - - - - P 17:56 18:36 - 18:35 - 19:10 9153",
  "P P P P P - P 18:56 19:35 - - - 19:57 9157",
  "P P P P P P P 19:52 20:30 21:01 - 20:45 21:03 9161"
].forEach(row => {
  row = row.split(' ');

  let stations;
  let days = row.filter((e, i) => (i >= 0) && (i <= 6));
  let times = row.filter((e, i) => (i >= 7) && (i <= row.length - 2));
  let train = row[row.length - 1];


  if (row.length === 12) {
    stations = ['LSPI', 'EI', 'AI', 'PGDN'];
  } else {
    stations = ['LSPI', 'EI', 'AI', 'CF', 'LE', 'BMZ'];
  }

  days.forEach((day, dayIndex) => {
    dayIndex = (dayIndex +  1) % 7;
    if (day !== '-') {
      times.forEach((time, index) => {
        if (time !== '-') {
          let station = stations[index];
          redis.set(`${train}:${station}:${dayIndex}`, time);
        }
      });
    }
  });
});

module.exports = scan;
