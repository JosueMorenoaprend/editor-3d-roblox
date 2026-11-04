import { describe, expect, it } from 'vitest';
import { detectBoneMap } from '../../src/core/boneDetect.js';
import { PROJECT_FORMAT, exportGLB, exportProject } from '../../src/core/exporter.js';
import { parseGLB } from '../../src/core/loader.js';
import { LoadedModel } from '../../src/core/model.js';
import { getTransformState, resetTransform, rotate90, scaleToHeight } from '../../src/core/transform.js';
import { describeIssues, readGLBJson, validateGLB } from '../helpers/gltf.js';
import { openSample, sizeOf } from './helpers.js';

/** Guarda el proyecto y lo vuelve a abrir, como haría el usuario otro día. */
async function roundTrip( model, fileName ) {

	const { arrayBuffer } = await exportProject( model, { appVersion: '1.0.0' } );
	const reopened = new LoadedModel( await parseGLB( arrayBuffer ), fileName );
	return { reopened, arrayBuffer };

}

describe( 'proyectos', () => {

	it( 'conserva los ajustes como ajustes (se pueden quitar después)', async () => {

		const { model } = openSample( 'piezas' );
		const original = sizeOf( model.getWorldBox() );
		rotate90( model, 'y' );
		scaleToHeight( model, 2.8 );
		const saved = getTransformState( model );

		const { reopened } = await roundTrip( model, 'carrito_piezas.proyecto.glb' );
		expect( reopened.project ).toMatchObject( { kind: 'proyecto', format: PROJECT_FORMAT, baseName: 'carrito_piezas' } );
		expect( reopened.baseName ).toBe( 'carrito_piezas' );
		const state = getTransformState( reopened );
		for ( const key of [ 'position', 'quaternion', 'scale' ] ) {

			state[ key ].forEach( ( value, i ) => expect( value ).toBeCloseTo( saved[ key ][ i ], 6 ) );

		}

		expect( sizeOf( reopened.getWorldBox() )[ 1 ] ).toBeCloseTo( 2.8, 5 );

		// "Quitar ajustes" vuelve al tamaño original: los ajustes no quedaron pegados al modelo.
		resetTransform( reopened );
		const size = sizeOf( reopened.getWorldBox() );
		for ( let i = 0; i < 3; i ++ ) expect( size[ i ] ).toBeCloseTo( original[ i ], 5 );

		// El contenedor nuevo no arrastra la marca del proyecto (no se cuela en el GLB para Roblox).
		expect( reopened.container.userData.editor3dRoblox ).toBeUndefined();

	} );

	it( 'conserva huesos y animaciones, y el archivo es un GLB válido', async () => {

		const { model } = openSample( 'r15' );
		rotate90( model, 'x' );
		const { reopened, arrayBuffer } = await roundTrip( model, 'muneco_r15.proyecto.glb' );
		expect( reopened.clips.map( ( clip ) => clip.name ) ).toEqual( [ 'Saludar', 'Caminar', 'Saltar' ] );
		const bones = [];
		reopened.container.traverse( ( object ) => object.isBone && bones.push( object ) );
		expect( bones ).toHaveLength( 16 );

		const { errors, warnings } = await validateGLB( arrayBuffer, 'proyecto.glb' );
		expect( errors, describeIssues( errors ) ).toHaveLength( 0 );
		expect( warnings, describeIssues( warnings ) ).toHaveLength( 0 );
		const json = readGLBJson( arrayBuffer );
		expect( json.scenes[ 0 ].extras.editor3dRoblox.kind ).toBe( 'proyecto' );

	} );

	it( 'un GLB normal (para Roblox) no se confunde con un proyecto', async () => {

		const { model } = openSample( 'piezas' );
		rotate90( model, 'z' );
		const { arrayBuffer } = await exportGLB( model );
		const opened = new LoadedModel( await parseGLB( arrayBuffer ), 'carrito_roblox.glb' );
		expect( opened.project ).toBeNull();
		// Los ajustes quedan dentro del modelo: el contenedor nuevo empieza sin ajustes.
		expect( getTransformState( opened ).position ).toEqual( [ 0, 0, 0 ] );
		expect( opened.baseName ).toBe( 'carrito_roblox' );

	} );

	it( 'guarda el mapa de huesos con las correcciones hechas a mano', async () => {

		const { model } = openSample( 'r15' );
		const detected = detectBoneMap( model.container ).boneMap;
		expect( model.boneMap ).toEqual( detected );

		// El usuario elige otro hueso como cadera y deja la mano izquierda sin elegir.
		const { leftHand, ...rest } = detected;
		expect( leftHand ).toBe( 'LeftHand' );
		model.boneMap = { ...rest, hips: 'HumanoidRootPart' };
		const { reopened, arrayBuffer } = await roundTrip( model, 'muneco_r15.proyecto.glb' );

		// Al abrir el proyecto vuelve SU mapa, no el que se detectaría solo.
		expect( reopened.boneMap ).toEqual( { ...rest, hips: 'HumanoidRootPart' } );
		expect( reopened.boneMap.leftHand ).toBeUndefined();
		expect( readGLBJson( arrayBuffer ).scenes[ 0 ].extras.editor3dRoblox ).toMatchObject( {
			format: PROJECT_FORMAT,
			boneMap: { hips: 'HumanoidRootPart', chest: 'UpperTorso' },
		} );

	} );

	it( 'un proyecto viejo (formato 1, sin mapa de huesos) se abre y el mapa se detecta solo', async () => {

		const { model } = openSample( 'r15' );
		const { arrayBuffer } = await exportProject( model );
		const gltf = await parseGLB( arrayBuffer );
		const info = gltf.scene.userData.editor3dRoblox;
		delete info.boneMap;
		info.format = 1;
		const reopened = new LoadedModel( gltf, 'viejo.proyecto.glb' );
		expect( reopened.project.format ).toBe( 1 );
		expect( reopened.boneMap ).toEqual( detectBoneMap( reopened.container ).boneMap );
		expect( reopened.boneMap.hips ).toBe( 'LowerTorso' );

	} );

	it( 'un mapa guardado con huesos que no existen se limpia al abrir', async () => {

		const { model } = openSample( 'r15' );
		model.boneMap = { ...model.boneMap, head: 'NoExiste', inventado: 'Head' };
		const { reopened } = await roundTrip( model, 'muneco_r15.proyecto.glb' );
		expect( reopened.boneMap.head ).toBeUndefined();
		expect( reopened.boneMap.inventado ).toBeUndefined();
		expect( reopened.boneMap.chest ).toBe( 'UpperTorso' );

	} );

	it( 'guardar no cambia el modelo abierto ni su lugar en la escena', async () => {

		const { model, scene } = openSample( 'piezas' );
		const before = getTransformState( model );
		await exportProject( model );
		expect( model.container.parent ).toBe( scene );
		expect( getTransformState( model ) ).toEqual( before );
		expect( model.container.userData.editor3dRoblox ).toBeUndefined();

	} );

} );
