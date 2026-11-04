import { describe, expect, it } from 'vitest';
import { BoxGeometry, BufferAttribute, BufferGeometry } from 'three';
import { computeModelInfo, countTriangles } from '../../src/core/info.js';
import { openSample } from './helpers.js';

describe( 'countTriangles', () => {

	it( 'cuenta triángulos con y sin índice', () => {

		expect( countTriangles( new BoxGeometry() ) ).toBe( 12 );

		const plain = new BufferGeometry();
		plain.setAttribute( 'position', new BufferAttribute( new Float32Array( 9 * 3 ), 3 ) );
		expect( countTriangles( plain ) ).toBe( 3 );

		expect( countTriangles( null ) ).toBe( 0 );

	} );

} );

describe( 'computeModelInfo', () => {

	it( 'muñeco R15: huesos, animaciones y altura', () => {

		const { model } = openSample( 'r15' );
		const info = computeModelInfo( model, 20000 );
		expect( info.boneCount ).toBe( 16 );
		expect( info.animations.map( ( a ) => a.name ) ).toEqual( [ 'Saludar', 'Caminar', 'Saltar' ] );
		expect( info.meshes ).toHaveLength( 1 );
		expect( info.meshes[ 0 ].skinned ).toBe( true );
		expect( info.meshesOverLimit ).toBe( 0 );
		expect( info.size.y / 0.28 ).toBeCloseTo( 5.2, 1 );

	} );

	it( 'malla pesada: pasa el límite de 20.000 y tiene una textura de 256 px', () => {

		const { model } = openSample( 'pesado' );
		const info = computeModelInfo( model, 20000 );
		expect( info.totalTriangles ).toBe( 120000 );
		expect( info.meshesOverLimit ).toBe( 1 );
		expect( info.meshes[ 0 ].overLimit ).toBe( true );
		expect( info.textureCount ).toBe( 1 );
		expect( info.largestTexture ).toBe( 256 );

		// Con un límite mayor, ya no pasa.
		expect( computeModelInfo( model, 200000 ).meshesOverLimit ).toBe( 0 );

	} );

	it( 'carrito: cuenta cada pieza (las ruedas comparten geometría pero son 4 mallas)', () => {

		const { model } = openSample( 'piezas' );
		const info = computeModelInfo( model, 20000 );
		expect( info.meshes ).toHaveLength( 8 );
		expect( info.boneCount ).toBe( 0 );
		expect( info.totalTriangles ).toBe( info.meshes.reduce( ( sum, m ) => sum + m.triangles, 0 ) );
		expect( info.meshes.filter( ( m ) => m.name.startsWith( 'Rueda' ) ) ).toHaveLength( 4 );

	} );

} );
