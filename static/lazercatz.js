function boxlog ( message ) {
	el = $( "#log-area" );
	el.text( message + "\n" + el.text() );
}

var LC = {

	tile_width: 40,
	tile_height: 40,

	ctx: null,
	map: null,
	sprites: null,

	sprite_map: {
		// name    :  [ x, y,  w,  h ]
		'cat_west' :  [ 0, 0, 40, 40 ],
		'cat_south':  [ 40, 0, 40, 40 ],
		'cat_east' :  [ 80, 0, 40, 40 ],
		'cat_north':  [ 120, 0, 40, 40 ],
	},

	map_offset: [ 0, 0 ],

	user_offset: [ 0, 0 ],
	user_orientation: 'south',

	objects: [],

	faye: null,

	init: function () {
		LC.ctx = document.getElementById( "objects" ).getContext( "2d" );
		LC.map = $( "#map" );
		LC.sprites = document.getElementById( "sprites" );
		$( 'html' ).live( 'keyup', LC.keyUp );

		$.getJSON( '/init.json', function ( config ) {
			LC.faye = new Faye.Client( "http://" + window.location.hostname + ':' + config.port + '/faye', {
				timeout: 120
			} );
			LC.faye.subscribe( '/join', function ( message ) {
				boxlog( "SOMEBODY JOINED!" );
			} );
			LC.faye.subscribe( '/move', function ( message ) {
				boxlog( "SOMEBODY MOVED!" );
			} );

			LC.user_id = config.uniqueID;
			LC.spawn( config.spawnPoint );
		});

	},

	clearSprite: function ( sprite, x, y ) {
		boxlog( "Clear: " + sprite + " @ " + x + ", " + y );
		LC.ctx.clearRect( x, y, LC.tile_width, LC.tile_height );
	},

	drawSprite: function ( sprite, x, y ) {
		LC.ctx.clearRect( x, y, LC.tile_width, LC.tile_height );
		boxlog( "Draw: " + sprite + " @ " + x + ", " + y );
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

	moveMap: function ( x, y ) {
		LC.map_offset[0] = LC.map_offset[0] + x;
		LC.map_offset[1] = LC.map_offset[1] + y;

		if( LC.map_offset[0] < 0 ) { LC.map_offset[0] = 0; }
		if( LC.map_offset[1] < 0 ) { LC.map_offset[1] = 0; }
		if( LC.map_offset[0] >= 500 ) { LC.map_offset[0] = 500; }
		if( LC.map_offset[1] >= 500 ) { LC.map_offset[1] = 500; }

		boxlog( 'Move Map: -' + LC.map_offset[0] + 'px -' + LC.map_offset[1] + 'px' )

		LC.map.css(
			'background-position',
			'-' + LC.map_offset[0] + 'px -' + LC.map_offset[1] + 'px'
		);
	},

	spawn: function ( point ) {
		LC.user_offset = point;

		boxlog( "Spawn: " + point[0] + ", " + point[1] );

		LC.moveMap( -1 * LC.map_offset[0], -1 * LC.map_offset[1] ); // Back to 0,0
		LC.moveMap( LC.user_offset[0] - 260, LC.user_offset[1] - 260 ); // Move map out to player

		LC.drawSprite(  'cat_' + LC.user_orientation, LC.user_offset[0] - LC.map_offset[0], LC.user_offset[1] - LC.map_offset[1] );

		edge_proximity = [
			( LC.map_offset[0] + 500 - LC.user_offset[0] ),
			( LC.map_offset[1] + 500 - LC.user_offset[1] )
		]
		$( '#edge-proximity' ).val( edge_proximity[0] + ', ' + edge_proximity[1] );
		$( '#map-offset' ).val( LC.map_offset[0] + ', ' + LC.map_offset[1] );
		$( '#user-offset' ).val( LC.user_offset[0] + ', ' + LC.user_offset[1] );
	},

	moveUser: function ( direction ) {
		var new_offset = $.extend( {}, LC.user_offset ); // Shallow copy
		switch( direction ) {
			case 'w':
				new_offset[0] = LC.user_offset[0] - LC.tile_height;
				new_orientation = 'east';
				break;
			case 'e':
				new_offset[0] = LC.user_offset[0] + LC.tile_height;
				new_orientation = 'west';
				break;
			case 'n':
				new_offset[1] = LC.user_offset[1] - LC.tile_width;
				new_orientation = 'north';
				break;
			case 's':
				new_offset[1] = LC.user_offset[1] + LC.tile_width;
				new_orientation = 'south';
				break;
		}

		if( new_offset[0] >= 1000 || new_offset[1] >= 1000 || new_offset[0] < 0 || new_offset[1] < 0 )
			return;

		LC.clearSprite( 'cat_' + LC.user_orientation, LC.user_offset[0] - LC.map_offset[0], LC.user_offset[1] - LC.map_offset[1] );
		LC.user_offset = new_offset;
		LC.user_orientation = new_orientation;

		edge_proximity = [
			( LC.map_offset[0] + 500 - LC.user_offset[0] ),
			( LC.map_offset[1] + 500 - LC.user_offset[1] )
		]

		if( 'e' == direction && edge_proximity[0] == 100 ) { LC.moveMap( LC.tile_width, 0 ); }
		if( 'w' == direction && edge_proximity[0] == 400 ) { LC.moveMap( -1 * LC.tile_width, 0 ); }
		if( 'n' == direction && edge_proximity[1] == 400 ) { LC.moveMap( 0, -1 * LC.tile_height ); }
		if( 's' == direction && edge_proximity[1] == 100 ) { LC.moveMap( 0, LC.tile_height ); }

		LC.drawSprite(  'cat_' + LC.user_orientation, LC.user_offset[0] - LC.map_offset[0], LC.user_offset[1] - LC.map_offset[1] );

		LC.faye.publish( '/move', { offset: LC.user_offset } );

		$( '#edge-proximity' ).val( edge_proximity[0] + ', ' + edge_proximity[1] );
		$( '#map-offset' ).val( LC.map_offset[0] + ', ' + LC.map_offset[1] );
		$( '#user-offset' ).val( LC.user_offset[0] + ', ' + LC.user_offset[1] );
	},

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
		}
	}


}