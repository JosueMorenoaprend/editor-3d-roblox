// Agregar animaciones al personaje con deshacer. Lo usan "Crear una animación" y "Agregar animaciones de
// otro archivo" (panel Animaciones).

/**
 * Agrega las animaciones al modelo, las guarda en el historial (Ctrl+Z las quita) y deja elegida la
 * primera en el panel Animaciones.
 * @param {import('../app.js').App} app
 * @param {import('three').AnimationClip[]} clips
 * @returns {string} sus nombres, separados por comas (para el aviso)
 */
export function addClipsWithUndo( app, clips ) {

	const model = app.model;
	if ( ! model || clips.length === 0 ) return '';
	// Se termina cualquier vista previa antes de agregar.
	app.animation.stop();
	const add = () => {

		app.animation.addClips( clips );
		app.emit( 'clips' );

	};

	const remove = () => {

		app.animation.removeClips( clips );
		app.emit( 'clips' );

	};

	add();
	const names = clips.map( ( clip ) => clip.name ).join( ', ' );
	app.history.push( { label: `${ clips.length === 1 ? 'Agregar animación' : 'Agregar animaciones' }: ${ names }`, undo: remove, redo: add } );
	app.animation.select( model.clips.indexOf( clips[ 0 ] ) );
	return names;

}
