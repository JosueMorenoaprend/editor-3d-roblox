import { describe, expect, it } from 'vitest';
import { AnimationMixer, LoopOnce, MathUtils, Vector3 } from 'three';
import { createBoneTestClip } from '../../src/core/boneTest.js';
import { RETARGET_FPS, retargetClip } from '../../src/core/retarget.js';
import { buildTPoseHumanoid, openSample } from './helpers.js';

// Tramos del cuerpo que se comparan entre los dos personajes: [desde, hasta] (partes del mapa).
const SEGMENTS = [
	[ 'leftUpperArm', 'leftLowerArm' ], [ 'leftLowerArm', 'leftHand' ],
	[ 'rightUpperArm', 'rightLowerArm' ], [ 'rightLowerArm', 'rightHand' ],
	[ 'leftUpperLeg', 'leftLowerLeg' ], [ 'leftLowerLeg', 'leftFoot' ],
	[ 'rightUpperLeg', 'rightLowerLeg' ], [ 'rightLowerLeg', 'rightFoot' ],
];

/** Pone el modelo en un momento de una animación y devuelve una función para leer sus huesos. */
function poseAt( model, clip, time ) {

	const mixer = new AnimationMixer( model.container );
	const action = mixer.clipAction( clip );
	action.setLoop( LoopOnce, 1 );
	action.clampWhenFinished = true;
	action.play();
	mixer.setTime( time );
	model.container.updateMatrixWorld( true );
	const position = ( key ) => {

		const bone = model.container.getObjectByName( model.boneMap[ key ] );
		return model.container.worldToLocal( bone.getWorldPosition( new Vector3() ) );

	};

	const directions = {};
	for ( const [ from, to ] of SEGMENTS ) directions[ `${ from }→${ to }` ] = position( to ).sub( position( from ) ).normalize();
	const hips = position( 'hips' );
	mixer.stopAllAction();
	mixer.uncacheRoot( model.container );
	model.restoreRestPose();
	return { directions, hips };

}

/** Ángulo en grados entre dos direcciones. */
const angle = ( a, b ) => MathUtils.radToDeg( a.angleTo( b ) );

/** Compara, en varios cuadros, hacia dónde apunta cada tramo del cuerpo en los dos personajes. */
function expectSameDirections( source, sourceClip, target, targetClip, times ) {

	for ( const time of times ) {

		const a = poseAt( source, sourceClip, time ).directions;
		const b = poseAt( target, targetClip, time ).directions;
		for ( const segment of Object.keys( a ) ) {

			expect( angle( a[ segment ], b[ segment ] ), `${ segment } a los ${ time.toFixed( 2 ) } s` ).toBeLessThan( 0.5 );

		}

	}

}

const frameTimes = ( clip, step = 4 ) => {

	const times = [];
	for ( let i = 0; i / RETARGET_FPS <= clip.duration; i += step ) times.push( i / RETARGET_FPS );
	return times;

};

