const moment = require('moment');

function formatMessage(username, text) {
  return {
    username: username, // with ES6 just writing username is Okay
    text: text,
    time: moment().format('h:mm a')
  };
}

module.exports = formatMessage;
