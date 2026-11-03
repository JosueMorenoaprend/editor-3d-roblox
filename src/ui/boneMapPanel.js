// Panel "Mapa de huesos": qué hueso del personaje es cada parte del cuerpo (cadera, brazo izquierdo…).
// Muestra lo que se detectó solo, deja corregir cada parte a mano (con deshacer) y probarlo con una
// animación corta que mueve cada parte por turnos. El mapa se guarda en el proyecto.
import { Vector3 } from 'three';
import { detectBoneMap, guessSkeletonKind } from '../core/boneDetect.js';
import {
	HUMANOID_BONES, REQUIRED_BONES, boneLabel, humanoidBone, listBones, sameBoneMap, validateBoneMap,
} from '../core/boneMap.js';
import { createBoneTestClip, nextBoneKey } from '../core/boneTest.js';
import { BoneHighlight } from './boneHighlight.js';
import { $, escapeHtml, formatInt } from './dom.js';
import { toast } from './toast.js';

/** Partes de la lista, agrupadas como se leen en el cuerpo. */
const GROUPS = [
	{ title: 'Tronco y cabeza', keys: [ 'hips', 'spine', 'chest', 'neck', 'head' ] },
	{ title: 'Brazo izquierdo', keys: [ 'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand' ] },
	{ title: 'Brazo derecho', keys: [ 'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand' ] },
	{ title: 'Pierna izquierda', keys: [ 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes' ] },
	{ title: 'Pierna derecha', keys: [ 'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes' ] },
];

const STATE_ICON = { ok: '✓', problem: '!', missing: '!', empty: '–' };
/** Problemas que se muestran arriba (el resto se ve en cada fila). */
const MAX_PROBLEMS = 4;

export function initBoneMapPanel( app ) {

	const empty = $( '#bonemap-empty' );
	const controls = $( '#bonemap-controls' );
	const status = $( '#bonemap-status' );
	const summary = $( '#bonemap-summary' );
	const details = $( '#bonemap-details' );
	const list = $( '#bonemap-list' );
	const testButton = $( '#btn-bonemap-test' );
	const detectButton = $( '#btn-bonemap-detect' );
	const now = $( '#bonemap-now' );
	const highlight = new BoneHighlight( app.viewer );

	/** Prueba en curso: { clip, steps, step (la parte que se mueve), time (hasta dónde llegó) } (o null). */
	let test = null;
	/** Parte elegida en la lista: se marca en la vista 3D. */
	let activeKey = null;

	// ---------- Cambiar el mapa (siempre con deshacer) ----------

	function applyMap( next, label ) {

		const model = app.model;
		if ( ! model ) return;
		const before = { ...model.boneMap };
		const after = { ...next };
		if ( sameBoneMap( before, after ) ) {

			renderMap();
			return;

		}

		const set = ( map ) => {

			model.boneMap = { ...map };
			app.emit( 'bonemap' );

		};

		set( after );
		app.history.push( { label, undo: () => set( before ), redo: () => set( after ) } );

	}

	list.addEventListener( 'change', ( event ) => {

		const select = event.target.closest( 'select[data-key]' );
		const model = app.model;
		if ( ! select || ! model ) return;
		const key = select.dataset.key;
		const next = { ...model.boneMap };
		if ( select.value ) next[ key ] = select.value;
		else delete next[ key ];
		setActive( key );
		applyMap( next, `Mapa de huesos: ${ boneLabel( key ) }` );

	} );

	// Al pasar por una fila (con el teclado o tocándola), su hueso se marca en la vista 3D.
	list.addEventListener( 'focusin', ( event ) => {

		const row = event.target.closest( '.bonemap-row' );
		if ( row ) setActive( row.dataset.key );

	} );

	list.addEventListener( 'click', ( event ) => {

		const button = event.target.closest( '[data-try]' );
		if ( button ) runTest( [ button.dataset.try ] );

	} );

	detectButton.addEventListener( 'click', async () => {

		const model = app.model;
		if ( ! model || app.busy ) return;
		// Se detecta en la pose de reposo (aunque haya una animación en pausa a mitad de camino).
		const { boneMap } = await app.animation.atRestPose( () => detectBoneMap( model.container ) );
		if ( app.model !== model ) return;
		if ( sameBoneMap( boneMap, model.boneMap ) ) {

			toast( 'El mapa ya es el que se detecta solo: no hay nada que cambiar.' );
			return;

		}

		applyMap( boneMap, 'Detectar el mapa de huesos otra vez' );
		toast( 'Listo: volví a detectar el mapa de huesos. Si no te gusta, deshazlo con Ctrl+Z.', 'ok' );

	} );

	// ---------- Probar: cada parte se mueve por turnos ----------

	function runTest( keys ) {

		const model = app.model;
		if ( ! model || app.busy ) return;
		const { clip, steps } = createBoneTestClip( model, model.boneMap, keys );
		if ( steps.length === 0 ) {

			toast( 'Primero elige qué hueso es cada parte del cuerpo (en la lista de abajo).' );
			return;

		}

		// Primero se arranca (eso detiene lo que sonaba, incluida una prueba anterior) y después se anota.
		app.animation.playPreview( clip );
		test = { clip, steps, step: null, time: 0 };
		renderTest();
		revealViewport();

	}

	testButton.addEventListener( 'click', () => {

		if ( testRunning() ) app.animation.stop();
		else runTest( null );

	} );

	/** ¿Está sonando (o en pausa) la prueba de este panel? */
	function testRunning() {

		return !! test && app.animation.preview?.clip === test.clip;

	}

	function renderTest() {

		if ( ! test ) return;
		if ( ! testRunning() ) {

			// Terminó (o la detuvieron: con "Detener", al exportar…). Si llegó al final, se pregunta si se
			// movió lo que se esperaba.
			const completed = test.time >= test.clip.duration - 1e-3;
			const single = test.steps.length === 1 ? test.steps[ 0 ] : null;
			if ( ! completed ) now.textContent = 'Prueba detenida.';
			else if ( single ) now.textContent = `Probado: «${ single.label }» (${ single.boneName }). ¿Se movió esa parte del cuerpo? Si no, elige otro hueso.`;
			else now.textContent = 'Prueba terminada: ¿se movió cada parte como esperabas? Si alguna no, corrígela en la lista.';
			test = null;
			testButton.textContent = 'Probar el mapa';
			showActive();
			return;

		}

		testButton.textContent = 'Detener la prueba';
		const time = app.animation.time;
		test.time = time;
		const step = test.steps.find( ( item ) => time >= item.start && time < item.end ) || test.steps[ test.steps.length - 1 ];
		if ( step === test.step ) return;
		test.step = step;
		now.textContent = `Ahora se mueve: «${ step.label }» (${ step.boneName })`;
		markRow( step.key );
		showBone( step.key );

	}

	/** En el celular la vista 3D queda arriba: se sube hasta ella para ver la prueba. */
	function revealViewport() {

		const viewport = $( '#viewport' );
		const box = viewport.getBoundingClientRect();
		if ( box.bottom < 120 || box.top > window.innerHeight - 120 ) viewport.scrollIntoView( { behavior: 'smooth', block: 'start' } );

	}

	// ---------- Marcar el hueso en la vista 3D ----------

	function findBone( name ) {

		if ( ! app.model || ! name ) return null;
		let found = null;
		app.model.container.traverse( ( object ) => {

			if ( ! found && object.isBone && object.name === name ) found = object;

		} );
		return found;

	}

	function showBone( key ) {

		const model = app.model;
		const bone = key ? findBone( model?.boneMap[ key ] ) : null;
		if ( ! bone ) {

			highlight.show( null );
			return;

		}

		const nextKey = nextBoneKey( model.boneMap, key );
		const end = ( nextKey && findBone( model.boneMap[ nextKey ] ) ) || bone.children.find( ( child ) => child.isBone ) || null;
		const size = model.getWorldBox().getSize( new Vector3() );
		highlight.show( bone, end, Math.max( size.x, size.y, size.z, 0.05 ) * 0.02 );

	}

	function markRow( key ) {

		for ( const row of list.querySelectorAll( '.bonemap-row' ) ) row.classList.toggle( 'active', row.dataset.key === key );

	}

	function setActive( key ) {

		activeKey = key;
		if ( ! testRunning() ) showActive();

	}

	function showActive() {

		markRow( activeKey );
		showBone( activeKey );

	}

	// ---------- Dibujar el panel ----------

	function renderModel() {

		test = null;
		activeKey = null;
		now.textContent = '';
		testButton.textContent = 'Probar el mapa';
		highlight.show( null );

		const model = app.model;
		const bones = model ? listBones( model.container ) : [];
		if ( bones.length === 0 ) {

			controls.hidden = true;
			empty.hidden = false;
			empty.innerHTML = model
				? 'Este modelo no tiene esqueleto (huesos), así que no se puede animar. Si es un personaje, ' +
					'genéralo en Tripo AI con <em>rig</em> (esqueleto automático) y vuelve a abrirlo.'
				: 'Abre un personaje con esqueleto para ver qué hueso es cada parte del cuerpo.';
			list.innerHTML = '';
			return;

		}

		empty.hidden = true;
		controls.hidden = false;
		// Sangría según la profundidad en el árbol, para ver qué hueso cuelga de cuál.
		const options = '<option value="">— ninguno —</option>' + bones.map( ( { name, depth } ) =>
			`<option value="${ escapeHtml( name ) }">${ '  '.repeat( Math.min( depth, 8 ) ) }${ escapeHtml( name ) }</option>` ).join( '' );
		list.innerHTML = GROUPS.map( ( group ) => `
			<fieldset class="bonemap-group">
				<legend>${ group.title }</legend>
				${ group.keys.map( ( key ) => rowHtml( key, options ) ).join( '' ) }
			</fieldset>` ).join( '' );

		renderMap();
		// Si falta algo, la lista se abre sola; si está completo, queda cerrada para no ocupar lugar.
		details.open = ! validateBoneMap( model.boneMap, model.container ).ok;

	}

	function rowHtml( key, options ) {

		const bone = humanoidBone( key );
		return `
			<div class="bonemap-row" data-key="${ key }">
				<label for="bonemap-${ key }">
					<span class="bonemap-icon" aria-hidden="true"></span>
					<span>${ escapeHtml( bone.label ) }${ bone.required ? '' : ' <span class="muted small">(opcional)</span>' }</span>
				</label>
				<select id="bonemap-${ key }" data-key="${ key }">${ options }</select>
				<button type="button" class="btn btn-sm bonemap-try" data-try="${ key }" aria-label="Probar «${ escapeHtml( bone.label ) }»" title="Mover este hueso para ver si es el correcto">▶</button>
				<p class="bonemap-issue" hidden></p>
			</div>`;

	}

	function renderMap() {

		const model = app.model;
		if ( ! model || controls.hidden ) return;
		const map = model.boneMap;
		const result = validateBoneMap( map, model.container );
		const names = listBones( model.container ).map( ( item ) => item.name );
		const kind = guessSkeletonKind( names );
		const required = REQUIRED_BONES.filter( ( key ) => map[ key ] ).length;
		const optional = HUMANOID_BONES.filter( ( bone ) => ! bone.required && map[ bone.key ] ).length;

		summary.innerHTML = `
			<dt>Tipo de esqueleto</dt><dd>${ kind === 'desconocido' ? 'No lo reconozco (puede ser de Tripo u otro programa)' : escapeHtml( kind ) }</dd>
			<dt>Huesos</dt><dd>${ formatInt( names.length ) }</dd>
			<dt>Partes del cuerpo</dt><dd>${ required } de ${ REQUIRED_BONES.length } necesarias${ optional ? ` <span class="muted">(+ ${ optional } opcionales)</span>` : '' }</dd>`;

		if ( result.ok ) {

			status.className = 'alert alert-ok';
			status.innerHTML = '<strong>✓ Mapa completo.</strong> El editor sabe qué hueso es cada parte del cuerpo. ' +
				'Pulsa <em>Probar el mapa</em> para verlas moverse una por una.';

		} else {

			const shown = result.problems.slice( 0, MAX_PROBLEMS ).map( ( problem ) => `<li>${ escapeHtml( problem ) }</li>` ).join( '' );
			const more = result.problems.length > MAX_PROBLEMS ? `<li>Y ${ result.problems.length - MAX_PROBLEMS } más: míralos en la lista.</li>` : '';
			status.className = 'alert alert-warn';
			status.innerHTML = `<strong>⚠ Hay que revisar el mapa</strong> para poder animar este personaje:<ul>${ shown }${ more }</ul>` +
				'Elige el hueso de cada parte en la lista de abajo. Con ▶ ves qué se mueve.';

		}

		for ( const row of list.querySelectorAll( '.bonemap-row' ) ) {

			const key = row.dataset.key;
			const select = row.querySelector( 'select' );
			select.value = map[ key ] || '';
			const issue = result.issues[ key ];
			const state = issue ? ( map[ key ] ? 'problem' : 'missing' ) : ( map[ key ] ? 'ok' : 'empty' );
			row.dataset.state = state;
			row.querySelector( '.bonemap-icon' ).textContent = STATE_ICON[ state ];
			row.querySelector( '[data-try]' ).disabled = ! map[ key ];
			const note = row.querySelector( '.bonemap-issue' );
			// "Falta elegir…" ya se entiende por la fila vacía y marcada; los otros problemas se explican.
			note.hidden = state !== 'problem';
			note.textContent = state === 'problem' ? issue : '';

		}

		if ( ! testRunning() ) showActive();

	}

	app.on( 'model', renderModel );
	app.on( 'bonemap', renderMap );
	app.animation.addEventListener( 'change', renderTest );
	app.animation.addEventListener( 'tick', renderTest );
	renderModel();

}
