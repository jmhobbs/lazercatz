var Player = function ( id, offset, sprite, orientation, nick ) {
	this.id = id;
	this.sprite = sprite;
	this.orientation = orientation;
	this.nick = nick;

	this.offset = $.extend( {}, offset );
	this.lastDrawnOffset = $.extend( {}, offset );
	// Does it need a re-draw?
	this.dirty = true;

	// Player health
	this.health = 10;
	// Lazer Charge State
	this.charge = 10;

	// Step animation toggle
	this.step = true;

	// Is the user dead?
	this.dead = function () { return ( this.health <= 0 ); }

	// Get the current correct sprite for this user
	this.getSprite = function () {
		if( this.dead() ) { return 'dead'; }
		else { return this.sprite + '_' + this.orientation + '_' + ( ( this.step ) ? '1' : '2' ); }
	};

	this.move = function ( offset, orientation ) {
		this.step = ! this.step;
		this.offset = offset;
		this.orientation = orientation;
		this.dirty = true;
	};

	this.clear = function ( force ) {
		force = ( "undefined" == typeof( force ) ) ? false : force;
		if( this.dirty || force ) {
			var x_offset = this.lastDrawnOffset[0] - LC.map_offset[0],
			    y_offset = this.lastDrawnOffset[1] - LC.map_offset[1];
			if( LC.inViewport( x_offset, y_offset ) ) {
				LC.clearSprite( x_offset, y_offset );
			}
		}
	};

	this.draw = function ( force ) {
		force = ( "undefined" == typeof( force ) ) ? false : force;
		if( this.dirty || force ) {
			var x_offset = this.offset[0] - LC.map_offset[0],
			    y_offset = this.offset[1] - LC.map_offset[1];
			if( LC.inViewport( x_offset, y_offset ) ) {
				LC.drawSprite( this.getSprite(), x_offset, y_offset );
				this.dirty = false;
				this.lastDrawnOffset = $.extend( {}, this.offset );
			}
		}
	};

};

var Lazer = function ( orientation, strength, origin, owner ) {
	this.offset = origin;
	this.sprite = 'beam_' + orientation;
	if( owner == LC.user.id ) { this.sprite = 'blubeam_' + orientation; }
	this.strength = strength;
	this.owner = owner;
	this.move_by = [0,0];

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

	// We don't want to actually start on the origin (clears our player)
	this.offset[0] = this.offset[0] + this.move_by[0];
	this.offset[1] = this.offset[1] + this.move_by[1];

	this.move = function () {
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
			LC.hit( this.owner, this.strength );
			return;
		}
	};

	this.clear = function () {
		var x_offset = this.offset[0] - LC.map_offset[0],
		    y_offset = this.offset[1] - LC.map_offset[1];
		if( LC.inViewport( x_offset, y_offset ) ) {
			LC.clearSprite( x_offset, y_offset );
		}
	};

	this.draw = function () {
		var x_offset = this.offset[0] - LC.map_offset[0],
		    y_offset = this.offset[1] - LC.map_offset[1];
		if( LC.inViewport( x_offset, y_offset ) ) {
			LC.drawSprite( this.sprite, x_offset, y_offset );
		}
	};

};

