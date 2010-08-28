var mongoose = require('mongoose/mongoose').Mongoose;

mongoose.model('User', {
  properties: [ 'nick', 'uniqueID', 'tile' ],
  indexes: ['uniqueID']
});

module.exports = mongoose;
