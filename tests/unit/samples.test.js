import { describe, expect, it } from 'vitest';
import { PropertyBinding } from 'three';
import { countTriangles } from '../../src/core/info.js';
import { SAMPLES, createSample } from '../../src/samples/index.js';
import { R15_BONE_NAMES } from '../../src/samples/r15Dummy.js';

function collect( root, test ) {

	const list = [];
	root.traverse( ( object ) => {

		if ( test( object ) ) list.push( object );

	} );
	return list;

}

describe( 'ejemplos generados por código', () => {

	it( 'el muñeco R15 tiene los 16 huesos de Roblox y una malla con esqueleto', () => {

		const { gltf } = createSample( 'r15' );
		const bones = collect( gltf.scene, ( o ) => o.isBone ).map( ( b ) => b.name );
		expect( bones ).toHaveLength( 16 );
		expect( [ ...bones ].sort() ).toEqual( [ ...R15_BONE_NAMES ].sort() );
		for ( const part of [ 'Head', 'UpperTorso', 'LowerTorso', 'LeftUpperArm', 'RightFoot' ] ) expect( bones ).toContain( part );

		const [ body ] = collect( gltf.scene, ( o ) => o.isSkinnedMesh );
		expect( body.skeleton.bones ).toHaveLength( 16 );

		// Cada vértice sigue a un hueso que existe, con peso total 1.
		const { skinIndex, skinWeight } = body.geometry.attributes;
		for ( let i = 0; i < skinIndex.count; i ++ ) {

			expect( skinIndex.getX( i ) ).toBeLessThan( 16 );
			const total = skinWeight.getX( i ) + skinWeight.getY( i ) + skinWeight.getZ( i ) + skinWeight.getW( i );
			expect( total ).toBeCloseTo( 1, 5 );

		}

	} );

	it( 'el muñeco mide unos 5,2 studs y sus animaciones solo mueven huesos que existen', () => {

		const { gltf } = createSample( 'r15' );
		expect( gltf.animations.map( ( clip ) => clip.name ) ).toEqual( [ 'Saludar', 'Caminar', 'Saltar' ] );
		for ( const clip of gltf.animations ) {

			expect( clip.validate() ).toBe( true );
			for ( const track of clip.tracks ) {

				const { nodeName } = PropertyBinding.parseTrackName( track.name );
				expect( R15_BONE_NAMES ).toContain( nodeName );

			}

		}

		const [ body ] = collect( gltf.scene, ( o ) => o.isSkinnedMesh );
		body.geometry.computeBoundingBox();
		const height = body.geometry.boundingBox.max.y - body.geometry.boundingBox.min.y;
		expect( height / 0.28 ).toBeCloseTo( 5.2, 1 );

	} );

	it( 'la malla pesada tiene 120.000 triángulos, UV y una textura', () => {

		const { gltf } = createSample( 'pesado' );
		const [ mesh ] = collect( gltf.scene, ( o ) => o.isMesh );
		expect( countTriangles( mesh.geometry ) ).toBe( 120000 );
		expect( mesh.geometry.attributes.uv ).toBeDefined();
		expect( mesh.material.map.image.width ).toBe( 256 );

		const { gltf: plain } = createSample( 'pesado', { texture: false } );
		const [ plainMesh ] = collect( plain.scene, ( o ) => o.isMesh );
		expect( plainMesh.material.map ).toBeNull();

	} );

	it( 'el carrito tiene 8 piezas, ruedas que comparten geometría y una malla con varios materiales', () => {

		const { gltf } = createSample( 'piezas' );
		const meshes = collect( gltf.scene, ( o ) => o.isMesh );
		expect( meshes ).toHaveLength( 8 );

		const wheels = meshes.filter( ( m ) => m.name.startsWith( 'Rueda' ) );
		expect( wheels ).toHaveLength( 4 );
		expect( new Set( wheels.map( ( w ) => w.geometry ) ).size ).toBe( 1 );

		const cabin = meshes.find( ( m ) => m.name === 'Cabina' );
		expect( Array.isArray( cabin.material ) ).toBe( true );
		expect( cabin.geometry.groups.length ).toBe( 6 );

	} );

	it( 'cada llamada crea un modelo nuevo y un id desconocido da un error claro', () => {

		for ( const sample of SAMPLES ) {

			const a = createSample( sample.id ).gltf.scene;
			const b = createSample( sample.id ).gltf.scene;
			expect( a ).not.toBe( b );

		}

		expect( () => createSample( 'no-existe' ) ).toThrow( /No existe el ejemplo/ );

	} );

} );
