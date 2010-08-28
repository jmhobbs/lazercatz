require.paths.unshift(__dirname + "/vendor");

var static = require('node-static/lib/node-static');

var file = new(static.Server)('./static');

require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        // Serve files!
        file.serve(request, response);
    });
}).listen(8080);
