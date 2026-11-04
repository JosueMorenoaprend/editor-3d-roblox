// "Ajustar esta animación" (debajo del reproductor): repetir sin saltos, cambiar la velocidad, recortar y
// combinar con otra. Las tres primeras reemplazan a la animación elegida; combinar agrega una nueva. Todo se
// puede deshacer.
import { changeSpeed, combineClips, makeSeamless, trimClip } from '../core/clipTools.js';
import { uniqueClipName } from '../core/animation.js';
import { addClipsWithUndo } from './clipHistory.js';
import { $, escapeHtml, readNumber } from './dom.js';
import { toast } from './toast.js';

export function initClipTools( app ) {

	const box = $( '#anim-tools' );
	const speedInput = $( '#anim-tools-speed' );
	const fromInput = $( '#anim-trim-from' );
	const toInput = $( '#anim-trim-to' );
	const combineSelect = $( '#anim-combine' );
	const combineButton = $( '#btn-anim-combine' );
	const selected = () => app.animation.clips[ app.animation.selectedIndex ] || null;
	/** Para volver a llenar "Desde" y "Hasta" solo cuando cambia la animación elegida. */
	let shown = null;

	/** Cambia la animación elegida por su versión ajustada (Ctrl+Z vuelve a la de antes). */
	function replace( label, done, make ) {

		const clip = selected();
		if ( ! clip ) return;
		app.run( 'Ajustando la animación…', () => {

			const next = make( clip );
			const swap = ( from, to ) => {

				app.animation.replaceClip( from, to );
				app.emit( 'clips' );

			};

			swap( clip, next );
			app.history.push( { label: `${ label }: ${ clip.name }`, undo: () => swap( next, clip ), redo: () => swap( clip, next ) } );
			toast( `Listo: ${ done( clip.name ) }. Si no te gusta, deshazlo con Ctrl+Z.`, 'ok' );

		}, 'No se pudo ajustar la animación' );

	}

	$( '#btn-anim-loop' ).addEventListener( 'click', () => replace( 'Repetir sin saltos', ( name ) => `«${ name }» ahora se repite sin saltos`, ( clip ) => makeSeamless( clip ) ) );
	$( '#btn-anim-speed' ).addEventListener( 'click', () => replace( 'Cambiar la velocidad', ( name ) => `cambié la velocidad de «${ name }»`, ( clip ) => changeSpeed( clip, readNumber( speedInput ) ?? NaN ) ) );
	$( '#btn-anim-trim' ).addEventListener( 'click', () => replace( 'Recortar', ( name ) => `recorté «${ name }»`, ( clip ) => trimClip( clip, readNumber( fromInput ) ?? NaN, readNumber( toInput ) ?? NaN ) ) );

	combineButton.addEventListener( 'click', () => {

		const first = selected();
		const second = app.animation.clips[ Number( combineSelect.value ) ];
		if ( ! first || ! second ) return;
		const name = uniqueClipName( `${ first.name } + ${ second.name }`, app.animation.clips.map( ( clip ) => clip.name ) );
		const names = addClipsWithUndo( app, [ combineClips( app.model, first, second, { name } ) ] );
		toast( `Listo: agregué «${ names }» (primero «${ first.name }» y después «${ second.name }»). Si no te gusta, deshazlo con Ctrl+Z.`, 'ok' );

	} );

	function render() {

		const clip = selected();
		box.hidden = ! clip || !! app.animation.preview;
		if ( ! clip ) return;
		if ( clip !== shown ) {

			shown = clip;
			fromInput.value = '0';
			toInput.value = String( Math.round( clip.duration * 100 ) / 100 );

		}

		fromInput.max = toInput.max = String( clip.duration );
		const others = app.animation.clips.map( ( item, index ) => [ item, index ] ).filter( ( [ item ] ) => item !== clip );
		combineSelect.innerHTML = others.map( ( [ item, index ] ) => `<option value="${ index }">${ escapeHtml( item.name ) }</option>` ).join( '' );
		combineButton.disabled = others.length === 0;

	}

	app.on( [ 'model', 'clips' ], render );
	app.animation.addEventListener( 'change', render );
	render();

}
