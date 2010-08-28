var LC = {

	tile_width: 20,
	tile_height: 20,

	ctx: null,
	map: null,
	sprites: null,

	sprite_map: {
		// name    :  [ x, y,  w,  h ]
		'cat_west' :  [ 0, 0, 20, 20 ],
		'cat_south':  [ 20, 0, 20, 20 ],
		'cat_east' :  [ 40, 0, 20, 20 ],
		'cat_north':  [ 60, 0, 20, 20 ],
	},

	init: function () {
		LC.ctx = document.getElementById( "objects" ).getContext( "2d" );
		LC.map = $( "#map" );
		LC.sprites = document.getElementById( "sprites" );
	},

	drawSprite: function ( sprite, x, y ) {
		LC.ctx.clearRect( x, y, LC.tile_width, LC.tile_height );
		console.log( "Draw Sprite: " + sprite + " @ " + x + ", " + y );
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
	}

}