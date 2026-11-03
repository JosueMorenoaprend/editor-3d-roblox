// Empaquetar geometrías para enviarlas a un Web Worker (y de vuelta).
//
// Un Web Worker no puede recibir objetos de three.js, pero sí listas de números
// (typed arrays). Además, esas listas se pueden "transferir" sin copiarlas.
import { BufferAttribute, BufferGeometry } from 'three';

/** Copia un atributo a una lista propia (también si era intercalado o una vista de otro buffer). */
function packAttribute( attribute, copy ) {

	let array;
	if ( attribute.isInterleavedBufferAttribute ) {

		const { itemSize, count, offset } = attribute;
		const data = attribute.data;
		array = new data.array.constructor( count * itemSize );
		for ( let i = 0; i < count; i ++ ) {

			for ( let c = 0; c < itemSize; c ++ ) array[ i * itemSize + c ] = data.array[ i * data.stride + offset + c ];

		}

	} else {

		array = copy ? attribute.array.slice() : attribute.array;

	}

	return { array, itemSize: attribute.itemSize, normalized: attribute.normalized === true, name: attribute.name || '' };

}

function unpackAttribute( packed ) {

	const attribute = new BufferAttribute( packed.array, packed.itemSize, packed.normalized );
	attribute.name = packed.name;
	return attribute;

}

/** Datos de usuario que se pueden enviar (sin funciones ni objetos raros). */
function plainUserData( userData ) {

	try {

		return JSON.parse( JSON.stringify( userData || {} ) );

	} catch {

		return {};

	}

}

/**
 * Convierte una geometría en datos simples.
 * @param {BufferGeometry} geometry
 * @param {{ copy?: boolean }} [options] copy: false reutiliza las listas (solo si ya no se usan)
 * @returns {{ data: object, transfer: ArrayBuffer[] }} transfer: lo que se puede transferir sin copiar
 */
export function packGeometry( geometry, { copy = true } = {} ) {

	const buffers = new Set();
	const track = ( packed ) => {

		buffers.add( packed.array.buffer );
		return packed;

	};

	const attributes = {};
	for ( const [ name, attribute ] of Object.entries( geometry.attributes ) ) attributes[ name ] = track( packAttribute( attribute, copy ) );

	const morphAttributes = {};
	for ( const [ name, list ] of Object.entries( geometry.morphAttributes ) ) {

		morphAttributes[ name ] = list.map( ( attribute ) => track( packAttribute( attribute, copy ) ) );

	}

	const data = {
		name: geometry.name,
		userData: plainUserData( geometry.userData ),
		attributes,
		morphAttributes,
		morphTargetsRelative: geometry.morphTargetsRelative,
		index: geometry.index ? track( packAttribute( geometry.index, copy ) ) : null,
		groups: geometry.groups.map( ( group ) => ( { ...group } ) ),
	};

	return { data, transfer: [ ...buffers ] };

}

/** Vuelve a armar una geometría de three.js a partir de packGeometry(). */
export function unpackGeometry( data ) {

	const geometry = new BufferGeometry();
	geometry.name = data.name;
	geometry.userData = data.userData;
	for ( const [ name, packed ] of Object.entries( data.attributes ) ) geometry.setAttribute( name, unpackAttribute( packed ) );
	for ( const [ name, list ] of Object.entries( data.morphAttributes ) ) geometry.morphAttributes[ name ] = list.map( unpackAttribute );
	geometry.morphTargetsRelative = data.morphTargetsRelative;
	if ( data.index ) geometry.setIndex( unpackAttribute( data.index ) );
	for ( const group of data.groups ) geometry.addGroup( group.start, group.count, group.materialIndex );
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();
	return geometry;

}
