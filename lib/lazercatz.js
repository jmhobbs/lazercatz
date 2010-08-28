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
}

LazerCatz.prototype.init = function() {
    var self = this;

    self.bayeux = self.createBayeuxServer();
    self.httpServer = self.createHTTPServer();
    self.bayeux.attach(self.httpServer);

    self.httpServer.listen(self.settings.port);
    sys.log('Server started on PORT ' + self.settings.port);
}

LazerCatz.prototype.createHTTPServer = function() {
    var self = this;

    var server = http.createServer(function(request, response) {
        var file = new static.Server('./static', {
            cache: false
        });

        request.addListener('end', function() {
            var location = url.parse(request.url, true),
            params = (location.query || request.headers);

            if (location.pathname == '/init.json' && request.method == "GET") {
                response.writeHead(200, {
                    'Content-Type': 'application/x-javascript'
                });
                var jsonString = JSON.stringify({
                    port: self.settings.port,
                    uniqueID: '12345',
                    spawnPoint: [50,50]
                });
                self.publishEvent('/join', {uniqueID: '12345', spawnPoint: [50,50]});
                response.end(jsonString);
            } else {
                file.serve(request, response);
            }
        });
    });

    return server;
}

LazerCatz.prototype.createBayeuxServer = function() {
    var self = this;

    var bayeux = new faye.NodeAdapter({
      mount: '/faye',
      timeout: 45
    });

    return bayeux;
}

LazerCatz.prototype.publishEvent = function(name, message) {
    this.bayeux.getClient().publish(name, message);
}

LazerCatz.prototype.createSubscriptions = function() {
    var self = this;

    // self.bayeux.client().subscribe('/join', self.clientJoined);
}

// serial number, nick, spawn point
LazerCatz.prototype.clientJoined = function(message) {
    sys.log('Server started on PORT ' + self.settings.port);
}

module.exports = LazerCatz;
