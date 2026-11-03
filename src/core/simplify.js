// Reducción de polígonos con el simplificador de meshoptimizer.
//
// Cómo funciona: meshoptimizer elige qué triángulos quitar y devuelve una lista
// nueva de triángulos que usa SOLO vértices que ya existían. Los vértices que quedan
// no se modifican, así que sus UV (textura), normales, colores y pesos de huesos
// (skinIndex / skinWeight) se conservan exactamente.
import { BufferAttribute, BufferGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import { countTriangles } from './info.js';

export const simplifierReady = MeshoptSimplifier.ready;

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
 * Reduce varias mallas a un número de triángulos por malla.
 * @param {THREE.Mesh[]} meshes
 * @param {number} targetTriangles triángulos objetivo POR MALLA
 * @param {{ permissive?: boolean }} options permissive: permite cruzar costuras de UV
 */
export function simplifyMeshes( meshes, targetTriangles, options = {} ) {

	const results = [];
	// Si varias mallas comparten la misma geometría, se reduce una sola vez.
	const cache = new Map();

	for ( const mesh of meshes ) {

		const check = checkSimplifiable( mesh );
		const original = getOriginalGeometry( mesh );
		const before = countTriangles( original );

		if ( ! check.ok ) {

			results.push( { mesh, before, after: countTriangles( mesh.geometry ), skipped: check.reason } );
			continue;

		}

		if ( before <= targetTriangles ) {

			restoreMesh( mesh );
			results.push( { mesh, before, after: before, skipped: 'Ya tiene menos triángulos que el objetivo.' } );
			continue;

		}

		let simplified = cache.get( original );
		if ( ! simplified ) {

			simplified = simplifyGeometry( original, targetTriangles, {
				...options,
				skinned: mesh.isSkinnedMesh === true,
			} );
			cache.set( original, simplified );

		}

		setGeometry( mesh, simplified.geometry, original );
		results.push( {
			mesh,
			before,
			after: countTriangles( simplified.geometry ),
			reached: countTriangles( simplified.geometry ) <= targetTriangles * 1.01,
		} );

	}

	return results;

}

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

/**
 * Reduce una geometría. Devuelve una geometría nueva (no toca la original).
 */
export function simplifyGeometry( source, targetTriangles, { permissive = false, skinned = false } = {} ) {

	// 1. Copia con atributos "planos" (sin intercalar) y vértices repetidos soldados.
	//    El simplificador necesita que los vértices idénticos sean uno solo.
	const geometry = mergeVertices( toPlainGeometry( source ), 1e-6 );
	const index = geometry.index.array;
	const vertexCount = geometry.attributes.position.count;

	// 2. Posiciones como Float32Array (por si venían cuantizadas, ej. Int16).
	const positions = readFloats( geometry.attributes.position, 3 );

	// 3. Atributos que ayudan a decidir qué quitar (como en gltfpack):
	//    normales (peso 0,5) y colores (peso 1). En modo permisivo también las UV.
	const extra = [];
	if ( geometry.attributes.normal ) extra.push( { attribute: geometry.attributes.normal, size: 3, weight: 0.5 } );
	if ( geometry.attributes.color ) extra.push( { attribute: geometry.attributes.color, size: 3, weight: 1 } );
	if ( permissive && geometry.attributes.uv ) extra.push( { attribute: geometry.attributes.uv, size: 2, weight: 1 } );

	const stride = extra.reduce( ( sum, e ) => sum + e.size, 0 );
	const weights = [];
	const attributeData = new Float32Array( vertexCount * stride );
	let offset = 0;
	for ( const { attribute, size, weight } of extra ) {

		const values = readFloats( attribute, size );
		for ( let v = 0; v < vertexCount; v ++ ) {

			for ( let c = 0; c < size; c ++ ) attributeData[ v * stride + offset + c ] = values[ v * size + c ];

		}

		for ( let c = 0; c < size; c ++ ) weights.push( weight );
		offset += size;

	}

	// No usamos 'Prune': con objetivos muy bajos borra piezas enteras (ojos, botones...).
	// Preferimos no llegar al objetivo y avisar, antes que perder partes del modelo.
	const flags = [];
	if ( skinned ) flags.push( 'RegularizeLight' ); // triángulos más parejos: se deforman mejor al animar
	if ( permissive ) flags.push( 'Permissive' ); // permite cruzar costuras de la textura

	// 4. Simplificar cada grupo (material) por separado, repartiendo el objetivo.
	const totalTriangles = index.length / 3;
	const groups = geometry.groups.length > 0
		? geometry.groups
		: [ { start: 0, count: index.length, materialIndex: undefined } ];
	const multiGroup = groups.length > 1;
	const scale = MeshoptSimplifier.getScale( positions, 3 );

	const parts = [];
	let maxError = 0;
	for ( const group of groups ) {

		const groupIndex = index.subarray( group.start, group.start + group.count );
		const groupIndices = new Uint32Array( groupIndex );
		const share = groupIndices.length / 3 / totalTriangles;
		const target = Math.max( 1, Math.floor( targetTriangles * share ) ) * 3;

		const groupFlags = multiGroup ? [ ...flags, 'Sparse', 'ErrorAbsolute' ] : flags;
		// Error máximo = 100 % del tamaño del modelo: dejamos que llegue al objetivo.
		const targetError = multiGroup ? scale : 1;

		const [ result, error ] = stride > 0
			? MeshoptSimplifier.simplifyWithAttributes(
				groupIndices, positions, 3, attributeData, stride, weights, null, target, targetError, groupFlags )
			: MeshoptSimplifier.simplify( groupIndices, positions, 3, target, targetError, groupFlags );

		maxError = Math.max( maxError, multiGroup ? error / scale : error );
		parts.push( { indices: result, materialIndex: group.materialIndex } );

	}

	// 5. Unir los grupos y quitar los vértices que quedaron sin usar.
	const newIndexCount = parts.reduce( ( sum, p ) => sum + p.indices.length, 0 );
	const newIndex = new Uint32Array( newIndexCount );
	const newGroups = [];
	let cursor = 0;
	for ( const part of parts ) {

		newIndex.set( part.indices, cursor );
		newGroups.push( { start: cursor, count: part.indices.length, materialIndex: part.materialIndex } );
		cursor += part.indices.length;

	}

	const output = compact( geometry, newIndex );
	if ( multiGroup || source.groups.length > 0 ) {

		for ( const g of newGroups ) output.addGroup( g.start, g.count, g.materialIndex ?? 0 );

	}

	output.name = source.name;
	output.userData = { ...source.userData };
	output.computeBoundingBox();
	output.computeBoundingSphere();
	geometry.dispose();

	return { geometry: output, error: maxError };

}

/** Crea una geometría nueva solo con los vértices usados por `indices`. */
function compact( geometry, indices ) {

	const [ remap, unique ] = MeshoptSimplifier.compactMesh( indices ); // también renumera `indices`
	const output = new BufferGeometry();

	for ( const [ name, attribute ] of Object.entries( geometry.attributes ) ) {

		output.setAttribute( name, remapAttribute( attribute, remap, unique ) );

	}

	for ( const [ name, list ] of Object.entries( geometry.morphAttributes ) ) {

		output.morphAttributes[ name ] = list.map( ( attribute ) => {

			const remapped = remapAttribute( attribute, remap, unique );
			remapped.name = attribute.name;
			return remapped;

		} );

	}

	output.morphTargetsRelative = geometry.morphTargetsRelative;
	const indexArray = unique <= 65535 ? new Uint16Array( indices ) : indices;
	output.setIndex( new BufferAttribute( indexArray, 1 ) );
	return output;

}

function remapAttribute( attribute, remap, unique ) {

	const size = attribute.itemSize;
	const source = attribute.array;
	const target = new source.constructor( unique * size );
	for ( let i = 0; i < remap.length; i ++ ) {

		const to = remap[ i ];
		if ( to === 0xffffffff ) continue;
		for ( let c = 0; c < size; c ++ ) target[ to * size + c ] = source[ i * size + c ];

	}

	return new BufferAttribute( target, size, attribute.normalized );

}

/** Copia una geometría pasando atributos intercalados a atributos normales. */
function toPlainGeometry( source ) {

	const geometry = new BufferGeometry();
	for ( const [ name, attribute ] of Object.entries( source.attributes ) ) {

		geometry.setAttribute( name, toPlainAttribute( attribute ) );

	}

	for ( const [ name, list ] of Object.entries( source.morphAttributes ) ) {

		geometry.morphAttributes[ name ] = list.map( toPlainAttribute );

	}

	geometry.morphTargetsRelative = source.morphTargetsRelative;
	if ( source.index ) {

		geometry.setIndex( new BufferAttribute( new Uint32Array( source.index.array ), 1 ) );

	} else {

		const count = source.attributes.position.count;
		const indices = new Uint32Array( count );
		for ( let i = 0; i < count; i ++ ) indices[ i ] = i;
		geometry.setIndex( new BufferAttribute( indices, 1 ) );

	}

	for ( const group of source.groups ) geometry.addGroup( group.start, group.count, group.materialIndex );
	return geometry;

}

function toPlainAttribute( attribute ) {

	if ( ! attribute.isInterleavedBufferAttribute ) {

		const copy = new BufferAttribute( attribute.array.slice(), attribute.itemSize, attribute.normalized );
		copy.name = attribute.name;
		return copy;

	}

	const { itemSize, count, offset } = attribute;
	const data = attribute.data;
	const array = new data.array.constructor( count * itemSize );
	for ( let i = 0; i < count; i ++ ) {

		for ( let c = 0; c < itemSize; c ++ ) array[ i * itemSize + c ] = data.array[ i * data.stride + offset + c ];

	}

	const copy = new BufferAttribute( array, itemSize, attribute.normalized );
	copy.name = attribute.name;
	return copy;

}

/** Lee un atributo como Float32Array (convierte valores cuantizados/normalizados). */
function readFloats( attribute, size ) {

	const out = new Float32Array( attribute.count * size );
	for ( let i = 0; i < attribute.count; i ++ ) {

		for ( let c = 0; c < size; c ++ ) {

			out[ i * size + c ] = c < attribute.itemSize ? attribute.getComponent( i, c ) : 0;

		}

	}

	return out;

}