var LC = {
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
	// Locked moving!
	moveLock: false,

	/////// CORE ///////
	// Set up
	init: function () {
		$( 'html' ).live( 'keyup', LC.loadingScreens.start.keyUp );
	},

	gameInit: function ( skin, nick ) {
		LC.ctx = document.getElementById( "objects" ).getContext( "2d" );
		LC.map = $( "#map" );
		LC.messages = $( "#messages" );
		LC.users = $( "#userList" ).find( 'ul' );
		LC.sprites = document.getElementById( "sprites" );
		LC.healthBar = $( "#health" ).find( ".remaining" );
		LC.powerBar = $( "#ammo" ).find( ".remaining" );

		$( 'html' ).die( 'keyup' ).live( 'keyup', LC.keyUp );

		$.getJSON(
			'/init.json',
			{ 'nick': nick, 'skin': skin },
			function ( config ) {
				LC.user = new Player( config.you.uniqueID, config.you.offset, skin, 'south', config.you.nick );
				LC.user.health = 0;

				LC.faye = new Faye.Client( "http://" + window.location.hostname + ':' + config.you.port + '/faye', { timeout: 120 } );
				window.onbeforeunload = LC.quit;

				// Load all the other's into the object array & the user list
				for( var i = 0; i < config.them.length; i++) {
					var user = config.them[i];
					if( user.uniqueID != LC.user.id ) {
						LC.players[user.uniqueID] = new Player( user.uniqueID, user.offset, user.skin, user.orientation, user.nick );
						LC.users.append( $( "<li></li>" ).text( user.nick + ": " + user.kills + " kills" ).addClass( user.uniqueID ) );
					}
				}
				// And add yourself
				LC.players[LC.user.id] = LC.user;
				LC.users.append( $( "<li></li>" ).text( LC.user.nick + ": 0 kills" ) .addClass( LC.user.id ) );

				LC.message( LC.user.nick + ' joined the game' );

				// Subscribe to all the various events
				LC.faye.subscribe( '/join', LC.events.join );
				LC.faye.subscribe( '/move', LC.events.move );
				LC.faye.subscribe( '/quit', LC.events.quit );
				LC.faye.subscribe( '/fire', LC.events.fire );
				LC.faye.subscribe( '/hit', LC.events.hit );
				LC.faye.subscribe( '/die', LC.events.die );
				LC.faye.subscribe( '/spawn', LC.events.spawn );
				LC.faye.subscribe( '/leaderboard', LC.events.leaderboard );

				LC.spawn();
				LC.mainLoop();
			}
		);
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
			data: { uniqueID: LC.user.id },
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

	inViewport: function ( x, y ) {
		return ! (
		            x < 0 ||
		            x > LC.VIEWPORT_WIDTH - LC.TILE_WIDTH ||
		            y < 0 ||
		            y > LC.VIEWPORT_HEIGHT - LC.TILE_HEIGHT
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
		if( LC.user.dead() ) { return; }
		switch ( e.which ) {
			case 37:
				LC.move( 'w' );
				break;
			case 38:
				LC.move( 'n' );
				break;
			case 39:
				LC.move( 'e' );
				break;
			case 40:
				LC.move( 's' );
				break;
			case 32:
				LC.fire();
		}
	},

	mainLoop: function () {
		// Check for map move
		var edge_proximity = [
			( LC.map_offset[0] + LC.VIEWPORT_WIDTH - LC.user.offset[0] ),
			( LC.map_offset[1] + LC.VIEWPORT_HEIGHT - LC.user.offset[1] )
		];

		var force = (
			edge_proximity[0] <= LC.MOVE_BUFFER_LOW ||
			edge_proximity[0] >= LC.MOVE_BUFFER_HIGH ||
			edge_proximity[1] >= LC.MOVE_BUFFER_HIGH  ||
			edge_proximity[1] <= LC.MOVE_BUFFER_LOW
		);

		// Clear ( forced if map move, otherwise it's conditional )
		for( var id in LC.players ) {
			LC.players[id].clear( force );
		}
		for( var id in LC.lazers ) {
			LC.lazers[id].clear();
		}

		// Move map (if needed)
		if( edge_proximity[0] <= LC.MOVE_BUFFER_LOW ) { LC.moveMap( LC.TILE_WIDTH, 0 ); }
		if( edge_proximity[0] >= LC.MOVE_BUFFER_HIGH ) { LC.moveMap( -1 * LC.TILE_WIDTH, 0 ); }
		if( edge_proximity[1] >= LC.MOVE_BUFFER_HIGH ) { LC.moveMap( 0, -1 * LC.TILE_HEIGHT ); }
		if( edge_proximity[1] <= LC.MOVE_BUFFER_LOW ) { LC.moveMap( 0, LC.TILE_HEIGHT ); }

		// Lazers Move
		for( var id in LC.lazers ) {
			LC.lazers[id].move();
		}

		// Draw ( again, forced if map move, otherwise it's conditional )
		for( var id in LC.lazers ) {
			LC.lazers[id].draw();
		}
		for( var id in LC.players ) {
			LC.players[id].draw( force );
		}

		// Update UI/state stuff
		if( LC.user.charge < 10 ) {
			LC.user.charge = LC.user.charge + 0.5;
			LC.powerBar.css( "width", Math.floor( LC.user.charge * 10 ) + "%" );
		}

		if( LC.user.health < 0 ) {
			LC.user.health = LC.user.health + 1;
			if( LC.user.health == 0 ) {
				LC.healthBar.css( "width", "100%" );
				LC.user.health = 10;
				LC.user.charge = 10;
				LC.user.dirty = true;
				LC.message( 'Respawn!' );
				LC.faye.publish( '/spawn', { uniqueID: LC.user.id, offset: LC.user.offset } );
				LC.spawn();
			}
			else {
				LC.healthBar.css( "width", 100 - Math.floor( Math.abs( LC.user.health ) / 4 * 10 ) + "%" );
			}
		}

		// And run the loop again!
		setTimeout( LC.mainLoop, 50 );
	},

	move: function ( direction ) {
		LC.moveLock = true;

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
			LC.moveLock = false;
			return;
		}

		// Collisions
		for( var id in LC.players ) {
			if(
				id != LC.user.id &&
				LC.players[id].offset[0] == new_offset[0] &&
				LC.players[id].offset[1] == new_offset[1]
			) {
				// Allow the orientation change, but not the offset
				new_offset = $.extend( {}, LC.user.offset );
				break;
			}
		}

		for( var id in LC.lazers ) {
			if(
				id != LC.user.id &&
				LC.lazers[id].offset[0] == new_offset[0] &&
				LC.lazers[id].offset[1] == new_offset[1]
			) {
				// Allow the orientation change, but not the offset
				new_offset = $.extend( {}, LC.user.offset );
				break;
			}
		}

		LC.user.offset = new_offset;
		LC.user.orientation = new_orientation;
		LC.user.dirty = true;
		LC.faye.publish( '/move', { offset: LC.user.offset, uniqueID: LC.user.id, orientation: LC.user.orientation } );
		setTimeout( function () { LC.moveLock = false; }, 150 );
	},

	spawn: function () {
		// TODO: Random spawn point!
		//LC.ctx.clearRect( 0, 0, LC.VIEWPORT_WIDTH, LC.VIEWPORT_HEIGHT );
		//LC.moveMap( -1 * LC.map_offset[0], -1 * LC.map_offset[1] ); // Back to 0,0
		//LC.moveMap( LC.user.offset[0] - 260, LC.user.offset[1] - 260 ); // Move map out to player
		LC.user.health = 10;
		LC.healthBar.css( "width", "100%" );
		LC.faye.publish( '/spawn', { uniqueID: LC.user.id, offset: LC.user.offset } );
	},

	removeLazer: function ( id ) {
		if( "undefined" != typeof( LC.lazers[id] ) ) {
			LC.lazers[id].clear( true );
			delete LC.lazers[id];
		}
	},

	hit: function ( shooter_id, strength ) {
		LC.removeLazer( shooter_id );
		LC.faye.publish( '/hit', { uniqueID: LC.user.id, shooterID: shooter_id } );
		if( LC.user.dead() ) { return; }
		LC.user.health = LC.user.health - strength;
		if( LC.user.dead() ) {
			LC.user.health = -40;
			LC.healthBar.css( "width", "0%" );
			LC.faye.publish( '/die', { uniqueID: LC.user.id, killerID: shooter_id } );
		}
		else {
			LC.healthBar.css( "width", ( LC.user.health * 10 ) + "%" );
		}
	},

	fire: function () {
		if( LC.user.dead() || LC.user.charge < 10 ) { return; }
		LC.pew.play();
		LC.user.charge = 0;
		LC.removeLazer( LC.user.id );
		var offset = $.extend( {}, LC.user.offset ),
				origin = $.extend( {}, LC.user.offset );
		LC.powerBar.css( "width", "0%" );
		LC.lazers[LC.user.id] = new Lazer( LC.user.orientation, 10, offset, LC.user.id );
		LC.faye.publish( '/fire', { origin: origin, uniqueID: LC.user.id, orientation: LC.user.orientation, strength: 10 } );
	},

	events: {
		join: function ( message ) {
			if( message.uniqueID != LC.user.id ) {
				LC.message( message.nick + ' joined the game' );
				LC.users.append( $( "<li></li>" ).text( message.nick + ": " + message.kills + " kills" ).addClass( message.uniqueID ) );
				LC.players[message.uniqueID] = new Player( message.uniqueID, message.offset, message.skin, message.orientation, message.nick );
			}
		},
		move: function ( message ) {
			if( message.uniqueID != LC.user.id ) {
				LC.players[message.uniqueID].move( message.offset, message.orientation );
			}
		},
		quit: function ( message ) {
			LC.message( LC.players[message.uniqueID].nick + ' quit the game' );
			LC.users.find( '.' + message.uniqueID ).remove();
			LC.players[message.uniqueID].clear( true );
			if( LC.user.id == message.uniqueID ) {
				alert( "Oops! You got booted from the server!\n\nThis happens if you stop moving around for a while.\n\nRefresh To Start A New Game" );
			}
			delete LC.players[message.uniqueID];
		},
		fire: function ( message ) {
			if( message.uniqueID != LC.user.id ) {
				LC.removeLazer( message.uniqueID );
				LC.lazers[message.uniqueID] = new Lazer( message.orientation, message.strength, message.origin, message.uniqueID );
			}
		},
		hit: function ( message ) {
			LC.removeLazer( message.shooterID );
			LC.players[message.uniqueID].dirty = true;
		},
		die: function ( message ) {
			LC.message( LC.players[message.killerID].nick + " killed " + LC.players[message.uniqueID].nick );
			LC.players[message.uniqueID].dirty = true;
			if( message.uniqueID != LC.user.id ) { LC.players[message.uniqueID].health = 0; }
		},
		spawn: function ( message ) {
			if( message.uniqueID != LC.user.id ) {
				LC.players[message.uniqueID].health = 10;
				LC.players[message.uniqueID].dirty = true;
			}
		},
		leaderboard: function ( message ) {
			var leaderBoard = "";
			for( var i = 0; i < message.length; i++ ) {
				leaderBoard += "<li class='" + message[i].uniqueID + "'>" + message[i].nick + ": " + message[i].kills + " kills</li>";
			};
			LC.users.html( leaderBoard );
		}
	},

	loadingScreens: {
		start: {
			option: true,
			keyUp: function ( e ) {
				if( e.which == 38 || e.which == 40 ) {
					LC.loadingScreens.start.option = ! LC.loadingScreens.start.option;
					if( LC.loadingScreens.start.option ) {
						$( "#start-select" ).css( "top", "325px" ).css( "left", "285px" );
					}
					else {
						$( "#start-select" ).css( "top", "375px" ).css( "left", "250px" );
					}
				}
				else if ( e.which == 32 || e.which == 13 ) {
					if( LC.loadingScreens.start.option ) {
						$( "#start-screen" ).hide();
						$( "#name-screen" ).show();
						$( 'html' ).die( 'keyup' ).live( 'keyup', LC.loadingScreens.name.keyUp );
						$( "#name-input" ).focus();
					}
					else {
						$( "#start-screen" ).hide();
						$( "#credits-screen" ).show();
						$( 'html' ).die( 'keyup' ).live( 'keyup', LC.loadingScreens.credits.keyUp );
					}
				}
			}
		},

		credits: {
			keyUp: function ( e ) {
				if ( e.which == 32 || e.which == 13 ) {
					$( "#credits-screen" ).hide();
					$( "#start-screen" ).show();
					$( 'html' ).die( 'keyup' ).live( 'keyup', LC.loadingScreens.start.keyUp );
				}
			}
		},

		name: {
			keyUp: function ( e ) {
				if ( e.which == 13 ) {
					if( $( "#name-input" ).val() == "" ) {
						$( "#name-input" ).focus();
						return;
					}
					LC.loadingScreens.character.name = $( "#name-input" ).val();
					$( "#name-screen" ).hide();
					$( "#character-screen" ).show();
					$( 'html' ).live( 'keyup', LC.loadingScreens.character.keyUp );
				}
			}
		},

		character: {
			option: 2,
			name: "Bobert",
			keyUp: function ( e ) {
				if( e.which == 37 ) {
					--LC.loadingScreens.character.option;
				}
				else if ( e.which == 39 ) {
					++LC.loadingScreens.character.option;
				}
				else if ( e.which == 32 || e.which == 13 ) {
					$( "#character-screen" ).hide().remove();
					$( "#game-screen" ).show();
					$( 'html' ).die( 'keyup' );
					if( LC.loadingScreens.character.option == 1 ) {
						LC.gameInit( 'grn', LC.loadingScreens.character.name );
					}
					else if( LC.loadingScreens.character.option == 2 ) {
						LC.gameInit( 'blu', LC.loadingScreens.character.name );
					}
					else {
						LC.gameInit( 'red', LC.loadingScreens.character.name );
					}
					return;
				}

				if( LC.loadingScreens.character.option > 3 ) {
					LC.loadingScreens.character.option = 1;
				}

				if( LC.loadingScreens.character.option < 1 ) {
					LC.loadingScreens.character.option = 3;
				}

				if( LC.loadingScreens.character.option == 1 ) {
					$( "#character-select" ).css( "left", "236px" );
				}
				else if( LC.loadingScreens.character.option == 2 ) {
					$( "#character-select" ).css( "left", "385px" );
				}
				else {
					$( "#character-select" ).css( "left", "535px" );
				}
			},

		},
	}

};