// "Crear a mano con keyframes" (dentro del panel Animaciones): elegir una parte del cuerpo, girarla con
// deslizadores (en el espacio del personaje) o con los anillos de la vista 3D (TransformControls), y poner
// o quitar keyframes en una línea de tiempo. Entre keyframes, three.js interpola. "Guardar" la agrega al
// personaje (con deshacer).
import { uniqueClipName } from '../core/animation.js';
import { HUMANOID_BONES, boneLabel } from '../core/boneMap.js';
import { KeyframeAnimation } from '../core/keyframeAnimation.js';
import { ClipSampler, RestPose, anglesFromLocal, findBones, localFromAngles } from '../core/skeletonPose.js';
import { addClipsWithUndo } from './clipHistory.js';
import { $, $$, escapeHtml, formatNumber, plural, readNumber } from './dom.js';
import { toast } from './toast.js';

/** Parte que se elige al abrir, si el personaje la tiene. */
const FIRST_PART = 'leftUpperArm';

export function initKeyframePanel( app ) {

	const box = $( '#anim-keys' );
	const editorBox = $( '#anim-keys-editor' );
	const openButton = $( '#btn-keys-open' );
	const nameInput = $( '#keys-name' );
	const durationInput = $( '#keys-duration' );
	const partSelect = $( '#keys-part' );
	const sliders = $$( '#keys-angles input[type="range"]' );
	const timeInput = $( '#keys-time' );
	const marks = $( '#keys-marks' );
	const clock = $( '#keys-clock' );
	const status = $( '#keys-status' );
	const playButton = $( '#btn-keys-play' );
	const cancelButton = $( '#btn-keys-cancel' );
	const editing = [ nameInput, durationInput, partSelect, ...sliders, timeInput, $( '#btn-keys-set' ), $( '#btn-keys-remove' ), $( '#btn-keys-save' ) ];

	/** Anillos para girar el hueso elegido con el mouse o el dedo (se cargan la primera vez que se abre). */
	let gizmo = null;

	async function loadGizmo() {

		if ( gizmo ) return gizmo;
		const { TransformControls } = await import( 'three/addons/controls/TransformControls.js' );
		gizmo = new TransformControls( app.viewer.camera, app.viewer.renderer.domElement );
		gizmo.setMode( 'rotate' );
		gizmo.setSpace( 'local' );
		gizmo.setSize( 0.7 );
		app.viewer.scene.add( gizmo.getHelper() );
		// Mientras se arrastra un anillo, la cámara no gira.
		gizmo.addEventListener( 'dragging-changed', ( event ) => {

			app.viewer.controls.enabled = ! event.value;

		} );
		gizmo.addEventListener( 'objectChange', () => editor && syncSliders() );
		return gizmo;

	}

	/** Lo que se está editando: { model, animation, rest, bones, key, time, playing, clip } (o null). */
	let editor = null;
	let cancelTimer = 0;

	const bone = () => ( editor ? editor.bones.get( editor.model.boneMap[ editor.key ] ) : null );

	openButton.addEventListener( 'click', open );

	async function open() {

		const model = app.model;
		if ( ! model ) return;
		await loadGizmo();
		if ( app.model !== model ) return;
		app.animation.stop();
		editor = {
			model,
			animation: new KeyframeAnimation( { name: uniqueClipName( 'Mi animación', model.clips.map( ( clip ) => clip.name ) ), duration: 2 } ),
			rest: new RestPose( model.container, model.restPose ),
			bones: findBones( model.container ),
			key: null,
			time: 0,
			playing: false,
		};
		nameInput.value = editor.animation.name;
		durationInput.value = '2';
		fillParts();
		openButton.hidden = true;
		editorBox.hidden = false;
		showPose();
		render();

	}

	/** Partes del cuerpo que tiene el mapa de huesos (en el orden del cuerpo). */
	function fillParts() {

		const keys = HUMANOID_BONES.map( ( item ) => item.key ).filter( ( key ) => editor.bones.get( editor.model.boneMap[ key ] ) );
		partSelect.innerHTML = keys.map( ( key ) => `<option value="${ key }">${ escapeHtml( boneLabel( key ) ) }</option>` ).join( '' );
		if ( ! keys.includes( editor.key ) ) editor.key = keys.includes( FIRST_PART ) ? FIRST_PART : keys[ 0 ] || null;
		partSelect.value = editor.key || '';
		attachGizmo();

	}

	function attachGizmo() {

		if ( ! gizmo ) return;
		const target = bone();
		if ( target && ! editor.playing ) gizmo.attach( target );
		else gizmo.detach();

	}

	partSelect.addEventListener( 'change', () => {

		editor.key = partSelect.value;
		attachGizmo();
		syncSliders();
		render();

	} );

	// Deslizadores: giran el hueso elegido al instante (todavía no es un keyframe).
	for ( const slider of sliders ) {

		slider.addEventListener( 'input', () => {

			const target = bone();
			if ( ! target ) return;
			const angles = [ 0, 0, 0 ];
			for ( const item of sliders ) angles[ Number( item.dataset.axis ) ] = Number( item.value );
			target.quaternion.copy( localFromAngles( editor.rest, target, angles ) );
			showAngles( angles );

		} );

	}

	timeInput.addEventListener( 'input', () => {

		editor.time = Number( timeInput.value );
		showPose();
		render();

	} );

	nameInput.addEventListener( 'input', () => {

		editor.animation.name = nameInput.value.trim() || 'Mi animación';

	} );

	durationInput.addEventListener( 'change', () => {

		const value = readNumber( durationInput );
		if ( value === null || value < 0.2 || value > 30 ) {

			toast( 'La duración tiene que ser un número entre 0,2 y 30 segundos.', 'error' );
			durationInput.value = String( editor.animation.duration );
			return;

		}

		const before = editor.animation.keyCount;
		editor.animation.setDuration( value );
		const lost = before - editor.animation.keyCount;
		if ( lost > 0 ) toast( `Se borraron ${ plural( lost, 'keyframe' ) } que quedaban después de los ${ formatNumber( value, 2 ) } s.` );
		editor.time = Math.min( editor.time, editor.animation.duration );
		showPose();
		render();

	} );

	$( '#btn-keys-set' ).addEventListener( 'click', () => {

		const target = bone();
		if ( ! target ) return;
		editor.animation.setKey( target.name, editor.time, target.quaternion );
		render();

	} );

	$( '#btn-keys-remove' ).addEventListener( 'click', () => {

		const target = bone();
		if ( ! target || ! editor.animation.removeKey( target.name, editor.time ) ) {

			toast( `«${ boneLabel( editor.key ) }» no tiene keyframe en este momento.` );
			return;

		}

		showPose();
		render();

	} );

	playButton.addEventListener( 'click', () => {

		if ( editor.playing ) {

			app.animation.stop();
			return;

		}

		if ( editor.animation.keyCount === 0 ) {

			toast( 'Primero pon al menos un keyframe.' );
			return;

		}

		editor.clip = editor.animation.toClip();
		app.animation.playPreview( editor.clip, { loop: true } );
		editor.playing = true;
		attachGizmo();
		render();

	} );

	// Al detener la vista previa (con este botón o desde Animaciones), se vuelve a la pose del momento elegido.
	app.animation.addEventListener( 'change', () => {

		if ( ! editor || ! editor.playing || app.animation.isPreviewing( editor.clip ) ) return;
		editor.playing = false;
		attachGizmo();
		showPose();
		render();

	} );

	$( '#btn-keys-save' ).addEventListener( 'click', () => {

		if ( editor.animation.keyCount === 0 ) {

			toast( 'Primero pon al menos un keyframe (elige una parte, gírala y pulsa «Poner keyframe»).' );
			return;

		}

		const name = uniqueClipName( editor.animation.name, app.model.clips.map( ( clip ) => clip.name ) );
		const clip = editor.animation.toClip( name );
		close();
		addClipsWithUndo( app, [ clip ] );
		toast( `Listo: agregué «${ name }» a tu personaje. Si no te gusta, deshazlo con Ctrl+Z.`, 'ok' );

	} );

	// Cancelar con keyframes pide confirmar (un segundo toque), para no perder trabajo sin querer.
	cancelButton.addEventListener( 'click', () => {

		const count = editor ? editor.animation.keyCount : 0;
		if ( count > 0 && ! cancelTimer ) {

			cancelButton.textContent = `¿Descartar ${ plural( count, 'keyframe' ) }? Toca otra vez`;
			cancelTimer = setTimeout( resetCancel, 4000 );
			return;

		}

		close();

	} );

	function resetCancel() {

		clearTimeout( cancelTimer );
		cancelTimer = 0;
		cancelButton.textContent = 'Cancelar';

	}

	function close() {

		if ( ! editor ) return;
		const playing = editor.playing;
		editor = null;
		gizmo?.detach();
		app.viewer.controls.enabled = true;
		resetCancel();
		editorBox.hidden = true;
		openButton.hidden = false;
		if ( playing ) app.animation.stop();
		else if ( app.model ) app.model.restoreRestPose();

	}

	/** Muestra la pose de la animación en el momento elegido (o la de reposo si no hay keyframes). */
	function showPose() {

		const model = editor.model;
		model.restoreRestPose();
		new ClipSampler( model.container, editor.animation.toClip() ).apply( editor.time );
		model.container.updateMatrixWorld( true );
		syncSliders();

	}

	/** Pone los deslizadores según cómo está girado el hueso elegido. */
	function syncSliders() {

		const target = bone();
		const angles = target ? anglesFromLocal( editor.rest, target, target.quaternion.clone() ) : [ 0, 0, 0 ];
		for ( const slider of sliders ) slider.value = String( Math.round( angles[ Number( slider.dataset.axis ) ] ) );
		showAngles( angles );

	}

	function showAngles( angles ) {

		for ( const slider of sliders ) $( `#${ slider.id }-value` ).textContent = `${ Math.round( angles[ Number( slider.dataset.axis ) ] ) }°`;

	}

	function render() {

		if ( ! editor ) return;
		const { animation, time, playing } = editor;
		timeInput.max = String( animation.duration );
		timeInput.value = String( time );
		clock.textContent = `${ seconds( time ) } / ${ seconds( animation.duration ) } s`;
		for ( const control of editing ) control.disabled = playing;
		playButton.textContent = playing ? '■ Detener' : '▶ Reproducir';

		// Marcas de los keyframes de la parte elegida sobre la línea de tiempo.
		const target = bone();
		const times = target ? animation.keyTimes( target.name ) : [];
		marks.innerHTML = times.map( ( at ) => `<span class="keys-mark${ Math.abs( at - time ) < 1e-3 ? ' current' : '' }" style="left: ${ ( at / animation.duration ) * 100 }%"></span>` ).join( '' );
		const label = editor.key ? boneLabel( editor.key ) : '';
		const own = times.length ? `«${ label }»: en ${ times.map( ( at ) => `${ seconds( at ) } s` ).join( ', ' ) }.` : `«${ label }» todavía no tiene keyframes.`;
		status.textContent = `${ plural( animation.keyCount, 'keyframe' ) } en total. ${ own }`;

	}

	app.on( 'model', () => {

		close();
		// Solo un personaje con esqueleto se puede animar.
		box.hidden = ! app.model || findBones( app.model.container ).size === 0;

	} );

	app.on( 'bonemap', () => {

		if ( editor ) {

			fillParts();
			syncSliders();
			render();

		}

	} );

}

/** 1.5 -> "1,50" */
function seconds( value ) {

	return value.toFixed( 2 ).replace( '.', ',' );

}
