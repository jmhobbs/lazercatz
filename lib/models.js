var mongoose = require('mongoose/mongoose').Mongoose;

mongoose.model('User', {
  properties: [ 'nick', 'uniqueID', 'offset', 'deaths' ],
  indexes: ['uniqueID']
});

module.exports = mongoose;
