import { beforeAll, describe, expect, it } from 'vitest';
import { BufferGeometry, BufferAttribute, Mesh, MeshBasicMaterial, SkinnedMesh } from 'three';
import { countTriangles } from '../../src/core/info.js';
import {
	checkSimplifiable, getOriginalGeometry, isSimplified, restoreMesh, simplifierReady, simplifyGeometry, simplifyMeshes,
} from '../../src/core/simplify.js';
import { openSample } from './helpers.js';

beforeAll( () => simplifierReady );

describe( 'reducir polígonos', () => {

	it( 'baja la malla pesada de 120.000 a unos 20.000 triángulos sin tocar el original', () => {

		const { model } = openSample( 'pesado' );
		const source = model.meshes[ 0 ].geometry;
		const { geometry } = simplifyGeometry( source, 20000 );
		const triangles = countTriangles( geometry );
		expect( triangles ).toBeLessThanOrEqual( 20000 );
		expect( triangles ).toBeGreaterThan( 15000 );
		expect( countTriangles( source ) ).toBe( 120000 );
		// Conserva las coordenadas de textura y las normales.
		expect( geometry.attributes.uv ).toBeDefined();
		expect( geometry.attributes.normal ).toBeDefined();
		expect( geometry.attributes.uv.count ).toBe( geometry.attributes.position.count );

	} );

	it( 'solo reutiliza vértices que ya existían (las UV no se inventan)', () => {

		const { model } = openSample( 'pesado' );
		const source = model.meshes[ 0 ].geometry;
		const { geometry } = simplifyGeometry( source, 5000 );
		const key = ( attribute, i ) => `${ attribute.getX( i ) },${ attribute.getY( i ) }`;
		const originalUVs = new Set();
		for ( let i = 0; i < source.attributes.uv.count; i ++ ) originalUVs.add( key( source.attributes.uv, i ) );
		for ( let i = 0; i < geometry.attributes.uv.count; i ++ ) {

			expect( originalUVs.has( key( geometry.attributes.uv, i ) ) ).toBe( true );

		}

	} );

	it( 'simplifyMeshes reduce, marca la malla y se puede volver al original', () => {

		const { model } = openSample( 'pesado' );
		const mesh = model.meshes[ 0 ];
		const original = mesh.geometry;
		const [ result ] = simplifyMeshes( [ mesh ], 20000 );
		expect( result.before ).toBe( 120000 );
		expect( result.after ).toBeLessThanOrEqual( 20000 );
		expect( result.reached ).toBe( true );
		expect( isSimplified( mesh ) ).toBe( true );
		expect( getOriginalGeometry( mesh ) ).toBe( original );

		expect( restoreMesh( mesh ) ).toBe( true );
		expect( mesh.geometry ).toBe( original );
		expect( isSimplified( mesh ) ).toBe( false );

	} );

	it( 'las mallas que comparten geometría se reducen una sola vez', () => {

		const { model } = openSample( 'piezas' );
		const wheels = model.meshes.filter( ( m ) => m.name.startsWith( 'Rueda' ) );
		const results = simplifyMeshes( wheels, 60, { permissive: true } );
		expect( results.every( ( r ) => ! r.skipped ) ).toBe( true );
		expect( new Set( wheels.map( ( w ) => w.geometry ) ).size ).toBe( 1 );
		expect( countTriangles( wheels[ 0 ].geometry ) ).toBeLessThan( results[ 0 ].before );

	} );

	it( 'en mallas con esqueleto conserva índices y pesos de huesos válidos', () => {

		const { model } = openSample( 'r15' );
		const body = model.meshes[ 0 ];
		simplifyMeshes( [ body ], 100, { permissive: true } );
		const { skinIndex, skinWeight } = body.geometry.attributes;
		expect( skinIndex ).toBeDefined();
		for ( let i = 0; i < skinIndex.count; i ++ ) {

			expect( skinIndex.getX( i ) ).toBeLessThan( 16 );
			expect( skinWeight.getX( i ) + skinWeight.getY( i ) + skinWeight.getZ( i ) + skinWeight.getW( i ) ).toBeCloseTo( 1, 5 );

		}

	} );

	it( 'no reduce lo que no debe y explica por qué', () => {

		// Muy pequeña.
		const tiny = new Mesh( new BufferGeometry(), new MeshBasicMaterial() );
		tiny.geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( 9 ), 3 ) );
		expect( checkSimplifiable( tiny ) ).toMatchObject( { ok: false } );
		expect( checkSimplifiable( tiny ).reason ).toMatch( /muy pequeña/ );

		// Con esqueleto pero sin pesos.
		const { model } = openSample( 'r15' );
		const body = model.meshes[ 0 ];
		const broken = new SkinnedMesh( body.geometry.clone(), body.material );
		broken.geometry.deleteAttribute( 'skinWeight' );
		expect( checkSimplifiable( broken ).ok ).toBe( false );
		expect( checkSimplifiable( broken ).reason ).toMatch( /pesos/ );

		// Ya está bajo el objetivo: no cambia nada.
		const [ result ] = simplifyMeshes( [ body ], 20000 );
		expect( result.skipped ).toMatch( /menos triángulos/ );

	} );

} );
