var http     = require('http'),
    sys      = require('sys'),
    url      = require('url'),
    static   = require('node-static/lib/node-static'),
    helpers  = require('./helpers'),
    faye     = require('faye/faye-node'),
    mongoose = require('./models'),
    db       = mongoose.connect('mongodb://nodeko:d66e490cfa7@nodeko.mongohq.com:27055/painted-book'),
    User     = db.model('User');


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

    self.createSubscriptions();

    self.clientObjects = {};

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

                self.publish('/join', client);

                self.clientObjects[client.uniqueID] = client;

                client.port = self.settings.port;
                response.end(JSON.stringify( { 'you': client, 'them': self.clientObjects } ));
            } else if (location.pathname == '/quit.json' && request.method == "GET") {
                response.writeHead(200, {
                    'Content-Type': 'application/x-javascript'
                });
                delete self.clientObjects[params.uniqueID];
                self.publish('/quit', { uniqueID: params.uniqueID } );
                response.end();
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

LazerCatz.prototype.newClient = function(nick) {
    var x = Math.floor( Math.random() * 1000 ),
        y = Math.floor( Math.random() * 1000 );

    x = x - ( x % 40 );
    y = y - ( y % 40 );

    return {
        nick: nick,
        uniqueID: helpers.createUUID(),
        offset: [x,y]
    }
}

LazerCatz.prototype.publish = function(name, message) {
    this.bayeux.getClient().publish(name, message);
}

LazerCatz.prototype.subscribe = function(name, callback) {
    this.bayeux.getClient().subscribe(name, callback);
}

LazerCatz.prototype.createSubscriptions = function() {
    this.subscribe('/join', this.createUser);
    this.subscribe('/quit', this.destroyUser);
	this.subscribe('/move', this.moveUser);
}

LazerCatz.prototype.createUser = function(user) {
    var  u     = new User();
    u.nick     = user.nick;
    u.uniqueID = user.uniqueID;
    u.offset   = user.offset;
	u.deaths   = 0;
    u.save(function() {
       sys.log('user '+u.nick+' saved!');
    });
}

LazerCatz.prototype.destroyUser = function(user) {
    User.remove({uniqueID: user.uniqueID}, function() {
        sys.log('user '+user.uniqueID+' destroyed!');
    });
}

LazerCatz.prototype.moveUser = function(user) {
}

module.exports = LazerCatz;
