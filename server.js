require.paths.unshift(__dirname + "/vendor");

var LazerCatz = require('./lib/lazercatz');

require('fs').readFile('config.json', function (err, data) {
    if (err) throw err;
    new LazerCatz(JSON.parse(data));
});
