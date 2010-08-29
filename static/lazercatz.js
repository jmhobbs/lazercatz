// Namespace
var LC = {

	startScreen: {
		option: true,
		keyUp: function ( e ) {
			if( e.which == 38 || e.which == 40 ) {
				LC.startScreen.option = ! LC.startScreen.option;
				if( LC.startScreen.option ) {
					$( "#start-select" ).css( "top", "325px" ).css( "left", "285px" );
				}
				else {
					$( "#start-select" ).css( "top", "375px" ).css( "left", "250px" );
				}
			}
			else if ( e.which == 32 || e.which == 13 ) {
				if( LC.startScreen.option ) {
					$( "#start-screen" ).hide().remove();
					$( "#character-screen" ).show();
					$( 'html' ).die( 'keyup' ).live( 'keyup', LC.characterSelectScreen.keyUp );
				}
				else {
					alert( "BORK!" );
				}
			}
		}
	},

	characterSelectScreen: {
		option: 2,
		keyUp: function ( e ) {
			if( e.which == 37 ) {
				--LC.characterSelectScreen.option;
			}
			else if ( e.which == 39 ) {
				++LC.characterSelectScreen.option;
			}
			else if ( e.which == 32 || e.which == 13 ) {
				$( "#character-screen" ).hide().remove();
				$( "#game-screen" ).show();
				$( 'html' ).die( 'keyup' );
				if( LC.characterSelectScreen.option == 1 ) {
					LC.gameInit( 'grn' );
				}
				else if( LC.characterSelectScreen.option == 2 ) {
					LC.gameInit( 'blu' );
				}
				else {
					LC.gameInit( 'red' );
				}
				return;
			}

			if( LC.characterSelectScreen.option > 3 ) {
				LC.characterSelectScreen.option = 1;
			}

			if( LC.characterSelectScreen.option < 1 ) {
				LC.characterSelectScreen.option = 3;
			}

			if( LC.characterSelectScreen.option == 1 ) {
				$( "#character-select" ).css( "left", "236px" );
			}
			else if( LC.characterSelectScreen.option == 2 ) {
				$( "#character-select" ).css( "left", "385px" );
			}
			else {
				$( "#character-select" ).css( "left", "535px" );
			}
		}

	},

	/////// OBJECTS ///////
	player: function ( id, offset, sprite, orientation, nick ) {
		this.id = id;
		this.offset = offset;
		this.sprite = sprite;
		this.orientation = orientation;
		this.nick = nick;
		this.dead = false;
		this.health = 10;
		this.charge = 10;

		this.step = true;
		this.moveLock = false;

		this.getSprite = function () {
			if( this.dead ) { return 'dead'; }
			else { return this.sprite + '_' + this.orientation + '_' + ( ( this.step ) ? '1' : '2' ); }
		};

		this.move = function ( offset, orientation ) {
			this.step = ! this.step;
			this.clear();
			this.offset = offset;
			this.orientation = orientation;
			this.draw();
		};

		this.draw = function () {
			var x_offset = this.offset[0] - LC.map_offset[0],
			    y_offset = this.offset[1] - LC.map_offset[1];

			if(
				x_offset < 0 ||
				x_offset > LC.VIEWPORT_WIDTH - LC.TILE_WIDTH ||
				y_offset < 0 ||
				y_offset > LC.VIEWPORT_HEIGHT - LC.TILE_HEIGHT
			) { return; }
			else {
				LC.drawSprite(
					this.getSprite(),
					x_offset,
					y_offset
				);
			}
		};

		this.clear = function () {
			var x_offset = this.offset[0] - LC.map_offset[0],
			    y_offset = this.offset[1] - LC.map_offset[1];

			if(
				x_offset < 0 ||
				x_offset > LC.VIEWPORT_WIDTH - LC.TILE_WIDTH ||
				y_offset < 0 ||
				y_offset > LC.VIEWPORT_HEIGHT - LC.TILE_HEIGHT
			) { return; }
			else {
				LC.clearSprite(
					x_offset,
					y_offset
				);
			}
		};

		this.hit = function ( shooter_id, strength ) {
			LC.removeLazer( shooter_id );
			if( LC.user.dead ) { return; }
			LC.faye.publish( '/hit', { uniqueID: LC.user.id, shooterID: shooter_id } );
			this.health = this.health - strength;
			if( this.health <= 0 ) {
				LC.healthBar.css( "width", "0%" );
				LC.faye.publish( '/die', { uniqueID: LC.user.id, killerID: shooter_id } );
				LC.user.dead = true;
				setTimeout( LC.respawn, 1000 );
			}
			else {
				LC.healthBar.css( "width", ( this.health * 10 ) + "%" );
			}
		};
	},

	lazer: function ( orientation, strength, origin, owner ) {
		this.offset = origin;
		this.sprite = 'beam_' + orientation;
		if( owner == LC.user.id ) {
			this.sprite = 'blubeam_' + orientation;
		}
		this.strength = 10; // Hardcoded? Say it ain't so!
		this.owner = owner;
		this.move_by = [0,0];
		this.timer = null;

		switch ( orientation ) {
			case 'west':
				this.move_by[0] = LC.TILE_WIDTH;
				break;
			case 'east':
				this.move_by[0] = -1 * LC.TILE_WIDTH;
				break;
			case 'north':
				this.move_by[1] = -1 * LC.TILE_HEIGHT;
				break;
			case 'south':
				this.move_by[1] = LC.TILE_HEIGHT;
				break;
		}

		this.draw = function () {
			if( this.strength <= 0 ) { return; }

			var x_offset = this.offset[0] - LC.map_offset[0],
			    y_offset = this.offset[1] - LC.map_offset[1];

			if(
				x_offset < 0 ||
				x_offset > LC.VIEWPORT_WIDTH - LC.TILE_WIDTH ||
				y_offset < 0 ||
				y_offset > LC.VIEWPORT_HEIGHT - LC.TILE_HEIGHT
			) { return; }
			else {
				LC.drawSprite(
					this.sprite,
					x_offset,
					y_offset
				);
			}
		};

		this.clear = function () {
			var x_offset = this.offset[0] - LC.map_offset[0],
			    y_offset = this.offset[1] - LC.map_offset[1];

			if(
				x_offset < 0 ||
				x_offset > LC.VIEWPORT_WIDTH - LC.TILE_WIDTH ||
				y_offset < 0 ||
				y_offset > LC.VIEWPORT_HEIGHT - LC.TILE_HEIGHT
			) { return; }
			else {
				LC.clearSprite(
					x_offset,
					y_offset
				);
			}
		};

		// TODO: It might be wise to have all lazers collision detect all objects eventually.
		this.move = function () {
			this.clear();
			--this.strength;
			if( 0 >= this.strength ) {
				LC.removeLazer( this.owner );
				return;
			}
			this.offset[0] = this.offset[0] + this.move_by[0];
			this.offset[1] = this.offset[1] + this.move_by[1];

			if(
				this.offset[0] == LC.user.offset[0] &&
				this.offset[1] == LC.user.offset[1]
			) {
				// Step back so we don't erase the other character
				this.offset[0] = this.offset[0] - this.move_by[0];
				this.offset[1] = this.offset[1] - this.move_by[1];
				LC.user.hit( this.owner, this.strength );
				return;
			}

			this.draw();
			var self = this;
			this.timer = setTimeout( function () { self.move(); } , 50 );
		};

		this.offset[0] = this.offset[0] + this.move_by[0];
		this.offset[1] = this.offset[1] + this.move_by[1];
		if(
				this.offset[0] == LC.user.offset[0] &&
				this.offset[1] == LC.user.offset[1]
			) {
				// Step back so we don't erase the other character
				this.offset[0] = this.offset[0] - this.move_by[0];
				this.offset[1] = this.offset[1] - this.move_by[1];
				LC.user.hit( this.owner, this.strength );
				return;
		}

		this.draw();
		var self = this;
		this.timer = setTimeout( function () { self.move(); } , 50 );
	},

	/////// CONSTANTS ///////
	// Size of a tile
	TILE_WIDTH: 40,
	TILE_HEIGHT: 40,
	// Total map size
	MAP_WIDTH: 2000,
	MAP_HEIGHT: 2000,
	// Size of the visible area
	VIEWPORT_WIDTH: 640,
	VIEWPORT_HEIGHT: 600,
	// How close you can get to the edge of the viewport before the map moves
	MOVE_BUFFER_HIGH: 540,
	MOVE_BUFFER_LOW: 100,
	// A map of where to find different tiles in the sprite image
	sprite_map: {
		// name_orientation :  [ x, y,  w,  h ]
		'dead'       :  [ 0, 160, 40, 40 ],
		'grn_south_1':  [ 0, 0, 40, 40 ],
		'grn_south_2':  [ 40, 0, 40, 40 ],
		'grn_north_1':  [ 80, 0, 40, 40 ],
		'grn_north_2':  [ 120, 0, 40, 40 ],
		'grn_east_1' :  [ 160, 0, 40, 40 ],
		'grn_east_2' :  [ 200, 0, 40, 40 ],
		'grn_west_1' :  [ 240, 0, 40, 40 ],
		'grn_west_2' :  [ 280, 0, 40, 40 ],
		'blu_south_1':  [ 0, 40, 40, 40 ],
		'blu_south_2':  [ 40, 40, 40, 40 ],
		'blu_north_1':  [ 80, 40, 40, 40 ],
		'blu_north_2':  [ 120, 40, 40, 40 ],
		'blu_east_1' :  [ 160, 40, 40, 40 ],
		'blu_east_2' :  [ 200, 40, 40, 40 ],
		'blu_west_1' :  [ 240, 40, 40, 40 ],
		'blu_west_2' :  [ 280, 40, 40, 40 ],
		'red_south_1':  [ 0, 80, 40, 40 ],
		'red_south_2':  [ 40, 80, 40, 40 ],
		'red_north_1':  [ 80, 80, 40, 40 ],
		'red_north_2':  [ 120, 80, 40, 40 ],
		'red_east_1' :  [ 160, 80, 40, 40 ],
		'red_east_2' :  [ 200, 80, 40, 40 ],
		'red_west_1' :  [ 240, 80, 40, 40 ],
		'red_west_2' :  [ 280, 80, 40, 40 ],
		'beam_south':  [ 0, 120, 40, 40 ],
		'beam_north':  [ 80, 120, 40, 40 ],
		'beam_east' :  [ 160, 120, 40, 40 ],
		'beam_west' :  [ 240, 120, 40, 40 ],
		'blubeam_south':  [ 40, 120, 40, 40 ],
		'blubeam_north':  [ 120, 120, 40, 40 ],
		'blubeam_east' :  [ 200, 120, 40, 40 ],
		'blubeam_west' :  [ 280, 120, 40, 40 ]
	},

	/////// ELEMENTS ///////
	// Canvas contenxt
	ctx: null,
	// Map element (background)
	map: null,
	// Sprites origin
	sprites: null,
	// Faye client (communications)
	faye: null,
	// Overlay for text messages
	messages: null,
	// User list
	users: null,
	// State bars
	healthBar: null,
	powerBar: null,

	// Sound effects!
	pew: null,

	/////// STATE ///////
	// Offset from 0,0 the viewable map is (pixels, not tiles)
	map_offset: [ 0, 0 ],
	// Stored data on the player
	user: null,
	// An array of players currently on the map
	players: [],
	// An array of lazers currently on the map
	lazers: [],

	/////// CORE ///////
	// Set up
	init: function () {
		$( 'html' ).live( 'keyup', LC.startScreen.keyUp );
	},

	gameInit: function ( skin ) {
		LC.ctx = document.getElementById( "objects" ).getContext( "2d" );
		LC.map = $( "#map" );
		LC.messages = $( "#messages" );
		LC.users = $( "#userList" ).find( 'ul' );
		LC.sprites = document.getElementById( "sprites" );
		$( 'html' ).live( 'keyup', LC.keyUp );

		LC.healthBar = $( "#health" ).find( ".remaining" );
		LC.powerBar = $( "#ammo" ).find( ".remaining" );

		var nick = "";
		while( null == nick || 0 == nick.length ) {
			nick = prompt( "Enter Your Username:", "" );
		}

		$.getJSON( '/init.json', { 'nick': nick }, function ( config ) {
			LC.user = new LC.player( config.you.uniqueID, config.you.offset, skin, 'south', config.you.nick );
			LC.user.dead = true;
			LC.faye = new Faye.Client( "http://" + window.location.hostname + ':' + config.you.port + '/faye', { timeout: 120 } );

			window.onbeforeunload = LC.quit;

			// Load all the other's into the object array & the user list
			for( var i = 0; i < config.them.length; i++) {
				var user = config.them[i];
				if( user.uniqueID != LC.user.id ) {
					LC.players[user.uniqueID] = new LC.player( user.uniqueID, user.offset, 'blu', user.orientation, user.nick );
					LC.users.append( $( "<li></li>" ).text( user.nick + " has " + user.kills + " kills" ).addClass( user.uniqueID ) );
			    }
			}

			LC.message( LC.user.nick + ' joined the game' );
			LC.users.append( $( "<li></li>" ).text( LC.user.nick + " has 0 kills" ) .addClass( LC.user.id ) );
			LC.players[LC.user.id] = LC.user;

			LC.faye.subscribe( '/join', function ( message ) {
				if( message.uniqueID != LC.user.id ) {
					LC.message( message.nick + ' joined the game' );
					LC.users.append( $( "<li></li>" ).text( message.nick + " has " + message.kills + " kills" ).addClass( message.uniqueID ) );
					LC.players[message.uniqueID] = new LC.player( message.uniqueID, message.offset, 'red', 'south', message.nick );
					LC.players[message.uniqueID].draw();
				}
			} );

			LC.faye.subscribe( '/move', function ( message ) {
				if( message.uniqueID != LC.user.id ) {
					LC.players[message.uniqueID].move( message.offset, message.orientation );
				}
			} );

			LC.faye.subscribe( '/quit', function ( message ) {
				LC.message( LC.players[message.uniqueID].nick + ' quit the game' );
				LC.users.find( '.' + message.uniqueID ).remove();
				LC.players[message.uniqueID].clear();
				delete LC.players[message.uniqueID];
			} );

			LC.faye.subscribe( '/fire', function ( message ) {
				if( message.uniqueID != LC.user.id ) {
					LC.removeLazer( message.uniqueID );
					LC.lazers[message.uniqueID] = new LC.lazer( message.orientation, message.strength, message.origin, message.uniqueID );
				}
			} );

			LC.faye.subscribe( '/hit', function ( message ) {
				LC.removeLazer( message.shooterID );
				LC.players[message.uniqueID].clear();
				LC.players[message.uniqueID].draw();
			} );

			LC.faye.subscribe( '/die', function ( message ) {
				LC.message( LC.players[message.killerID].nick + " killed " + LC.players[message.uniqueID].nick );
				LC.players[message.uniqueID].clear();
				LC.players[message.uniqueID].dead = true;
				LC.players[message.uniqueID].draw();
			} );

			LC.faye.subscribe( '/spawn', function ( message ) {
				LC.players[message.uniqueID].clear();
				LC.players[message.uniqueID].dead = false;
				LC.players[message.uniqueID].offset[0] = message.offset[0];
				LC.players[message.uniqueID].offset[1] = message.offset[1];
				LC.players[message.uniqueID].draw();
			} );

			LC.faye.subscribe( '/leaderboard', function ( message ) {
				var leaderBoard = "";
				for (var i=0; i < message.length; i++) {
					leaderBoard += "<li class='" + message[i].uniqueID + "'>" + message[i].nick + " has " + message[i].kills + " kills</li>";
				};
				LC.users.html(leaderBoard);
			} );

			LC.spawn();
		} );

	},

	soundReady: function () {
		LC.pew = soundManager.createSound( { id: 'pew-pew-pew', url: 'pew.mp3' } );
	},

	message: function ( message ) {
		LC.messages.html( message + '<br/>' + LC.messages.html() );
	},

	quit: function () {
		$.ajax({
			url: "/quit.json",
			dataType: 'json',
			data: {uniqueID: LC.user.id},
			async: false,
			success: function() { alert( "Thanks For Playing!\nPlease Take A Moment To Vote For Us!\nhttp://nodeknockout.com/teams/lazercatz" ); }
		});
	},

	// Clear the space a sprite is currently taking up.
	clearSprite: function ( x, y ) {
		LC.ctx.clearRect( x, y, LC.TILE_WIDTH, LC.TILE_HEIGHT );
	},

	// Draw a new sprite on the screen. Doesn't overlay, clears.
	drawSprite: function ( sprite, x, y ) {
		LC.ctx.clearRect( x, y, LC.TILE_WIDTH, LC.TILE_HEIGHT );
		LC.ctx.drawImage(
			LC.sprites,
			LC.sprite_map[sprite][0],
			LC.sprite_map[sprite][1],
			LC.sprite_map[sprite][2],
			LC.sprite_map[sprite][3],
			x,
			y,
			LC.sprite_map[sprite][2],
			LC.sprite_map[sprite][3]
		);
	},

	// Shift the map in behind the user
	moveMap: function ( x, y ) {
		LC.map_offset[0] = LC.map_offset[0] + x;
		LC.map_offset[1] = LC.map_offset[1] + y;

		if( LC.map_offset[0] < 0 ) { LC.map_offset[0] = 0; }
		if( LC.map_offset[1] < 0 ) { LC.map_offset[1] = 0; }
		if( LC.map_offset[0] >= ( LC.MAP_WIDTH - LC.VIEWPORT_WIDTH ) ) { LC.map_offset[0] = LC.MAP_WIDTH - LC.VIEWPORT_WIDTH; }
		if( LC.map_offset[1] >= ( LC.MAP_HEIGHT - LC.VIEWPORT_HEIGHT ) ) { LC.map_offset[1] = LC.MAP_HEIGHT - LC.VIEWPORT_HEIGHT; }

		LC.map.css(
			'background-position',
			'-' + LC.map_offset[0] + 'px -' + LC.map_offset[1] + 'px'
		);
	},

	// Capture key events and trigger actions based on them
	keyUp: function ( e ) {
		if( LC.user.dead ) { return; }
		switch ( e.which ) {
			case 37:
				LC.moveUser( 'w' );
				break;
			case 38:
				LC.moveUser( 'n' );
				break;
			case 39:
				LC.moveUser( 'e' );
				break;
			case 40:
				LC.moveUser( 's' );
				break;
			case 32:
				LC.fire();
		}
	},

	removeLazer: function ( id ) {
		if( 'undefined' != typeof( LC.lazers[id] ) ) {
			clearTimeout( LC.lazers[id].timer );
			LC.lazers[id].clear();
			delete LC.lazers[id];
		}
	},

	/////// GAMEPLAY ///////
	// Spawn the user at the given point
	spawn: function () {

		for( var obj in LC.players ) {
			if( obj != LC.user.id ) { LC.players[obj].clear(); }
		}

		LC.user.clear();

		LC.moveMap( -1 * LC.map_offset[0], -1 * LC.map_offset[1] ); // Back to 0,0
		LC.moveMap( LC.user.offset[0] - 260, LC.user.offset[1] - 260 ); // Move map out to player

		LC.user.dead = false;
		LC.user.health = 10;
		LC.healthBar.css( "width", "100%" );
		LC.user.draw();

		for( var obj in LC.players ) {
			if( obj != LC.user.id ) { LC.players[obj].draw(); }
		}

		LC.faye.publish( '/spawn', { uniqueID: LC.user.id, offset: LC.user.offset } );
	},

	// Move the user one tile in a direction (n,s,e,w)
	moveUser: function ( direction ) {
		if( LC.user.dead || LC.user.moveLock ) { return; }

		LC.user.moveLock = true;

		var new_offset = $.extend( {}, LC.user.offset ); // Shallow copy
		switch( direction ) {
			case 'w':
				new_offset[0] = LC.user.offset[0] - LC.TILE_HEIGHT;
				new_orientation = 'east';
				break;
			case 'e':
				new_offset[0] = LC.user.offset[0] + LC.TILE_HEIGHT;
				new_orientation = 'west';
				break;
			case 'n':
				new_offset[1] = LC.user.offset[1] - LC.TILE_WIDTH;
				new_orientation = 'north';
				break;
			case 's':
				new_offset[1] = LC.user.offset[1] + LC.TILE_WIDTH;
				new_orientation = 'south';
				break;
		}

		// No leaving the map!
		if( new_offset[0] >= LC.MAP_WIDTH || new_offset[1] >= LC.MAP_HEIGHT || new_offset[0] < 0 || new_offset[1] < 0 ) {
			LC.user.moveLock = false;
			return;
		}

		// Collisions
		for( var obj in LC.players ) {
			if(
				obj != LC.user.id &&
				LC.players[obj].offset[0] == new_offset[0] &&
				LC.players[obj].offset[1] == new_offset[1]
			) {
				LC.user.moveLock = false;
				return;
			}
		}

		for( var obj in LC.lazers ) {
			if(
				obj != LC.user.id &&
				LC.lazers[obj].offset[0] == new_offset[0] &&
				LC.lazers[obj].offset[1] == new_offset[1]
			) {
				LC.user.moveLock = false;
				return;
			}
		}

		LC.user.clear();
		for( var obj in LC.players ) {
			if( obj != LC.user.id ) { LC.players[obj].clear(); }
		}
		for( var obj in LC.lazers ) {
			LC.lazers[obj].clear();
		}

		LC.user.offset = new_offset;
		LC.user.orientation = new_orientation;

		edge_proximity = [
			( LC.map_offset[0] + LC.VIEWPORT_WIDTH - LC.user.offset[0] ),
			( LC.map_offset[1] + LC.VIEWPORT_HEIGHT - LC.user.offset[1] )
		]

		if( 'e' == direction && edge_proximity[0] <= LC.MOVE_BUFFER_LOW ) { LC.moveMap( LC.TILE_WIDTH, 0 ); }
		if( 'w' == direction && edge_proximity[0] >= LC.MOVE_BUFFER_HIGH ) { LC.moveMap( -1 * LC.TILE_WIDTH, 0 ); }
		if( 'n' == direction && edge_proximity[1] >= LC.MOVE_BUFFER_HIGH ) { LC.moveMap( 0, -1 * LC.TILE_HEIGHT ); }
		if( 's' == direction && edge_proximity[1] <= LC.MOVE_BUFFER_LOW ) { LC.moveMap( 0, LC.TILE_HEIGHT ); }

		LC.user.step = ! LC.user.step;
		LC.user.draw();
		for( var obj in LC.players ) {
			if( obj != LC.user.id ) { LC.players[obj].draw(); }
		}
		for( var obj in LC.lazers ) {
			LC.lazers[obj].draw();
		}

		LC.faye.publish( '/move', { offset: LC.user.offset, uniqueID: LC.user.id, orientation: LC.user.orientation } );

		setTimeout( function () { LC.user.moveLock = false; }, 150 );
	},

	fire: function () {
		if( LC.user.dead || LC.user.charge < 10 ) { return; }
		LC.pew.play();
		LC.user.charge = 0;
		LC.removeLazer( LC.user.id );
		var offset = $.extend( {}, LC.user.offset ),
				origin = $.extend( {}, LC.user.offset );
		LC.powerBar.css( "width", "0%" );

		LC.lazers[LC.user.id] = new LC.lazer( LC.user.orientation, 10, offset, LC.user.id );
		LC.faye.publish( '/fire', { origin: origin, uniqueID: LC.user.id, orientation: LC.user.orientation, strength: 5 } );
		setTimeout( LC.recharge, 100 );
	},

	recharge: function () {
		++LC.user.charge;
		LC.powerBar.css( "width", ( LC.user.charge * 10 ) + "%" );
		if( LC.user.charge == 10 ) { return; }
		else { setTimeout( LC.recharge, 100 ); }
	},

	respawn: function () {
		LC.user.health = LC.user.health + 2;
		if( LC.user.health >= 10 ) { LC.spawn(); }
		else {
			LC.message( "Respawn in " + ( ( 10 - LC.user.health ) / 2 ) + "..." );
			setTimeout( LC.respawn, 1000 );
		}
	}

}
