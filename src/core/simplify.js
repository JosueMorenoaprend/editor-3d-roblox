// Reducir polígonos: qué mallas se reducen, su geometría original (para volver atrás)
// y la reducción en un Web Worker para que la página no se congele.
//
// El algoritmo está en simplifyGeometry.js. Este archivo no lo importa directamente:
// así el paquete principal no carga meshoptimizer (lo carga el worker cuando hace falta).
import { countTriangles } from './info.js';
import { packGeometry, unpackGeometry } from './geometryTransfer.js';

// Geometría original de cada malla, para poder deshacer y para reducir
// siempre desde el original (da mejor calidad que reducir lo ya reducido).
const originals = new WeakMap();

const MIN_TRIANGLES = 50;

/** Geometría original de la malla (antes de cualquier reducción). */
export function getOriginalGeometry( mesh ) {

	return originals.get( mesh ) || mesh.geometry;

}

export function isSimplified( mesh ) {

	return originals.has( mesh );

}

/**
 * ¿Se puede reducir esta malla sin romperla?
 * @returns {{ ok: boolean, reason?: string, note?: string }}
 */
export function checkSimplifiable( mesh ) {

	const geometry = getOriginalGeometry( mesh );
	const attributes = geometry.attributes;

	if ( ! attributes.position ) return { ok: false, reason: 'No tiene vértices.' };

	if ( mesh.isSkinnedMesh && ( ! attributes.skinIndex || ! attributes.skinWeight ) ) {

		return {
			ok: false,
			reason: 'Tiene esqueleto pero le faltan los pesos de los huesos (skinIndex/skinWeight). ' +
				'Reducirla podría deformarla, así que está desactivada.',
		};

	}

	if ( countTriangles( geometry ) < MIN_TRIANGLES ) {

		return { ok: false, reason: `Es muy pequeña (menos de ${ MIN_TRIANGLES } triángulos).` };

	}

	const notes = [];
	if ( mesh.isSkinnedMesh ) notes.push( 'Con esqueleto: se conservan los pesos de los huesos.' );
	if ( Object.keys( geometry.morphAttributes ).length > 0 ) notes.push( 'Tiene formas (morph targets): se conservan, pero revisa el resultado.' );

	return { ok: true, note: notes.join( ' ' ) };

}

/**
 * Decide qué hacer con cada malla. Las mallas que comparten geometría se reducen una sola vez.
 * @returns {{ targetTriangles: number, items: object[], jobs: { original: import('three').BufferGeometry, targetTriangles: number, options: object }[] }}
 */
export function planSimplification( meshes, targetTriangles, options = {} ) {

	const items = [];
	const jobs = [];
	for ( const mesh of meshes ) {

		const check = checkSimplifiable( mesh );
		const original = getOriginalGeometry( mesh );
		const before = countTriangles( original );

		if ( ! check.ok ) {

			items.push( { mesh, before, after: countTriangles( mesh.geometry ), skipped: check.reason } );
			continue;

		}

		if ( before <= targetTriangles ) {

			items.push( { mesh, before, after: before, skipped: 'Ya tiene menos triángulos que el objetivo.', restore: true } );
			continue;

		}

		const skinned = mesh.isSkinnedMesh === true;
		let job = jobs.find( ( j ) => j.original === original && j.options.skinned === skinned );
		if ( ! job ) {

			job = { original, targetTriangles, options: { permissive: options.permissive === true, skinned } };
			jobs.push( job );

		}

		items.push( { mesh, before, job } );

	}

	return { targetTriangles, items, jobs };

}

/**
 * Pone en las mallas las geometrías reducidas.
 * @param {ReturnType<typeof planSimplification>} plan
 * @param {Map<object, import('three').BufferGeometry>} outputs geometría reducida de cada trabajo
 */
export function applySimplification( plan, outputs ) {

	return plan.items.map( ( item ) => {

		const { mesh, before } = item;
		if ( item.restore ) restoreMesh( mesh );
		if ( ! item.job ) return { mesh, before, after: item.after, skipped: item.skipped };

		const geometry = outputs.get( item.job );
		setGeometry( mesh, geometry, item.job.original );
		const after = countTriangles( geometry );
		return { mesh, before, after, reached: after <= plan.targetTriangles * 1.01 };

	} );

}

/**
 * Reduce varias mallas sin congelar la página (en un Web Worker).
 * Nada cambia hasta que terminan todas: si se cancela, el modelo queda igual.
 * @param {import('three').Mesh[]} meshes
 * @param {number} targetTriangles triángulos objetivo POR MALLA
 * @param {{ permissive?: boolean }} options
 * @param {{ onProgress?: ( fraction: number, text: string ) => void, signal?: AbortSignal }} [control]
 */
export async function simplifyMeshesAsync( meshes, targetTriangles, options = {}, { onProgress, signal } = {} ) {

	const plan = planSimplification( meshes, targetTriangles, options );
	const outputs = new Map();
	const total = plan.jobs.length;
	for ( const [ i, job ] of plan.jobs.entries() ) {

		signal?.throwIfAborted();
		const text = total > 1 ? `Reduciendo malla ${ i + 1 } de ${ total }…` : 'Reduciendo polígonos…';
		onProgress?.( i / total, text );
		const geometry = await simplifyJob( job, ( fraction ) => onProgress?.( ( i + fraction ) / total, text ), signal );
		outputs.set( job, geometry );

	}

	signal?.throwIfAborted();
	onProgress?.( 1, 'Terminando…' );
	return applySimplification( plan, outputs );

}

