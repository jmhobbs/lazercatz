var http     = require('http'),
    sys      = require('sys'),
    url      = require('url'),
    static   = require('node-static/lib/node-static'),
    faye     = require('faye/faye-node'),
    mongoose = require('mongoose/mongoose').Mongoose,
    helpers  = require('./helpers');

function LazerCatz(options) {
    var self = this;

    self.settings = {
        port: options.port || 80
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
                var client = self.newClient(params.nick || 'bobert');

                self.publishEvent('/join', client);

                client.port = self.settings.port;
                response.end(JSON.stringify(client));
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

LazerCatz.prototype.newClient = function(nick) {
    var x = Math.floor( Math.random() * 1000 ),
        y = Math.floor( Math.random() * 1000 );

    x = x - ( x % 20 );
    y = y - ( y % 20 );

    return {
        nick: nick,
        uniqueID: helpers.createUUID(),
        spawnPoint: [x,y]
    }
}

module.exports = LazerCatz;
