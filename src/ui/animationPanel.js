// Panel "Animaciones": elegir, reproducir, pausar, detener y moverse en el tiempo. Si la animación elegida
// avanza (el personaje se va de su lugar), ofrece dejarla en el lugar, como la usa Roblox.
import { listBones } from '../core/boneMap.js';
import { makeInPlace, noticeableMotion, rootMotion } from '../core/inPlace.js';
import { $, escapeHtml, formatNumber } from './dom.js';
import { toast } from './toast.js';

export function initAnimationPanel( app ) {

	const anim = app.animation;
	const empty = $( '#anim-empty' );
	const controls = $( '#anim-controls' );
	const select = $( '#anim-select' );
	const playButton = $( '#btn-anim-play' );
	const stopButton = $( '#btn-anim-stop' );
	const speed = $( '#anim-speed' );
	const time = $( '#anim-time' );
	const clock = $( '#anim-clock' );
	const loop = $( '#anim-loop' );
	const rootBox = $( '#anim-root' );
	const rootText = $( '#anim-root-text' );
	/** Cuánto avanza cada animación (se mide una sola vez). */
	const advances = new WeakMap();

	select.addEventListener( 'change', () => {

		if ( select.value === 'vista-previa' ) return;
		const wasPlaying = anim.isPlaying;
		anim.select( Number( select.value ) );
		if ( wasPlaying ) anim.play();

	} );

	playButton.addEventListener( 'click', () => anim.toggle() );
	stopButton.addEventListener( 'click', () => anim.stop() );
	speed.addEventListener( 'change', () => anim.setSpeed( Number( speed.value ) ) );
	loop.addEventListener( 'change', () => anim.setLoop( loop.checked ) );
	time.addEventListener( 'input', () => anim.seek( Number( time.value ) * anim.duration ) );

	$( '#btn-anim-in-place' ).addEventListener( 'click', () => {

		const model = app.model;
		const clip = anim.clips[ anim.selectedIndex ];
		if ( ! model || ! clip ) return;
		const still = makeInPlace( model, clip );
		advances.set( still, 0 );
		const swap = ( from, to ) => {

			anim.replaceClip( from, to );
			app.emit( 'clips' );

		};

		swap( clip, still );
		app.history.push( { label: `Dejar en el lugar: ${ clip.name }`, undo: () => swap( still, clip ), redo: () => swap( clip, still ) } );
		toast( `Listo: «${ clip.name }» ya no avanza (queda en el lugar). Si no te gusta, deshazlo con Ctrl+Z.`, 'ok' );

	} );

	/** ¿Cuánto avanza la animación? (metros) */
	function advance( clip ) {

		if ( ! advances.has( clip ) ) advances.set( clip, rootMotion( app.model, clip ).distance );
		return advances.get( clip );

	}

	function renderList() {

		const model = app.model;
		const clips = anim.clips;
		if ( ! model || clips.length === 0 ) {

			controls.hidden = true;
			empty.hidden = false;
			empty.textContent = ! model ? 'Abre un modelo para ver sus animaciones.'
				: hasBones( model ) ? 'Este personaje todavía no tiene animaciones: créalas aquí abajo o agrégalas desde otro archivo.'
					: 'Este modelo no trae animaciones.';
			return;

		}

		empty.hidden = true;
		controls.hidden = false;
		select.innerHTML = clips.map( ( clip, i ) =>
			`<option value="${ i }">${ escapeHtml( clip.name || `Animación ${ i + 1 }` ) } (${ formatNumber( clip.duration, 2 ) } s)</option>`
		).join( '' );
		if ( anim.selectedIndex < 0 ) anim.select( 0 );
		anim.setSpeed( Number( speed.value ) );
		anim.setLoop( loop.checked );
		renderState();

	}

	function renderState() {

		if ( controls.hidden ) return;
		// Mientras suena una vista previa (por ejemplo, la prueba del mapa de huesos), la lista la muestra.
		let previewOption = select.querySelector( 'option[value="vista-previa"]' );
		if ( anim.preview ) {

			const clip = anim.preview.clip;
			if ( ! previewOption ) previewOption = select.appendChild( new Option( '', 'vista-previa' ) );
			previewOption.textContent = `${ clip.name } (${ formatNumber( clip.duration, 2 ) } s, vista previa)`;
			select.value = 'vista-previa';

		} else if ( previewOption ) {

			previewOption.remove();

		}

		const index = anim.selectedIndex;
		if ( index >= 0 ) select.value = String( index );
		playButton.textContent = anim.isPlaying ? 'Pausa' : 'Reproducir';
		renderTime();

		// ¿La animación elegida avanza? (no se mide durante una vista previa)
		const clip = ! anim.preview && index >= 0 ? anim.clips[ index ] : null;
		const distance = clip ? advance( clip ) : 0;
		rootBox.hidden = ! ( distance > noticeableMotion( app.model ) );
		if ( ! rootBox.hidden ) {

			rootText.textContent = `«${ clip.name }» hace avanzar al personaje ${ formatNumber( distance, 1 ) } m. ` +
				'En Roblox conviene dejarla en el lugar: el que camina es el personaje del juego.';

		}

	}

	function renderTime() {

		const duration = anim.duration;
		const current = anim.time;
		time.value = duration > 0 ? String( current / duration ) : '0';
		clock.textContent = `${ seconds( current ) } / ${ seconds( duration ) } s`;

	}

	app.on( [ 'model', 'clips' ], renderList );
	anim.addEventListener( 'change', renderState );
	anim.addEventListener( 'tick', renderTime );
	renderList();

}

/** 1.5 -> "1,50" */
function seconds( value ) {

	return value.toFixed( 2 ).replace( '.', ',' );

}

function hasBones( model ) {

	return listBones( model.container ).length > 0;

}
