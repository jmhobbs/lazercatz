var http     = require('http'),
    sys      = require('sys'),
    url      = require('url'),
    static   = require('node-static/lib/node-static'),
    faye     = require('faye/faye-node'),
    mongoose = require('mongoose/mongoose').Mongoose;

function LazerCatz(options) {
    var self = this;

    self.settings = {
        port: options.port || 8080
    }

    self.init();
};

LazerCatz.prototype.init = function() {
  var self = this;
  self.httpServer = self.createHTTPServer();
  self.httpServer.listen(self.settings.port);
  sys.log('Server started on PORT ' + self.settings.port);
};

LazerCatz.prototype.createHTTPServer = function() {
    var self = this;

    var server = http.createServer(function(request, response) {
        var file = new static.Server('./static', {
            cache: false
        });

        request.addListener('end', function() {
            var location = url.parse(request.url, true),
            params = (location.query || request.headers);

            if (location.pathname == '/config.json' && request.method == "GET") {
                response.writeHead(200, {
                    'Content-Type': 'application/x-javascript'
                });
                var jsonString = JSON.stringify({
                    port: self.settings.port
                });
                response.end(jsonString);
            } else {
                file.serve(request, response);
            }
        });
    });

    return server;
}

module.exports = LazerCatz;
