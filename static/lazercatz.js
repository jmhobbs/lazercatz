// Namespace
var LC = {

	/////// OBJECTS ///////
	player: function ( id, offset, sprite, orientation, nick ) {
		this.id = id;
		this.offset = offset;
		this.sprite = sprite;
		this.orientation = orientation;
		this.nick = nick;

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
					this.sprite + '_' + this.orientation,
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
					this.sprite + '_' + this.orientation,
					x_offset,
					y_offset
				);
			}
		};
	},

	lazer: function ( orientation, strength, origin ) {
		this.offset = origin;
		this.sprite = 'beam';
		this.orientation = orientation;
		this.strength = strength;

		this.move_by = [0,0];

		switch ( this.orientation ) {
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
					this.sprite + '_' + this.orientation,
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
					this.sprite + '_' + this.orientation,
					x_offset,
					y_offset
				);
			}
		};

		this.move = function () {
			this.clear();
			--this.strength;
			if( 0 == this.strength ) {
				delete this;
				return;
			}
			this.offset[0] = this.offset[0] + this.move_by[0];
			this.offset[1] = this.offset[1] + this.move_by[1];
			this.draw();
			var self = this;
			setTimeout( function () { self.move(); } , 50 );
		};
		this.offset[0] = this.offset[0] + this.move_by[0];
		this.offset[1] = this.offset[1] + this.move_by[1];
		this.move();
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
	MOVE_BUFFER_HIGH: 400,
	MOVE_BUFFER_LOW: 100,
	// A map of where to find different tiles in the sprite image
	sprite_map: {
		// name_orientation :  [ x, y,  w,  h ]
		'cat_south':  [ 0, 0, 40, 40 ],
		'cat_north':  [ 0, 40, 40, 40 ],
		'cat_east' :  [ 0, 80, 40, 40 ],
		'cat_west' :  [ 0, 120, 40, 40 ],
		'beam_south':  [ 80, 0, 40, 40 ],
		'beam_north':  [ 80, 40, 40, 40 ],
		'beam_east' :  [ 80, 80, 40, 40 ],
		'beam_west' :  [ 80, 120, 40, 40 ]
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

	/////// STATE ///////
	// Offset from 0,0 the viewable map is (pixels, not tiles)
	map_offset: [ 0, 0 ],
	// Stored data on the player
	user: null,
	// An array of objects currently on the map
	objects: [],

	/////// CORE ///////
	// Set up
	init: function () {
		LC.ctx = document.getElementById( "objects" ).getContext( "2d" );
		LC.map = $( "#map" );
		LC.messages = $( "#messages" );
		LC.users = $( "#userList" ).find( 'ul' );
		LC.sprites = document.getElementById( "sprites" );
		$( 'html' ).live( 'keyup', LC.keyUp );

		var nick = "";
		while( null == nick || 0 == nick.length ) {
			nick = prompt( "Enter Your Username:", "" );
		}

		$.getJSON( '/init.json', { 'nick': nick }, function ( config ) {
			LC.user = new LC.player( config.you.uniqueID, config.you.offset, 'cat', 'south', config.you.nick );
			LC.faye = new Faye.Client( "http://" + window.location.hostname + ':' + config.you.port + '/faye', { timeout: 120 } );

			window.onbeforeunload = LC.quit;

			LC.message( LC.user.nick + ' joined the game' );
			LC.users.append( $( "<li></li>" ).text( LC.user.nick ).addClass( LC.user.id ) );

			// Load all the other's into the object array & the user list
			for( var idx in config.them ) {
				if( idx != LC.user.id ) {
					LC.objects[idx] = new LC.player( idx, config.them[idx].offset, 'cat', 'south', config.them[idx].nick );
					LC.users.append( $( "<li></li>" ).text( config.them[idx].nick ) ).addClass( idx );
				}
			}

			LC.faye.subscribe( '/join', function ( message ) {
				if( message.uniqueID != LC.user.id ) {
					LC.message( message.nick + ' joined the game' );
					LC.users.append( $( "<li></li>" ).addClass( message.uniqueID ).text( message.nick ) );
					LC.objects[message.uniqueID] = new LC.player( message.uniqueID, message.offset, 'cat', 'south', message.nick );
					LC.objects[message.uniqueID].draw();
				}
			} );

			LC.faye.subscribe( '/move', function ( message ) {
				if( message.uniqueID != LC.user.id ) {
					LC.objects[message.uniqueID].clear();
					LC.objects[message.uniqueID].offset = message.offset;
					LC.objects[message.uniqueID].orientation = message.orientation;
					LC.objects[message.uniqueID].draw();
				}
			} );

			LC.faye.subscribe( '/quit', function ( message ) {
				LC.message( LC.objects[message.uniqueID].nick + ' quit the game' );
				LC.users.find( '.' + message.uniqueID ).remove();
				LC.objects[message.uniqueID].clear();
				delete LC.objects[message.uniqueID];
			} );

			LC.spawn();
		} );

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
			success: function() { alert( 'Thanks For Playing!' ); }
		});
	},

	// Clear the space a sprite is currently taking up.
	clearSprite: function ( sprite, x, y ) {
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

	/////// GAMEPLAY ///////
	// Spawn the user at the given point
	spawn: function () {

		for( var obj in LC.objects ) {
			if( obj != LC.user.id ) { LC.objects[obj].clear(); }
		}

		LC.moveMap( -1 * LC.map_offset[0], -1 * LC.map_offset[1] ); // Back to 0,0
		LC.moveMap( LC.user.offset[0] - 260, LC.user.offset[1] - 260 ); // Move map out to player

		LC.user.draw();

		for( var obj in LC.objects ) {
			if( obj != LC.user.id ) { LC.objects[obj].draw(); }
		}

// 		edge_proximity = [
// 			( LC.map_offset[0] + LC.VIEWPORT_WIDTH - LC.user.offset[0] ),
// 			( LC.map_offset[1] + LC.VIEWPORT_HEIGHT - LC.user.offset[1] )
// 		]
// 		$( '#edge-proximity' ).val( edge_proximity[0] + ', ' + edge_proximity[1] );
// 		$( '#map-offset' ).val( LC.map_offset[0] + ', ' + LC.map_offset[1] );
// 		$( '#user-offset' ).val( LC.user.offset[0] + ', ' + LC.user.offset[1] );
	},

	// Move the user one tile in a direction (n,s,e,w)
	moveUser: function ( direction ) {
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
		if( new_offset[0] >= LC.MAP_WIDTH || new_offset[1] >= LC.MAP_HEIGHT || new_offset[0] < 0 || new_offset[1] < 0 )
			return;

		// Collisions
		for( var obj in LC.objects ) {
			if(
				obj != LC.user.id &&
				LC.objects[obj].offset[0] == new_offset[0] &&
				LC.objects[obj].offset[1] == new_offset[1]
			) {
				return;
			}
		}

		LC.user.clear();
		for( var obj in LC.objects ) {
			if( obj != LC.user.id ) { LC.objects[obj].clear(); }
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

		LC.user.draw();
		for( var obj in LC.objects ) {
			if( obj != LC.user.id ) { LC.objects[obj].draw(); }
		}

		LC.faye.publish( '/move', { offset: LC.user.offset, uniqueID: LC.user.id, orientation: LC.user.orientation } );

	},

	fire: function () {
		var offset = $.extend( {}, LC.user.offset );
		var lazer = LC.lazer( LC.user.orientation, 5, offset );
	}

}
