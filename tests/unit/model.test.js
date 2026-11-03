import { describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { LoadedModel } from '../../src/core/model.js';
import { openSample, sizeOf } from './helpers.js';

describe( 'LoadedModel', () => {

	it( 'envuelve el modelo en un contenedor con un nombre que no choca con sus nodos', () => {

		const scene = new Group();
		const inner = new Mesh( new BufferGeometry(), new MeshBasicMaterial() );
		inner.name = 'robot';
		scene.add( inner );
		const model = new LoadedModel( { scene, animations: [] }, 'robot.glb' );
		expect( model.baseName ).toBe( 'robot' );
		expect( model.container.name ).toBe( 'robot_1' );
		expect( model.container.children ).toContain( inner );

	} );

	it( 'vuelve a la pose de reposo aunque una animación haya movido los huesos', () => {

		const { model } = openSample( 'r15' );
		const arm = model.container.getObjectByName( 'RightUpperArm' );
		const before = arm.quaternion.clone();
		arm.rotation.z = 1.2;
		model.restoreRestPose();
		expect( arm.quaternion.equals( before ) ).toBe( true );

	} );

	it( 'la caja local no cambia con los ajustes del contenedor', () => {

		const { model } = openSample( 'piezas' );
		const local = sizeOf( model.localBox );
		model.container.scale.setScalar( 3 );
		model.container.updateMatrixWorld( true );
		model.updateLocalBox();
		expect( sizeOf( model.localBox ) ).toEqual( local );
		expect( sizeOf( model.getWorldBox() )[ 1 ] ).toBeCloseTo( local[ 1 ] * 3, 6 );

	} );

	it( 'pasa los vértices cuantizados (enteros) a números normales', () => {

		const geometry = new BufferGeometry();
		// Posiciones como Int16 normalizado (así las guarda gltfpack).
		geometry.setAttribute( 'position', new BufferAttribute( new Int16Array( [ 0, 0, 0, 32767, 0, 0, 0, 32767, 0 ] ), 3, true ) );
		const scene = new Group();
		scene.add( new Mesh( geometry, new MeshBasicMaterial() ) );
		const model = new LoadedModel( { scene, animations: [] }, 'cuantizado.glb' );
		const position = model.meshes[ 0 ].geometry.attributes.position;
		expect( position.array ).toBeInstanceOf( Float32Array );
		expect( position.normalized ).toBe( false );
		expect( position.getX( 1 ) ).toBeCloseTo( 1, 4 );

	} );

	it( 'conserva los índices de huesos como enteros', () => {

		const { model } = openSample( 'r15' );
		const skinIndex = model.meshes[ 0 ].geometry.attributes.skinIndex;
		expect( skinIndex.array ).toBeInstanceOf( Uint16Array );

	} );

} );
