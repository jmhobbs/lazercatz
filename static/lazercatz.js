var LC = {
	ctx: null,
	map: null,
	sprites: null,
	sprite_map: {}

	init: function () {
		LC.ctx = document.getElementById( "objects" ).getContext( "2d" );
		LC.map = $( "#map" );
		LC.sprites = document.getElementById( "sprites" );
	}
}