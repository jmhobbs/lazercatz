require.paths.unshift(__dirname + "/vendor");

var LazerCatz = require('./lib/lazercatz');

require('fs').readFile('config.json', function (err, data) {
    if (err) {
        new LazerCatz({});
    } else {
        new LazerCatz(JSON.parse(data));
    }
});

process.addListener('SIGINT', function () {
    require('sys').log('ABOUT TO COSE!');
    process.exit();
});
