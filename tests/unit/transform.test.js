import { describe, expect, it } from 'vitest';
import {
	centerAndGround, getUniformScale, resetTransform, rotate90, scaleToHeight, setUniformScale,
} from '../../src/core/transform.js';
import { openSample, sizeOf } from './helpers.js';

describe( 'ajustes del modelo', () => {

	it( 'cambia la escala y no acepta valores inválidos', () => {

		const { model } = openSample( 'piezas' );
		setUniformScale( model, 2 );
		expect( getUniformScale( model ) ).toBe( 2 );
		setUniformScale( model, - 1 );
		setUniformScale( model, Number.NaN );
		expect( getUniformScale( model ) ).toBe( 2 );

	} );

	it( 'escala hasta la altura pedida', () => {

		const { model } = openSample( 'r15' );
		scaleToHeight( model, 1.4 ); // 5 studs
		const [ , height ] = sizeOf( model.getWorldBox() );
		expect( height ).toBeCloseTo( 1.4, 6 );

	} );

	it( 'cuatro giros de 90° dejan la rotación exacta, sin residuos', () => {

		const { model } = openSample( 'piezas' );
		for ( const axis of [ 'x', 'y', 'z' ] ) {

			for ( let i = 0; i < 4; i ++ ) rotate90( model, axis );
			const q = model.container.quaternion;
			// Puede quedar como q o -q (es el mismo giro): |w| = 1 exacto.
			expect( Math.abs( q.w ) ).toBe( 1 );
			expect( q.x ).toBe( 0 );
			expect( q.y ).toBe( 0 );
			expect( q.z ).toBe( 0 );

		}

	} );

	it( 'un giro de 90° en X cambia el alto por el profundo', () => {

		const { model } = openSample( 'piezas' );
		const [ , height, depth ] = sizeOf( model.getWorldBox() );
		rotate90( model, 'x' );
		const after = sizeOf( model.getWorldBox() );
		expect( after[ 1 ] ).toBeCloseTo( depth, 6 );
		expect( after[ 2 ] ).toBeCloseTo( height, 6 );

	} );

	it( 'centra y apoya en el suelo (base en Y = 0)', () => {

		const { model } = openSample( 'pesado', { texture: false } );
		rotate90( model, 'z' );
		centerAndGround( model );
		const box = model.getWorldBox();
		expect( box.min.y ).toBeCloseTo( 0, 6 );
		expect( ( box.min.x + box.max.x ) / 2 ).toBeCloseTo( 0, 6 );
		expect( ( box.min.z + box.max.z ) / 2 ).toBeCloseTo( 0, 6 );

	} );

	it( 'quitar ajustes vuelve al modelo original', () => {

		const { model } = openSample( 'piezas' );
		const original = sizeOf( model.getWorldBox() );
		setUniformScale( model, 3 );
		rotate90( model, 'y' );
		centerAndGround( model );
		resetTransform( model );
		expect( model.container.position.toArray() ).toEqual( [ 0, 0, 0 ] );
		expect( getUniformScale( model ) ).toBe( 1 );
		const size = sizeOf( model.getWorldBox() );
		for ( let i = 0; i < 3; i ++ ) expect( size[ i ] ).toBeCloseTo( original[ i ], 6 );

	} );

} );
