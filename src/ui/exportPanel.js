// Panel "Exportar": descarga el .glb y lo vuelve a abrir para comprobarlo.
import { downloadBlob, exportGLB, verifyGLB } from '../core/exporter.js';
import { $, escapeHtml, formatBytes, formatInt, formatNumber, plural } from './dom.js';
import { toast } from './toast.js';

export function initExportPanel( app ) {

	const nameInput = $( '#export-name' );
	const textureSelect = $( '#export-texture' );
	const animsCheck = $( '#export-anims' );
	const button = $( '#btn-export' );
	const topButton = $( '#btn-export-top' );
	const result = $( '#export-result' );
	const clipBox = $( '#export-clips' );
	const clipList = $( '#export-clip-list' );
	/** Animaciones que el usuario sacó de la exportación (mientras este modelo esté abierto). */
	let excluded = new WeakSet();

	textureSelect.value = String( app.settings.textureSize );
	textureSelect.addEventListener( 'change', () => app.setSetting( 'textureSize', Number( textureSelect.value ) ) );

	async function runExport() {

		const model = app.model;
		if ( ! model ) return;

		const fileName = cleanFileName( nameInput.value || `${ model.baseName }_roblox` ) + '.glb';
		const maxTextureSize = Number( textureSelect.value ) || Infinity;
		const clips = animsCheck.checked ? model.clips.filter( ( clip ) => ! excluded.has( clip ) ) : [];
		const withAnimations = clips.length > 0;

		// Se exporta en la pose de reposo, no en el cuadro actual de una animación ni en la pose que se está
		// armando en el editor de keyframes (esa vuelve al terminar).
		const wasPlaying = app.animation.isPlaying;
		app.animation.stop();
		if ( wasPlaying ) toast( 'Detuve la animación para exportar en la pose original.' );

		const output = await app.run( 'Exportando…', async () => {

			const { blob, arrayBuffer } = await app.animation.atRestPose( () => exportGLB( model, { clips, maxTextureSize } ) );
			downloadBlob( blob, fileName );
			const check = await verifyGLB( arrayBuffer, app.settings.triangleLimit );
			return { blob, check };

		}, 'No se pudo exportar', { help: 'Prueba exportar con texturas de 1024 px o reduce los polígonos antes. Tu trabajo no se perdió.' } );

		if ( ! output ) return;
		const { blob, check } = output;
		const limit = app.settings.triangleLimit;
		const tooBig = check.meshesOverLimit > 0;
		const { x, y, z } = check.size;
		result.className = `result alert ${ tooBig ? 'alert-warn' : 'alert-ok' }`;
		result.innerHTML = `
			<strong>✓ Descargado: ${ escapeHtml( fileName ) } (${ formatBytes( blob.size ) })</strong>
			<p>Comprobación: el archivo se volvió a abrir bien con ${ plural( check.meshes, 'malla' ) },
			${ formatInt( check.triangles ) } triángulos, ${ plural( check.bones, 'hueso' ) } y
			${ plural( check.animations, 'animación', 'animaciones' ) }.
			Mide ${ formatNumber( x ) } × ${ formatNumber( y ) } × ${ formatNumber( z ) } m.</p>
			${ tooBig ? `<p>⚠ ${ plural( check.meshesOverLimit, 'malla sigue', 'mallas siguen' ) } por encima de ${ formatInt( limit ) } triángulos.</p>` : '' }`;
		result.hidden = false;

	}

	// Una casilla por animación (si hay más de una): las desmarcadas no van en el archivo.
	function renderClips() {

		const clips = app.model ? app.model.clips : [];
		clipBox.hidden = clips.length < 2 || ! animsCheck.checked;
		clipList.innerHTML = clips.map( ( clip, i ) => `
			<label class="check">
				<input type="checkbox" data-clip="${ i }"${ excluded.has( clip ) ? '' : ' checked' } />
				<span>${ escapeHtml( clip.name || `Animación ${ i + 1 }` ) } <span class="mono">(${ formatNumber( clip.duration, 2 ) } s)</span></span>
			</label>` ).join( '' );

	}

	clipList.addEventListener( 'change', ( event ) => {

		const input = event.target.closest( 'input[data-clip]' );
		const clip = input && app.model ? app.model.clips[ Number( input.dataset.clip ) ] : null;
		if ( ! clip ) return;
		if ( input.checked ) excluded.delete( clip );
		else excluded.add( clip );

	} );

	animsCheck.addEventListener( 'change', renderClips );

	button.addEventListener( 'click', runExport );
	topButton.addEventListener( 'click', () => {

		button.closest( 'details' ).open = true;
		button.scrollIntoView( { behavior: 'smooth', block: 'center' } );
		runExport();

	} );

	function render() {

		const model = app.model;
		for ( const control of [ nameInput, textureSelect, button, topButton ] ) control.disabled = ! model;
		animsCheck.disabled = ! model || model.clips.length === 0;
		result.hidden = true;
		nameInput.value = model ? `${ model.baseName }_roblox` : '';

	}

	app.on( 'model', () => {

		excluded = new WeakSet();
		render();
		renderClips();

	} );
	// Al agregar o quitar animaciones, solo cambian las casillas (el nombre que escribiste se queda).
	app.on( 'clips', () => {

		animsCheck.disabled = ! app.model || app.model.clips.length === 0;
		renderClips();

	} );
	render();
	renderClips();

}

function cleanFileName( name ) {

	const clean = name.trim().replace( /\.glb$/i, '' ).replace( /[\\/:*?"<>|]+/g, '_' );
	return clean || 'modelo_roblox';

}
