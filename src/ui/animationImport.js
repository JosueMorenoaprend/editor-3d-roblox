// "Agregar animaciones de otro archivo" (dentro del panel Animaciones): lee un GLB con animaciones,
// las pasa a los huesos de mi personaje (core/animationImport.js), deja verlas antes (vista previa) y
// agrega las elegidas. Agregar se puede deshacer.
import { importAnimations } from '../core/animationImport.js';
import { boneLabel, listBones } from '../core/boneMap.js';
import { loadModelFromFiles } from '../core/loader.js';
import { addClipsWithUndo } from './clipHistory.js';
import { $, escapeHtml, formatNumber, plural } from './dom.js';
import { toast } from './toast.js';

export function initAnimationImport( app ) {

	const box = $( '#anim-import' );
	const button = $( '#btn-anim-import' );
	const input = $( '#anim-import-input' );
	const result = $( '#anim-import-result' );

	/** Lo que se leyó del último archivo: { model, fileName, clips, kind, missing } (o null). */
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
		found = { model, ...read };
		render();

	} );

	result.addEventListener( 'click', ( event ) => {

		const preview = event.target.closest( '[data-preview]' );
		if ( preview && found ) app.animation.playPreview( found.clips[ Number( preview.dataset.preview ) ] );
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
		const chosen = [ ...result.querySelectorAll( 'input[data-index]:checked' ) ].map( ( check ) => found.clips[ Number( check.dataset.index ) ] );
		if ( chosen.length === 0 ) return;

		const names = addClipsWithUndo( app, chosen );
		toast( `Listo: agregué ${ plural( chosen.length, 'animación', 'animaciones' ) } (${ names }). ` +
			'Elígelas arriba para verlas; si no te gustan, deshazlo con Ctrl+Z.', 'ok', 7000 );
		close();

	}

	function close() {

		if ( found && app.animation.preview && found.clips.includes( app.animation.preview.clip ) ) app.animation.stop();
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
					<span>${ escapeHtml( clip.name ) } <span class="mono">(${ formatNumber( clip.duration, 2 ) } s)</span></span>
				</label>
				<button type="button" class="btn btn-sm" data-preview="${ i }" aria-label="Ver «${ escapeHtml( clip.name ) }» en mi personaje">▶ Ver</button>
			</li>` ).join( '' );
		const still = missing.length > 0
			? `<p class="small anim-import-warn">⚠ El archivo no mueve: ${ escapeHtml( missing.map( boneLabel ).join( ', ' ) ) }. En tu personaje esas partes quedarán quietas.</p>`
			: '';
		result.innerHTML = `
			<p><strong>«${ escapeHtml( fileName ) }»</strong>: ${ plural( clips.length, 'animación', 'animaciones' ) }
				<span class="muted">(esqueleto ${ escapeHtml( kind === 'desconocido' ? 'sin nombre conocido' : kind ) })</span></p>
			<p class="muted small">Ya están pasadas a tu personaje. Con ▶ Ver las ves en la vista 3D antes de agregarlas.</p>
			${ still }
			<ul class="anim-import-list">${ items }</ul>
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
