// Panel "Animaciones": elegir, reproducir, pausar, detener y moverse en el tiempo.
import { listBones } from '../core/boneMap.js';
import { $, escapeHtml, formatNumber } from './dom.js';

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

	function renderList() {

		const model = app.model;
		const clips = anim.clips;
		if ( ! model || clips.length === 0 ) {

			controls.hidden = true;
			empty.hidden = false;
			empty.textContent = ! model ? 'Abre un modelo para ver sus animaciones.'
				: hasBones( model ) ? 'Este personaje todavía no tiene animaciones: agrégalas desde otro archivo.'
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
