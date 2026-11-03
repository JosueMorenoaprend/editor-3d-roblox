// Panel "Reducir polígonos".
import { countTriangles } from '../core/info.js';
import {
	applyGeometryState, captureGeometryState, checkSimplifiable, getOriginalGeometry, isSimplified, restoreMesh,
	simplifierReady, simplifyMeshes,
} from '../core/simplify.js';
import { $, escapeHtml, formatInt, readNumber } from './dom.js';
import { toast } from './toast.js';

export function initSimplifyPanel( app ) {

	const targetInput = $( '#simplify-target' );
	const list = $( '#simplify-meshes' );
	const permissive = $( '#simplify-permissive' );
	const runButton = $( '#btn-simplify' );
	const undoButton = $( '#btn-simplify-undo' );
	const result = $( '#simplify-result' );

	let ready = false;
	/** Mallas marcadas para reducir. */
	let selected = new Set();

	simplifierReady.then( () => {

		ready = true;
		render();

	} ).catch( ( error ) => {

		console.error( error );
		toast( 'No se pudo cargar el simplificador (WebAssembly). Prueba con otro navegador.', 'error' );

	} );

	function target() {

		const value = readNumber( targetInput );
		return value !== null && value >= 50 ? Math.round( value ) : null;

	}

	/** Marca automáticamente las mallas que pasan del objetivo. */
	function autoSelect() {

		selected = new Set();
		const goal = target() ?? app.settings.triangleLimit;
		for ( const mesh of app.model ? app.model.meshes : [] ) {

			if ( checkSimplifiable( mesh ).ok && countTriangles( getOriginalGeometry( mesh ) ) > goal ) selected.add( mesh );

		}

	}

	targetInput.addEventListener( 'change', () => {

		if ( target() === null ) targetInput.value = app.settings.triangleLimit;
		autoSelect();
		render();

	} );

	list.addEventListener( 'change', ( event ) => {

		const input = event.target.closest( 'input[type="checkbox"]' );
		if ( ! input ) return;
		const mesh = app.model?.meshes[ Number( input.dataset.index ) ];
		if ( ! mesh ) return;
		if ( input.checked ) selected.add( mesh );
		else selected.delete( mesh );
		render();

	} );

	runButton.addEventListener( 'click', async () => {

		const model = app.model;
		const goal = target();
		if ( ! model || goal === null ) return;
		const meshes = model.meshes.filter( ( mesh ) => selected.has( mesh ) );
		if ( meshes.length === 0 ) return;

		const before = captureGeometryState( model.meshes );
		const results = await app.run( 'Reduciendo polígonos…', () => simplifyMeshes( meshes, goal, { permissive: permissive.checked } ), 'No se pudo reducir' );
		if ( ! results ) return;

		model.updateLocalBox();
		showResults( results, goal );
		app.emit( 'geometry' );
		pushGeometryChange( model, 'Reducir polígonos', before );

	} );

	/** Guarda en el historial un cambio de mallas (si hubo cambio). */
	function pushGeometryChange( model, label, before ) {

		const after = captureGeometryState( model.meshes );
		if ( after.every( ( item, i ) => item.geometry === before[ i ].geometry ) ) return;
		const apply = ( state ) => {

			applyGeometryState( state );
			model.updateLocalBox();
			result.hidden = true;
			app.emit( 'geometry' );

		};

		app.history.push( { label, undo: () => apply( before ), redo: () => apply( after ) } );

	}

	undoButton.addEventListener( 'click', () => {

		const model = app.model;
		if ( ! model ) return;
		const before = captureGeometryState( model.meshes );
		let restored = 0;
		for ( const mesh of model.meshes ) if ( restoreMesh( mesh ) ) restored ++;
		model.updateLocalBox();
		result.hidden = true;
		if ( restored > 0 ) toast( 'Se volvió a la malla original.', 'ok' );
		app.emit( 'geometry' );
		pushGeometryChange( model, 'Volver al original', before );

	} );

	function showResults( results, goal ) {

		const items = results.map( ( r ) => {

			const name = escapeHtml( r.mesh.name || '(sin nombre)' );
			if ( r.skipped ) return `<li>${ name }: sin cambios. ${ escapeHtml( r.skipped ) }</li>`;
			return `<li>${ name }: ${ formatInt( r.before ) } → <strong>${ formatInt( r.after ) }</strong> triángulos${ r.reached ? '' : ' <span class="badge badge-warn">no llegó al objetivo</span>' }</li>`;

		} ).join( '' );

		const stuck = results.some( ( r ) => ! r.skipped && ! r.reached );
		const advice = stuck
			? permissive.checked
				? '<p>Algunas partes no se pudieron reducir más sin romper la forma. Prueba con un objetivo un poco mayor.</p>'
				: '<p>No se pudo llegar al objetivo sin cruzar las costuras de la textura (y el editor nunca borra piezas del modelo). Activa el <strong>modo agresivo</strong> y vuelve a reducir.</p>'
			: '<p>Revisa la textura y la forma en la vista 3D (el botón <em>Malla</em> muestra los triángulos).</p>';

		result.className = `result alert ${ stuck ? 'alert-warn' : 'alert-ok' }`;
		result.innerHTML = `<strong>Objetivo: ${ formatInt( goal ) } triángulos por malla</strong><ul>${ items }</ul>${ advice }`;
		result.hidden = false;

	}

	function render() {

		const model = app.model;
		targetInput.disabled = ! model;
		permissive.disabled = ! model;

		if ( ! model ) {

			list.innerHTML = '<p class="muted">Abre un modelo para reducir sus polígonos.</p>';
			runButton.disabled = true;
			undoButton.disabled = true;
			return;

		}

		const goal = target();
		list.innerHTML = model.meshes.map( ( mesh, index ) => {

			const check = checkSimplifiable( mesh );
			const original = countTriangles( getOriginalGeometry( mesh ) );
			const current = countTriangles( mesh.geometry );
			const counts = isSimplified( mesh )
				? `${ formatInt( original ) } → ${ formatInt( current ) }`
				: formatInt( current );
			const note = check.ok ? check.note : check.reason;
			return `
				<label class="mesh-option${ check.ok ? '' : ' disabled' }">
					<input type="checkbox" data-index="${ index }" ${ check.ok && selected.has( mesh ) ? 'checked' : '' } ${ check.ok ? '' : 'disabled' } />
					<span class="mesh-option-main">
						<span class="mesh-option-title">
							<span class="mesh-name">${ escapeHtml( mesh.name || '(sin nombre)' ) }</span>
							<span class="mono">${ counts }</span>
						</span>
						${ note ? `<span class="mesh-option-note">${ check.ok ? '' : '⛔ ' }${ escapeHtml( note ) }</span>` : '' }
					</span>
				</label>`;

		} ).join( '' );

		const anySelected = model.meshes.some( ( mesh ) => selected.has( mesh ) );
		runButton.disabled = ! ready || ! anySelected || goal === null;
		runButton.textContent = ready ? 'Reducir' : 'Cargando simplificador…';
		undoButton.disabled = ! model.meshes.some( isSimplified );

	}

	app.on( 'model', () => {

		targetInput.value = app.settings.triangleLimit;
		result.hidden = true;
		autoSelect();
		render();

	} );

	let lastLimit = app.settings.triangleLimit;
	app.on( 'settings', () => {

		// Solo cuando cambia el límite de triángulos, no con otras preferencias.
		if ( app.settings.triangleLimit === lastLimit ) return;
		lastLimit = app.settings.triangleLimit;
		if ( app.model ) {

			targetInput.value = lastLimit;
			autoSelect();

		}

		render();

	} );

	app.on( 'geometry', render );
	render();

}