// ---------- Web Worker ----------

let worker = null;
let workerBroken = typeof Worker === 'undefined';
let nextJobId = 1;

function getWorker() {

	if ( ! worker ) worker = new Worker( new URL( './simplify.worker.js', import.meta.url ), { type: 'module' } );
	return worker;

}

/** Detiene el worker (al cancelar). Se crea otro la próxima vez. */
function stopWorker() {

	if ( worker ) worker.terminate();
	worker = null;

}

async function simplifyJob( job, onStage, signal ) {

	if ( ! workerBroken ) {

		try {

			return await simplifyInWorker( job, onStage, signal );

		} catch ( error ) {

			if ( ! error || error.name !== 'WorkerLoadError' ) throw error;
			// El navegador no pudo iniciar el worker: se hace en la página (más lento, pero funciona).
			console.warn( 'No se pudo usar un Web Worker para reducir; se reduce en la página.', error.message );
			workerBroken = true;

		}

	}

	const { simplifierReady, simplifyGeometry } = await import( './simplifyGeometry.js' );
	await simplifierReady;
	signal?.throwIfAborted();
	return simplifyGeometry( job.original, job.targetTriangles, { ...job.options, onStage } ).geometry;

}

function simplifyInWorker( job, onStage, signal ) {

	return new Promise( ( resolve, reject ) => {

		const target = getWorker();
		const id = nextJobId ++;
		let started = false;

		const cleanup = () => {

			target.removeEventListener( 'message', onMessage );
			target.removeEventListener( 'error', onError );
			signal?.removeEventListener( 'abort', onAbort );

		};

		const onMessage = ( event ) => {

			const message = event.data;
			if ( ! message || message.id !== id ) return;
			started = true;
			if ( message.type === 'progress' ) {

				onStage( message.fraction );

			} else if ( message.type === 'result' ) {

				cleanup();
				resolve( unpackGeometry( message.geometry ) );

			} else if ( message.type === 'error' ) {

				cleanup();
				reject( new Error( message.message ) );

			}

		};

		const onError = ( event ) => {

			cleanup();
			stopWorker();
			const error = new Error( event.message || 'El proceso que reduce los polígonos se detuvo.' );
			// Si falló antes de empezar, el worker no pudo cargarse.
			if ( ! started ) error.name = 'WorkerLoadError';
			reject( error );

		};

		const onAbort = () => {

			cleanup();
			stopWorker();
			reject( signal.reason ?? new DOMException( 'Cancelado', 'AbortError' ) );

		};

		target.addEventListener( 'message', onMessage );
		target.addEventListener( 'error', onError );
		signal?.addEventListener( 'abort', onAbort, { once: true } );

		// Se envía una copia: la geometría original sigue intacta en la página.
		const { data, transfer } = packGeometry( job.original );
		target.postMessage( { id, geometry: data, targetTriangles: job.targetTriangles, options: job.options }, transfer );

	} );

}

// ---------- Volver al original, deshacer y liberar memoria ----------

/** Vuelve a poner la geometría original. */
export function restoreMesh( mesh ) {

	const original = originals.get( mesh );
	if ( ! original ) return false;
	const current = mesh.geometry;
	mesh.geometry = original;
	originals.delete( mesh );
	resetBounds( mesh );
	if ( current !== original && ! isShared( current, mesh ) ) current.dispose();
	return true;

}

/**
 * Copia de qué geometría usa cada malla y cuál era su original (para deshacer y rehacer).
 * Las geometrías no se copian: se guardan las mismas (liberar una con dispose() solo borra su copia
 * en la tarjeta de video; si vuelve a usarse, three.js la sube de nuevo).
 */
export function captureGeometryState( meshes ) {

	return meshes.map( ( mesh ) => ( { mesh, geometry: mesh.geometry, original: originals.get( mesh ) } ) );

}

/** Vuelve a poner un estado guardado con captureGeometryState(). */
export function applyGeometryState( state ) {

	for ( const { mesh, geometry, original } of state ) {

		mesh.geometry = geometry;
		if ( original ) originals.set( mesh, original );
		else originals.delete( mesh );
		resetBounds( mesh );

	}

}

/** Libera las geometrías originales guardadas (al cerrar el modelo). */
export function forgetOriginals( meshes ) {

	for ( const mesh of meshes ) {

		const original = originals.get( mesh );
		if ( original && original !== mesh.geometry ) original.dispose();
		originals.delete( mesh );

	}

}

function setGeometry( mesh, geometry, original ) {

	const previous = mesh.geometry;
	if ( ! originals.has( mesh ) ) originals.set( mesh, original );
	mesh.geometry = geometry;
	resetBounds( mesh );
	// La geometría reducida anterior ya no se usa (salvo que sea compartida).
	if ( previous !== original && previous !== geometry && ! isShared( previous, mesh ) ) previous.dispose();

}

function isShared( geometry, except ) {

	let shared = false;
	let root = except;
	while ( root.parent ) root = root.parent;
	root.traverse( ( object ) => {

		if ( object !== except && object.geometry === geometry ) shared = true;

	} );
	return shared;

}

function resetBounds( mesh ) {

	// Las mallas con esqueleto guardan su propia caja; hay que recalcularla.
	if ( mesh.isSkinnedMesh || mesh.isInstancedMesh ) {

		mesh.boundingBox = null;
		mesh.boundingSphere = null;

	}

}
