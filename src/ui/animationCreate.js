// "Crear una animación" (dentro del panel Animaciones): caminar, correr o respirar, con deslizadores.
// Mientras mueves un deslizador, el personaje la muestra en bucle (vista previa); "Agregar" la guarda en
// el personaje (con deshacer).
import { uniqueClipName } from '../core/animation.js';
import { listBones } from '../core/boneMap.js';
import { UserError, describeError } from '../core/errors.js';
import { GENERATORS, defaultParams, generateAnimation } from '../core/generators.js';
import { addClipsWithUndo } from './clipHistory.js';
import { $, escapeHtml, formatNumber } from './dom.js';
import { toast } from './toast.js';

export function initAnimationCreate( app ) {

	const box = $( '#anim-create' );
	const buttons = $( '#anim-create-buttons' );
	const editor = $( '#anim-create-editor' );
	const description = $( '#anim-create-description' );
	const params = $( '#anim-create-params' );
	const addButton = $( '#btn-anim-create-add' );

	buttons.innerHTML = GENERATORS.map( ( generator ) =>
		`<button type="button" class="btn" data-generator="${ generator.id }" aria-pressed="false">${ escapeHtml( generator.name ) }</button>` ).join( '' );

	/** Generador abierto: { generator, values, clip } (o null). */
	let current = null;
	let frame = 0;

	buttons.addEventListener( 'click', ( event ) => {

		const button = event.target.closest( '[data-generator]' );
		if ( button && app.model ) open( button.dataset.generator );

	} );

	function open( id ) {

		const generator = GENERATORS.find( ( item ) => item.id === id );
		close();
		current = { generator, values: defaultParams( id ), clip: null };
		if ( ! preview( 0 ) ) {

			current = null;
			return;

		}

		for ( const button of buttons.querySelectorAll( '[data-generator]' ) ) button.setAttribute( 'aria-pressed', String( button.dataset.generator === id ) );
		description.textContent = generator.description;
		params.innerHTML = generator.params.map( ( param ) => `
			<label class="field slider">
				<span class="slider-label">${ escapeHtml( param.label ) } <output id="gen-${ param.id }-value" for="gen-${ param.id }">${ formatValue( param, param.value ) }</output></span>
				<input type="range" id="gen-${ param.id }" data-param="${ param.id }" min="${ param.min }" max="${ param.max }" step="${ param.step }" value="${ param.value }" />
			</label>` ).join( '' );
		addButton.textContent = `Agregar «${ generator.name }» a mi personaje`;
		editor.hidden = false;

	}

	params.addEventListener( 'input', ( event ) => {

		const input = event.target.closest( 'input[data-param]' );
		if ( ! input || ! current ) return;
		const param = current.generator.params.find( ( item ) => item.id === input.dataset.param );
		current.values[ param.id ] = Number( input.value );
		$( `#gen-${ param.id }-value` ).textContent = formatValue( param, current.values[ param.id ] );
		// Se vuelve a generar en el siguiente cuadro (si mueves rápido, una sola vez por cuadro), siguiendo
		// en el mismo punto del ciclo para que no "salte".
		cancelAnimationFrame( frame );
		frame = requestAnimationFrame( () => preview( currentFraction() ) );

	} );

	/** En qué parte del ciclo va la vista previa (0 a 1). */
	function currentFraction() {

		const anim = app.animation;
		return current && current.clip && anim.preview && anim.preview.clip === current.clip ? anim.time / current.clip.duration : 0;

	}

	/** Genera la animación con los valores de los deslizadores y la muestra en bucle. false si no se pudo. */
	function preview( fraction ) {

		try {

			const clip = generateAnimation( app.model, current.generator.id, current.values );
			current.clip = clip;
			app.animation.playPreview( clip, { loop: true, time: fraction * clip.duration } );
			return true;

		} catch ( error ) {

			if ( error instanceof UserError ) console.warn( error.message );
			else console.error( error );
			toast( describeError( error, { action: 'No se pudo crear la animación' } ), 'error' );
			return false;

		}

	}

	addButton.addEventListener( 'click', () => {

		const model = app.model;
		if ( ! current || ! model ) return;
		// Se genera otra vez con su nombre definitivo (sin repetir los que ya tiene el personaje).
		const name = uniqueClipName( current.generator.name, model.clips.map( ( clip ) => clip.name ) );
		const clip = generateAnimation( model, current.generator.id, current.values, { name } );
		close();
		addClipsWithUndo( app, [ clip ] );
		toast( `Listo: agregué «${ name }» a tu personaje. Puedes crear otra (por ejemplo, más rápida) o exportarla; ` +
			'si no te gusta, deshazlo con Ctrl+Z.', 'ok', 7000 );

	} );

	$( '#btn-anim-create-close' ).addEventListener( 'click', close );

	function close() {

		cancelAnimationFrame( frame );
		if ( current && app.animation.preview && app.animation.preview.clip === current.clip ) app.animation.stop();
		current = null;
		editor.hidden = true;
		params.innerHTML = '';
		for ( const button of buttons.querySelectorAll( '[data-generator]' ) ) button.setAttribute( 'aria-pressed', 'false' );

	}

	// Si se corrige el mapa de huesos con el generador abierto, la vista previa se actualiza.
	app.on( 'bonemap', () => {

		if ( current ) preview( currentFraction() );

	} );

	app.on( 'model', () => {

		close();
		// Solo un personaje con esqueleto se puede animar.
		box.hidden = ! app.model || listBones( app.model.container ).length === 0;

	} );

}

/** 1.5 → "×1,5"; 0.6 → "60 %". */
function formatValue( param, value ) {

	return param.format === 'times' ? `×${ formatNumber( value, 2 ) }` : `${ Math.round( value * 100 ) } %`;

}
