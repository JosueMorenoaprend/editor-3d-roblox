import { describe, expect, it } from 'vitest';
import { AnimationMixer, Quaternion, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { importAnimations } from '../../src/core/animationImport.js';
import { createBoneTestClip } from '../../src/core/boneTest.js';
import { UserError } from '../../src/core/errors.js';
import { parseGLB } from '../../src/core/loader.js';
import { createSample } from '../../src/samples/index.js';
import { buildTPoseHumanoid, openSample } from './helpers.js';

/** Exporta a GLB y lo vuelve a abrir, como un archivo que elige el usuario. */
async function asFile( object, animations ) {

	const glb = await new GLTFExporter().parseAsync( object, { binary: true, animations } );
	return parseGLB( glb );

}

/** GLB con el cuerpo del muñeco R15 y sus 3 animaciones (como un personaje de Tripo con animación). */
async function r15File( rename = {} ) {

	const { gltf } = createSample( 'r15' );
	gltf.scene.traverse( ( object ) => {

		if ( object.isBone && rename[ object.name ] ) object.name = rename[ object.name ];

	} );
	return asFile( gltf.scene, gltf.animations );

}

/** GLB con SOLO la animación (sin malla ni piel): esqueleto tipo Mixamo con los ejes girados. */
async function mixamoAnimationOnlyFile() {

	const rig = buildTPoseHumanoid( { twisted: true, prefix: 'mixamorig' } );
	const { clip } = createBoneTestClip( rig, rig.boneMap );
	clip.name = 'Baile';
	return asFile( rig.container, [ clip ] );

}

describe( 'agregar animaciones de otro archivo', () => {

	it( 'pasa las 3 animaciones de un personaje con cuerpo a mi personaje', async () => {

		const target = buildTPoseHumanoid( { twisted: true } );
		const { clips, kind, missing } = importAnimations( await r15File(), 'muneco_r15.glb', target );
		expect( kind ).toBe( 'Roblox R15' );
		expect( missing ).toEqual( [] );
		expect( clips.map( ( clip ) => clip.name ) ).toEqual( [ 'Saludar', 'Caminar', 'Saltar' ] );
		for ( const clip of clips ) {

			expect( clip.validate() ).toBe( true );
			// Las pistas mueven los huesos de MI personaje (Hips, LeftUpperArm…), no los del archivo.
			expect( clip.tracks.every( ( track ) => /^(Hips|Spine|Chest|Neck|Head|Left|Right)/.test( track.name ) ), clip.name ).toBe( true );

		}

		// El archivo de origen no se agregó a mi personaje.
		expect( target.clips ).toEqual( [] );

	} );

	it( 'también lee un archivo que trae solo la animación, sin el cuerpo', async () => {

		const gltf = await mixamoAnimationOnlyFile();
		let bones = 0;
		gltf.scene.traverse( ( object ) => object.isBone && bones ++ );
		expect( bones ).toBe( 0 ); // sin piel, three.js no los abre como huesos

		const { model: target } = openSample( 'r15' );
		const { clips, kind } = importAnimations( gltf, 'baile.glb', target );
		expect( kind ).toBe( 'Mixamo' );
		expect( clips ).toHaveLength( 1 );
		expect( clips[ 0 ].name ).toBe( 'Baile' );
		expect( clips[ 0 ].tracks.map( ( track ) => track.name ) ).toContain( 'LeftUpperArm.quaternion' );

	} );

	it( 'si la animación mueve solo algunas partes, las demás quedan como en el origen (pose T)', async () => {

		// Archivo sin cuerpo que solo mueve el brazo izquierdo: el resto del esqueleto está en pose T.
		const rig = buildTPoseHumanoid( { twisted: true, prefix: 'mixamorig' } );
		const { clip: wave } = createBoneTestClip( rig, rig.boneMap, [ 'leftUpperArm' ] );
		const gltf = await asFile( rig.container, [ wave ] );

		const { model: target } = openSample( 'r15' );
		const { clips, missing } = importAnimations( gltf, 'saludo.glb', target );
		// El archivo tiene todas las partes (aunque no las mueva): no falta ninguna.
		expect( missing ).toEqual( [] );

		// Al empezar, el brazo DERECHO del R15 (que en reposo cuelga) queda horizontal, como en el origen.
		const mixer = new AnimationMixer( target.container );
		mixer.clipAction( clips[ 0 ] ).play();
		mixer.setTime( 0 );
		target.container.updateMatrixWorld( true );
		const at = ( name ) => target.container.worldToLocal( target.container.getObjectByName( name ).getWorldPosition( new Vector3() ) );
		const arm = at( 'RightLowerArm' ).sub( at( 'RightUpperArm' ) ).normalize();
		expect( arm.angleTo( new Vector3( - 1, 0, 0 ) ) ).toBeLessThan( 0.01 );
		// Las manos del R15 no tienen dedos (no se sabe hacia dónde apuntan): siguen derechas a su antebrazo.
		for ( const hand of [ 'LeftHand', 'RightHand' ] ) {

			expect( target.container.getObjectByName( hand ).quaternion.angleTo( new Quaternion() ), hand ).toBeLessThan( 0.01 );

		}

		mixer.stopAllAction();
		target.restoreRestPose();

	} );

	it( 'no repite nombres con las animaciones que ya tengo', async () => {

		const { model: target } = openSample( 'r15' );
		const { clips } = importAnimations( await r15File(), 'muneco_r15.glb', target );
		expect( clips.map( ( clip ) => clip.name ) ).toEqual( [ 'Saludar (2)', 'Caminar (2)', 'Saltar (2)' ] );

	} );

	it( 'avisa qué partes no mueve el archivo', async () => {

		const target = buildTPoseHumanoid();
		const gltf = await r15File( { LeftHand: 'Bone_07', RightHand: 'Bone_08' } );
		const { missing } = importAnimations( gltf, 'raro.glb', target );
		expect( missing ).toEqual( [ 'leftHand', 'rightHand' ] );

	} );

	it( 'explica qué hacer si algo no sirve', async () => {

		const target = buildTPoseHumanoid();
		const expectUserError = ( fn, text ) => {

			let error = null;
			try {

				fn();

			} catch ( caught ) {

				error = caught;

			}

			expect( error ).toBeInstanceOf( UserError );
			expect( error.message ).toContain( text );

		};

		// Mi personaje con el mapa incompleto.
		const incomplete = buildTPoseHumanoid();
		delete incomplete.boneMap.leftHand;
		const file = await r15File();
		expectUserError( () => importAnimations( file, 'muneco_r15.glb', incomplete ), 'Primero completa el mapa de huesos' );

		// Un archivo sin animaciones (el carrito).
		const { gltf } = createSample( 'piezas' );
		const cart = await asFile( gltf.scene, [] );
		expectUserError( () => importAnimations( cart, 'carrito.glb', target ), 'no trae animaciones' );

		// Un esqueleto que no se reconoce.
		const odd = await r15File( { LowerTorso: 'Bone_01', LeftUpperLeg: 'Bone_02', RightUpperLeg: 'Bone_03' } );
		expectUserError( () => importAnimations( odd, 'raro.glb', target ), 'No reconozco el esqueleto' );

	} );

} );