describe( 'pasar animaciones de un personaje a otro (retarget)', () => {

	it( 'de un esqueleto en pose T con los ejes girados (como Mixamo) al muñeco R15', () => {

		const source = buildTPoseHumanoid( { twisted: true, prefix: 'mixamorig' } );
		const { model: target } = openSample( 'r15' );
		// Animación del origen: cada parte del cuerpo se mueve por turnos.
		const sourceClip = createBoneTestClip( source, source.boneMap ).clip;
		const { clip, keys } = retargetClip( source, target, sourceClip );

		expect( clip.name ).toBe( sourceClip.name );
		expect( clip.duration ).toBeCloseTo( sourceClip.duration, 6 );
		expect( clip.validate() ).toBe( true );
		// Las 15 partes que tiene el R15 (no tiene columna, cuello, hombros ni dedos de los pies).
		expect( keys ).toHaveLength( 15 );
		expect( clip.tracks.map( ( track ) => track.name ) ).toContain( 'LeftUpperArm.quaternion' );
		expect( clip.tracks.every( ( track ) => ! track.name.startsWith( 'mixamorig' ) ) ).toBe( true );

		// Brazos y piernas del R15 apuntan hacia donde apuntan los del origen, en cada cuadro.
		// (El R15 tiene los brazos abajo en reposo: al empezar, se ponen en pose T como el origen.)
		expectSameDirections( source, sourceClip, target, clip, frameTimes( clip ) );
		const start = poseAt( target, clip, 0 ).directions[ 'leftUpperArm→leftLowerArm' ];
		expect( angle( start, new Vector3( 1, 0, 0 ) ) ).toBeLessThan( 0.5 );

	} );

	it( 'del muñeco R15 a un esqueleto en pose T con los ejes girados', () => {

		const { model: source } = openSample( 'r15' );
		const target = buildTPoseHumanoid( { twisted: true } );
		for ( const sourceClip of source.clips ) {

			const { clip } = retargetClip( source, target, sourceClip );
			expect( clip.validate(), sourceClip.name ).toBe( true );
			expectSameDirections( source, sourceClip, target, clip, frameTimes( clip, 3 ) );

		}

	} );

	it( 'la cadera se desplaza (saltar), escalada al largo de las piernas', () => {

		const { model: source } = openSample( 'r15' );
		const target = buildTPoseHumanoid( { twisted: true } );
		const jump = source.clips.find( ( clip ) => clip.name === 'Saltar' );
		const { clip } = retargetClip( source, target, jump );
		expect( clip.tracks.map( ( track ) => track.name ) ).toContain( 'Hips.position' );

		const top = 0.6; // en el aire
		const sourceRise = poseAt( source, jump, top ).hips.y - poseAt( source, jump, 0 ).hips.y;
		const targetRise = poseAt( target, clip, top ).hips.y - poseAt( target, clip, 0 ).hips.y;
		expect( sourceRise ).toBeCloseTo( 0.45, 3 );
		// Piernas del R15: 1,7 studs (0,476 m); del destino: 0,87 m.
		expect( targetRise ).toBeCloseTo( 0.45 * ( 0.87 / ( 1.7 * 0.28 ) ), 3 );

		// Saludar no mueve la cadera: no lleva pista de posición.
		const wave = retargetClip( source, target, source.clips.find( ( c ) => c.name === 'Saludar' ) ).clip;
		expect( wave.tracks.some( ( track ) => track.name.endsWith( '.position' ) ) ).toBe( false );

	} );

	it( 'solo pasa las partes que tienen los dos, y no cambia a ninguno de los dos personajes', () => {

		const source = buildTPoseHumanoid( { twisted: true } );
		const { model: target } = openSample( 'r15' );
		const sourceClip = createBoneTestClip( source, source.boneMap ).clip;
		// El origen sin manos en su mapa: las manos del destino no se animan.
		const { leftHand, rightHand, ...withoutHands } = source.boneMap;
		expect( leftHand && rightHand ).toBeTruthy();
		const { clip, keys } = retargetClip( { ...source, boneMap: withoutHands, container: source.container, restPose: source.restPose }, target, sourceClip );
		expect( keys ).not.toContain( 'leftHand' );
		expect( clip.tracks.map( ( track ) => track.name ) ).not.toContain( 'LeftHand.quaternion' );

		// Los dos quedan en su pose de reposo.
		for ( const model of [ source, target ] ) {

			for ( const [ object, pose ] of model.restPose ) {

				expect( object.quaternion.equals( pose.quaternion ), object.name ).toBe( true );
				expect( object.position.equals( pose.position ), object.name ).toBe( true );

			}

		}

	} );

	it( 'los tiempos siempre aumentan, también guardados en float32 (como en el GLB)', () => {

		const source = buildTPoseHumanoid( { twisted: true } );
		const { model: target } = openSample( 'r15' );
		const sourceClip = createBoneTestClip( source, source.boneMap, [ 'leftUpperArm', 'rightUpperArm' ] ).clip;
		// Al leer un GLB, la duración sale de un float32: 1,6 → 1,6000000238…
		sourceClip.duration = Math.fround( 1.6 );
		const { clip } = retargetClip( source, target, sourceClip );
		for ( const track of clip.tracks ) {

			const times = Float32Array.from( track.times );
			for ( let i = 1; i < times.length; i ++ ) expect( times[ i ], `${ track.name } [${ i }]` ).toBeGreaterThan( times[ i - 1 ] );
			expect( times[ times.length - 1 ] ).toBe( Math.fround( clip.duration ) );

		}

	} );

	it( 'una animación de un solo cuadro (una pose) también se pasa', () => {

		const source = buildTPoseHumanoid( { twisted: true } );
		const { model: target } = openSample( 'r15' );
		const sourceClip = createBoneTestClip( source, source.boneMap, [ 'leftUpperArm' ] ).clip;
		sourceClip.duration = 0;
		const { clip } = retargetClip( source, target, sourceClip );
		expect( clip.validate() ).toBe( true );
		expect( clip.tracks[ 0 ].times ).toEqual( new Float32Array( [ 0 ] ) );

	} );

} );
