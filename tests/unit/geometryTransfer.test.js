import { describe, expect, it } from 'vitest';
import { BoxGeometry, BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute } from 'three';
import { packGeometry, unpackGeometry } from '../../src/core/geometryTransfer.js';

describe( 'empaquetar geometrías para el Web Worker', () => {

	it( 'ida y vuelta: mismos atributos, índice, grupos y nombre', () => {

		const box = new BoxGeometry( 1, 2, 3 );
		box.name = 'Caja';
		box.userData = { origen: 'prueba' };
		const { data, transfer } = packGeometry( box );
		const copy = unpackGeometry( data );

		expect( copy.name ).toBe( 'Caja' );
		expect( copy.userData ).toEqual( { origen: 'prueba' } );
		expect( Object.keys( copy.attributes ).sort() ).toEqual( Object.keys( box.attributes ).sort() );
		expect( [ ...copy.attributes.position.array ] ).toEqual( [ ...box.attributes.position.array ] );
		expect( [ ...copy.index.array ] ).toEqual( [ ...box.index.array ] );
		expect( copy.groups ).toEqual( box.groups );
		expect( copy.boundingBox ).not.toBeNull();
		// Cada lista tiene su propio buffer (se pueden transferir sin problemas).
		expect( new Set( transfer ).size ).toBe( transfer.length );

	} );

	it( 'por defecto copia: transferir la copia no rompe la geometría original', () => {

		const box = new BoxGeometry();
		const { data, transfer } = packGeometry( box );
		expect( data.attributes.position.array ).not.toBe( box.attributes.position.array );
		structuredClone( data, { transfer } ); // "transfiere" la copia, como postMessage
		expect( box.attributes.position.array.length ).toBe( 72 );

	} );

	it( 'convierte atributos intercalados en listas simples', () => {

		const interleaved = new InterleavedBuffer( new Float32Array( [ 0, 0, 0, 9, 1, 0, 0, 9, 0, 1, 0, 9 ] ), 4 );
		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new InterleavedBufferAttribute( interleaved, 3, 0 ) );
		const copy = unpackGeometry( packGeometry( geometry ).data );
		expect( [ ...copy.attributes.position.array ] ).toEqual( [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ] );

	} );

} );
