var http     = require('http'),
    sys      = require('sys'),
    url      = require('url'),
    static   = require('node-static/lib/node-static'),
    helpers  = require('./helpers'),
    faye     = require('faye/faye-node'),
    mongoose = require('./models'),
    db       = mongoose.connect('mongodb://nodeko:d66e490cfa7@nodeko.mongohq.com:27055/painted-book'),
    // User  = db.model('User'),
    users    = {};


function User(params) {
    this.nick        = params.nick || 'bobert';
    this.uniqueID    = helpers.createUUID();
    this.offset      = helpers.randomOffset();
    this.orientation = params.orientation || 'south';
    this.deaths      = 0;
    this.kills       = 0;
    this.lastSeen    = new Date();
}

function LazerCatz(options) {
    var self = this;

    self.settings = {
        port: options.port || 80,
        userTTL: options.userTTL || 30 // seconds
    }

    self.init();
}

LazerCatz.prototype.init = function() {
    var self = this;

    self.bayeux = self.createBayeuxServer();
    self.httpServer = self.createHTTPServer();
    self.bayeux.attach(self.httpServer);

    self.createSubscriptions();

    self.lastUserCleansing = new Date();

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
                var user = new User(params);

                self.publish('/join', user);

                users[user.uniqueID] = user;
                user.port = self.settings.port;
                response.end(JSON.stringify( { 'you': user, 'them': users } ));
            } else if (location.pathname == '/quit.json' && request.method == "GET") {
                response.writeHead(200, {
                    'Content-Type': 'application/x-javascript'
                });
                self.publish('/quit', { uniqueID: params.uniqueID } );
                response.end();
            } else if (location.pathname == '/supersecretactiveusercheck') {
                response.writeHead(200, {
                    'Content-Type': 'text/html'
                });

                // there has to be a better way to do this
                var count = 0;
                for ( var idx in users ) { count++; }
                var result = "there are currently " + count + " active users";
                response.end(result);
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

LazerCatz.prototype.publish = function(name, message) {
    this.bayeux.getClient().publish(name, message);
}

LazerCatz.prototype.subscribe = function(name, callback) {
    this.bayeux.getClient().subscribe(name, callback);
}

LazerCatz.prototype.createSubscriptions = function() {
    var self = this;

    self.subscribe('/quit', function(user) {
        delete users[user.uniqueID];
    });

    self.subscribe('/die', function(user) {
        var dier   = users[user.uniqueID],
            killer = users[user.killerID];

        if (dier)   { dier.deaths += 1; }
        if (killer) { killer.kills += 1; }
    });

    self.subscribe('/move', function(user) {
        var now   = new Date(),
            mover = users[user.uniqueID];

        // if somebody moves who is no longer in memory they won't be found
        if (mover) {
            mover.lastSeen    = now;
            mover.offset      = user.offset;
            mover.orientation = user.orientation;
        }

        // move events will occasionally trigger a user cleanse
        if (helpers.secondsBetween(now, self.lastUserCleansing) > 5) {
            self.cleanseUsers(now);
        }
    });
}

LazerCatz.prototype.cleanseUsers = function(time) {
    var self = this;

    for ( var idx in users ) {
        var user = users[idx];
        if (helpers.secondsBetween(time, user.lastSeen) > self.settings.userTTL) {
            sys.log('deleting stale user: '+user.nick);
            self.publish('/quit', { uniqueID: user.uniqueID } );
            delete user;
        }
    }
    self.lastUserCleansing = time;
}

module.exports = LazerCatz;
