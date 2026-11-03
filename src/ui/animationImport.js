// "Agregar animaciones de otro archivo" (dentro del panel Animaciones): lee un GLB con animaciones,
// las pasa a los huesos de mi personaje (core/animationImport.js), deja verlas antes (vista previa) y
// agrega las elegidas. Las que hacen avanzar al personaje se dejan en el lugar (si no se desmarca), como
// las usa Roblox. Agregar se puede deshacer.
import { importAnimations } from '../core/animationImport.js';
import { boneLabel, listBones } from '../core/boneMap.js';
import { makeInPlace, noticeableMotion, rootMotion } from '../core/inPlace.js';
import { loadModelFromFiles } from '../core/loader.js';
import { addClipsWithUndo } from './clipHistory.js';
import { $, escapeHtml, formatNumber, plural } from './dom.js';
import { toast } from './toast.js';

export function initAnimationImport( app ) {

	const box = $( '#anim-import' );
	const button = $( '#btn-anim-import' );
	const input = $( '#anim-import-input' );
	const result = $( '#anim-import-result' );

	/**
	 * Lo que se leyó del último archivo (o null): { model, fileName, clips, kind, missing, advances }.
	 * advances: cuánto hace avanzar al personaje cada animación (metros); still: sus versiones en el lugar.
	 */
	let found = null;

	button.addEventListener( 'click', () => input.click() );

	input.addEventListener( 'change', async () => {

		const files = [ ...input.files ];
		input.value = ''; // permite volver a elegir el mismo archivo
		const model = app.model;
		if ( ! model || files.length === 0 ) return;

		const read = await app.run( 'Leyendo animaciones…', async () => {

			const { gltf, fileName } = await loadModelFromFiles( files );
			return { fileName, ...importAnimations( gltf, fileName, model ) };

		}, 'No se pudieron agregar las animaciones', {
			help: 'Prueba con otro archivo .glb que tenga animación. Tu personaje quedó igual.',
		} );

		// Si mientras tanto se abrió otro modelo, lo leído ya no sirve.
		if ( ! read || app.model !== model ) return;
		found = { model, ...read, advances: read.clips.map( ( clip ) => rootMotion( model, clip ).distance ), still: new Map() };
		render();

	} );

	result.addEventListener( 'click', ( event ) => {

		const preview = event.target.closest( '[data-preview]' );
		if ( preview && found ) app.animation.playPreview( prepared( Number( preview.dataset.preview ) ) );
		if ( event.target.closest( '#btn-anim-import-add' ) ) addChosen();
		if ( event.target.closest( '#btn-anim-import-cancel' ) ) close();

	} );

	result.addEventListener( 'change', () => {

		const count = result.querySelectorAll( 'input[data-index]:checked' ).length;
		const add = $( '#btn-anim-import-add' );
		add.disabled = count === 0;
		add.textContent = count === 0 ? 'Elige al menos una' : `Agregar ${ plural( count, 'animación', 'animaciones' ) }`;

	} );

	function addChosen() {

		const model = app.model;
		if ( ! found || found.model !== model ) return close();
		const chosen = [ ...result.querySelectorAll( 'input[data-index]:checked' ) ].map( ( check ) => prepared( Number( check.dataset.index ) ) );
		if ( chosen.length === 0 ) return;

		const names = addClipsWithUndo( app, chosen );
		toast( `Listo: agregué ${ plural( chosen.length, 'animación', 'animaciones' ) } (${ names }). ` +
			'Elígelas arriba para verlas; si no te gustan, deshazlo con Ctrl+Z.', 'ok', 7000 );
		close();

	}

	/** ¿La animación i hace avanzar al personaje? */
	function moves( i ) {

		return found.advances[ i ] > noticeableMotion( found.model );

	}

	/** La animación i tal como se va a agregar: en el lugar si avanza y la casilla está marcada. */
	function prepared( i ) {

		const clip = found.clips[ i ];
		if ( ! moves( i ) || ! $( '#anim-import-in-place' )?.checked ) return clip;
		if ( ! found.still.has( i ) ) found.still.set( i, makeInPlace( found.model, clip ) );
		return found.still.get( i );

	}

	function close() {

		const mine = found ? [ ...found.clips, ...found.still.values() ] : [];
		if ( mine.some( ( clip ) => app.animation.isPreviewing( clip ) ) ) app.animation.stop();
		found = null;
		result.hidden = true;
		result.innerHTML = '';

	}

	function render() {

		const { fileName, clips, kind, missing } = found;
		const items = clips.map( ( clip, i ) => `
			<li>
				<label class="check">
					<input type="checkbox" data-index="${ i }" checked />
					<span>${ escapeHtml( clip.name ) } <span class="mono">(${ formatNumber( clip.duration, 2 ) } s)</span>${ moves( i ) ? ` <span class="badge badge-warn">avanza ${ formatNumber( found.advances[ i ], 1 ) } m</span>` : '' }</span>
				</label>
				<button type="button" class="btn btn-sm" data-preview="${ i }" aria-label="Ver «${ escapeHtml( clip.name ) }» en mi personaje">▶ Ver</button>
			</li>` ).join( '' );
		const still = missing.length > 0
			? `<p class="small anim-import-warn">⚠ El archivo no mueve: ${ escapeHtml( missing.map( boneLabel ).join( ', ' ) ) }. En tu personaje esas partes quedarán quietas.</p>`
			: '';
		const inPlace = clips.some( ( clip, i ) => moves( i ) )
			? `<label class="check"><input type="checkbox" id="anim-import-in-place" checked />
				<span>Dejar en el lugar las que avanzan (recomendado para Roblox: el que camina es el personaje del juego)</span></label>`
			: '';
		result.innerHTML = `
			<p><strong>«${ escapeHtml( fileName ) }»</strong>: ${ plural( clips.length, 'animación', 'animaciones' ) }
				<span class="muted">(esqueleto ${ escapeHtml( kind === 'desconocido' ? 'sin nombre conocido' : kind ) })</span></p>
			<p class="muted small">Ya están pasadas a tu personaje. Con ▶ Ver las ves en la vista 3D antes de agregarlas.</p>
			${ still }
			<ul class="anim-import-list">${ items }</ul>
			${ inPlace }
			<div class="btn-group wide">
				<button type="button" class="btn btn-primary" id="btn-anim-import-add">Agregar ${ plural( clips.length, 'animación', 'animaciones' ) }</button>
				<button type="button" class="btn btn-ghost" id="btn-anim-import-cancel">Cancelar</button>
			</div>`;
		result.hidden = false;

	}

	app.on( 'model', () => {

		close();
		// Solo un personaje con esqueleto puede recibir animaciones.
		box.hidden = ! app.model || listBones( app.model.container ).length === 0;

	} );

}
