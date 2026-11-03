// Algoritmo de reducción de polígonos (simplificador de meshoptimizer).
//
// Cómo funciona: meshoptimizer elige qué triángulos quitar y devuelve una lista
// nueva de triángulos que usa SOLO vértices que ya existían. Los vértices que quedan
// no se modifican, así que sus UV (textura), normales, colores y pesos de huesos
// (skinIndex / skinWeight) se conservan exactamente.
//
// Este archivo no guarda estado: lo usan el Web Worker (simplify.worker.js), las
// pruebas en Node y, si el navegador no tiene workers, la página directamente.
import { BufferAttribute, BufferGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

export const simplifierReady = MeshoptSimplifier.ready;

/**
 * Reduce una geometría. Devuelve una geometría nueva (no toca la original).
 * @param {BufferGeometry} source
 * @param {number} targetTriangles
 * @param {{ permissive?: boolean, skinned?: boolean, onStage?: ( fraction: number ) => void }} options
 *   onStage: avisa el avance (de 0 a 1) para la barra de progreso
 */
export function simplifyGeometry( source, targetTriangles, { permissive = false, skinned = false, onStage = null } = {} ) {

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

	if ( onStage ) onStage( 0.15 );

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
	for ( const [ g, group ] of groups.entries() ) {

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
		if ( onStage ) onStage( 0.15 + 0.75 * ( g + 1 ) / groups.length );

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
	if ( onStage ) onStage( 1 );

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

/** Copia un atributo (intercalado o no) a un atributo normal. */
export function toPlainAttribute( attribute ) {

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
