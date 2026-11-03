// "Crear a mano con keyframes" (dentro del panel Animaciones): elegir una parte del cuerpo, girarla con
// deslizadores (en el espacio del personaje) o con los anillos de la vista 3D (TransformControls), y poner
// o quitar keyframes en una línea de tiempo. Entre keyframes, three.js interpola. "Guardar" la agrega al
// personaje (con deshacer).
//
// La pose que se ve (con o sin keyframe) es la "pose de trabajo": el reproductor la vuelve a poner cuando
// algo devuelve el personaje al reposo (detener, exportar, guardar, el autoguardado). Mientras se ve otra
// animación (el reproductor de arriba o la vista previa de otro bloque), el editor espera.
import { uniqueClipName } from '../core/animation.js';
import { HUMANOID_BONES, boneLabel } from '../core/boneMap.js';
import { KeyframeAnimation } from '../core/keyframeAnimation.js';
import { mirrorAngles, poseRotations, readPose } from '../core/poseTools.js';
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
	const busyBox = $( '#keys-busy' );
	const busyText = $( '#keys-busy-text' );
	const editing = [ nameInput, durationInput, partSelect, ...sliders, timeInput, $( '#btn-keys-set' ), $( '#btn-keys-remove' ), $( '#btn-keys-save' ),
		$( '#btn-keys-copy' ), $( '#btn-keys-mirror' ) ];
	const pasteButton = $( '#btn-keys-paste' );

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
		gizmo.addEventListener( 'objectChange', () => {

			if ( ! editor ) return;
			moved();
			syncSliders();

		} );
		return gizmo;

	}

	/**
	 * Lo que se está editando (o null): { model, animation, rest, bones, key (parte elegida), time,
	 * pose (Map hueso → giro: la pose de trabajo), changed (partes giradas sin keyframe todavía),
	 * clip (el de ▶ Reproducir), playing (suena ese clip),
	 * other (el clip de otra animación que se está viendo, o null) }.
	 */
	let editor = null;
	let cancelTimer = 0;

	/** El hueso de una parte del cuerpo (según el mapa de huesos). */
	const partBone = ( key ) => editor.bones.get( editor.model.boneMap[ key ] );
	const bone = () => ( editor ? partBone( editor.key ) : null );

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
			pose: new Map(),
			changed: new Set(),
			clip: null,
			playing: false,
			other: null,
		};
		app.animation.setIdlePose( applyWorkingPose );
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
		if ( target && ! editor.playing && ! editor.other ) gizmo.attach( target );
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
			moved();
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

	/** Pose copiada: grados por parte, en el espacio del personaje (sirve en otro momento o personaje). */
	let clipboard = null;

	$( '#btn-keys-copy' ).addEventListener( 'click', () => {

		clipboard = readPose( editor.rest, editor.model.boneMap, editor.bones );
		toast( `Copié la pose (${ plural( clipboard.size, 'parte' ) }). Ve a otro momento y pulsa «Pegar pose».`, 'ok' );
		render();

	} );

	pasteButton.addEventListener( 'click', () => {

		if ( clipboard ) usePose( poseRotations( editor.rest, editor.model.boneMap, editor.bones, clipboard ), 'Pegué la pose' );

	} );

	$( '#btn-keys-mirror' ).addEventListener( 'click', () => {

		const mirrored = mirrorAngles( readPose( editor.rest, editor.model.boneMap, editor.bones ) );
		usePose( poseRotations( editor.rest, editor.model.boneMap, editor.bones, mirrored ), 'Reflejé la pose (izquierda ⇄ derecha)' );

	} );

	/** Pone giros nuevos (pegados o reflejados) como cambios sin keyframe y dice qué falta. */
	function usePose( rotations, done ) {

		let count = 0;
		for ( const [ key, quaternion ] of rotations ) {

			const target = partBone( key );
			if ( ! target || target.quaternion.angleTo( quaternion ) < 1e-4 ) continue;
			target.quaternion.copy( quaternion );
			remember( target );
			editor.changed.add( key );
			count ++;

		}

		editor.model.container.updateMatrixWorld( true );
		syncSliders();
		render();
		if ( count === 0 ) toast( `${ done }: era igual a la que ya tenías.` );
		else toast( `${ done }: ${ plural( count, 'parte cambió', 'partes cambiaron' ) }. Pulsa «Poner keyframe» para guardarla en este momento.`, 'ok' );

	}

	// Guarda la pose que se ve: la parte elegida y todas las que se giraron sin keyframe.
	$( '#btn-keys-set' ).addEventListener( 'click', () => {

		const keys = [ ...new Set( [ ...editor.changed, editor.key ] ) ].filter( ( key ) => key && partBone( key ) );
		if ( keys.length === 0 ) return;
		editor.animation.setPose( editor.time, keys.map( ( key ) => [ partBone( key ).name, partBone( key ).quaternion ] ) );
		editor.changed.clear();
		if ( keys.length > 1 ) {

			toast( `Keyframe en ${ seconds( editor.time ) } s para ${ plural( keys.length, 'parte' ) }: ${ keys.map( ( key ) => boneLabel( key ) ).join( ', ' ) }.`, 'ok' );

		}

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

		// El estado (suena, botones apagados) lo pone el aviso 'change' del reproductor.
		editor.clip = editor.animation.toClip();
		app.animation.playPreview( editor.clip, { loop: true } );

	} );

	// "Volver a editar": detiene la otra animación; el reproductor vuelve a poner la pose de trabajo.
	$( '#btn-keys-resume' ).addEventListener( 'click', () => app.animation.stop() );

	// ¿Qué se ve? Mi vista previa, otra animación o (si no suena nada) la pose de trabajo.
	app.animation.addEventListener( 'change', () => {

		if ( ! editor || editor.model !== app.animation.model ) return;
		editor.playing = app.animation.isPreviewing( editor.clip );
		editor.other = editor.playing ? null : otherAnimation();
		attachGizmo();
		if ( ! editor.playing && ! editor.other ) syncSliders();
		render();

	} );

	/** El clip de otra animación que se está viendo (vista previa ajena, o reproduciendo o en pausa), o null. */
	function otherAnimation() {

		const anim = app.animation;
		if ( anim.preview ) return anim.preview.clip;
		return anim.action && anim.action.isScheduled() ? anim.action.getClip() : null;

	}

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
		const { model, playing, other } = editor;
		editor = null;
		app.animation.setIdlePose( null );
		gizmo?.detach();
		app.viewer.controls.enabled = true;
		resetCancel();
		editorBox.hidden = true;
		openButton.hidden = false;
		// El personaje vuelve al reposo (salvo que se esté viendo otra animación: esa sigue).
		if ( playing ) app.animation.stop();
		else if ( ! other && model === app.model ) model.restoreRestPose();

	}

	/**
	 * Muestra la pose de la animación en el momento elegido (o la de reposo si no hay keyframes) y la toma
	 * como pose de trabajo. Los giros sin keyframe de antes se descartan (y se avisa).
	 */
	function showPose() {

		const lost = [ ...editor.changed ].map( ( key ) => `«${ boneLabel( key ) }»` );
		editor.changed.clear();
		const model = editor.model;
		model.restoreRestPose();
		new ClipSampler( model.container, editor.animation.toClip() ).apply( editor.time );
		model.container.updateMatrixWorld( true );
		editor.pose.clear();
		for ( const item of editor.bones.values() ) remember( item );
		syncSliders();
		if ( lost.length > 0 ) {

			toast( `Se descartaron los giros sin keyframe de ${ lost.join( ', ' ) }. Para guardarlos, pulsa «Poner keyframe» antes de cambiar de momento.` );

		}

	}

	/** Anota el giro actual de un hueso en la pose de trabajo. */
	function remember( target ) {

		if ( target ) editor.pose.set( target, target.quaternion.clone() );

	}

	/** La parte elegida se giró (deslizadores o anillos): se anota y se avisa que le falta el keyframe. */
	function moved() {

		const target = bone();
		if ( ! target ) return;
		remember( target );
		editor.changed.add( editor.key );
		render();

	}

	/** Vuelve a poner la pose de trabajo (el reproductor la llama cuando el personaje volvió al reposo). */
	function applyWorkingPose() {

		if ( ! editor || editor.model !== app.animation.model ) return;
		editor.model.restoreRestPose();
		for ( const [ target, quaternion ] of editor.pose ) target.quaternion.copy( quaternion );
		editor.model.container.updateMatrixWorld( true );

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
		const { animation, time, playing, other } = editor;
		timeInput.max = String( animation.duration );
		timeInput.value = String( time );
		clock.textContent = `${ seconds( time ) } / ${ seconds( animation.duration ) } s`;
		for ( const control of editing ) control.disabled = playing || !! other;
		pasteButton.disabled = playing || !! other || ! clipboard;
		playButton.textContent = playing ? '■ Detener' : '▶ Reproducir';
		busyBox.hidden = ! other;
		if ( other ) {

			busyText.textContent = `Ahora se ve «${ other.name || 'otra animación' }», así que tus keyframes esperan. ` +
				'Tu pose no se pierde: pulsa «Volver a editar».';

		}

		// Marcas de los keyframes de la parte elegida sobre la línea de tiempo.
		const target = bone();
		const times = target ? animation.keyTimes( target.name ) : [];
		marks.innerHTML = times.map( ( at ) => `<span class="keys-mark${ Math.abs( at - time ) < 1e-3 ? ' current' : '' }" style="left: ${ ( at / animation.duration ) * 100 }%"></span>` ).join( '' );
		const label = editor.key ? boneLabel( editor.key ) : '';
		const own = times.length ? `«${ label }»: en ${ times.map( ( at ) => `${ seconds( at ) } s` ).join( ', ' ) }.` : `«${ label }» todavía no tiene keyframes.`;
		const pending = [ ...editor.changed ].map( ( key ) => `«${ boneLabel( key ) }»` );
		const warning = pending.length ? ` Giros sin keyframe: ${ pending.join( ', ' ) }. Pulsa «Poner keyframe» para guardarlos (si cambias de momento, se pierden).` : '';
		status.textContent = `${ plural( animation.keyCount, 'keyframe' ) } en total. ${ own }${ warning }`;

	}

	// Al exportar o guardar el proyecto: la animación a medio hacer todavía no está en el personaje.
	app.on( 'exporting', () => {

		if ( ! editor || editor.animation.keyCount === 0 ) return;
		toast( `«${ editor.animation.name }» todavía no está guardada, así que no va en el archivo. ` +
			'Pulsa «Guardar animación» y vuelve a exportar (o a guardar el proyecto).', 'info', 9000 );

	} );

	app.on( 'model', () => {

		close();
		// Solo un personaje con esqueleto se puede animar.
		box.hidden = ! app.model || findBones( app.model.container ).size === 0;

	} );

	app.on( 'bonemap', () => {

		if ( ! editor ) return;
		fillParts();
		// Mientras se ve otra animación, los huesos no están en la pose de trabajo: los deslizadores esperan.
		if ( ! editor.playing && ! editor.other ) syncSliders();
		render();

	} );

}

/** 1.5 -> "1,50" */
function seconds( value ) {

	return value.toFixed( 2 ).replace( '.', ',' );

}
