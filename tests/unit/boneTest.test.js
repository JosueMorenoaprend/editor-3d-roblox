import { describe, expect, it } from 'vitest';
import { AnimationMixer, Vector3 } from 'three';
import { AnimationController } from '../../src/core/animation.js';
import { detectBoneMap } from '../../src/core/boneDetect.js';
import { BONE_TEST_NAME, STEP_SECONDS, createBoneTestClip } from '../../src/core/boneTest.js';
import { rotate90, setUniformScale } from '../../src/core/transform.js';
import { buildTPoseHumanoid, openSample } from './helpers.js';

/** Posición de cada hueso (en el espacio del modelo) en un momento de la animación. */
function poseAt( model, clip, time ) {

	const mixer = new AnimationMixer( model.container );
	mixer.clipAction( clip ).play();
	mixer.setTime( time );
	model.container.updateMatrixWorld( true );
	const positions = {};
	model.container.traverse( ( object ) => {

		if ( object.isBone ) positions[ object.name ] = model.container.worldToLocal( object.getWorldPosition( new Vector3() ) );

	} );
	mixer.stopAllAction();
	model.restoreRestPose();
	return positions;

}

/** Momento de máximo movimiento del turno de una parte. */
const peak = ( steps, key ) => steps.find( ( step ) => step.key === key ).start + 0.5 * 0.85 * STEP_SECONDS;

describe( 'animación de prueba del mapa de huesos', () => {

	it( 'mueve por turnos cada parte del mapa, con el nombre de su hueso', () => {

		const { model } = openSample( 'r15' );
		const { clip, steps } = createBoneTestClip( model, model.boneMap );
		expect( clip.name ).toBe( BONE_TEST_NAME );
		expect( clip.validate() ).toBe( true );
		expect( steps ).toHaveLength( 15 );
		expect( clip.tracks ).toHaveLength( 15 );
		expect( clip.duration ).toBeCloseTo( 15 * STEP_SECONDS, 6 );
		expect( steps[ 0 ] ).toMatchObject( { key: 'hips', label: 'Cadera', boneName: 'LowerTorso', start: 0 } );
		const hand = steps.find( ( step ) => step.key === 'leftHand' );
		expect( hand ).toMatchObject( { label: 'Mano izquierda', boneName: 'LeftHand' } );
		expect( hand.end - hand.start ).toBeCloseTo( STEP_SECONDS, 6 );
		expect( clip.tracks.map( ( track ) => track.name ) ).toContain( 'LeftHand.quaternion' );

	} );

	it( 'el muñeco R15 levanta el brazo izquierdo hacia afuera, y solo ese brazo', () => {

		const { model } = openSample( 'r15' );
		const { clip, steps } = createBoneTestClip( model, model.boneMap, [ 'leftUpperArm' ] );
		const rest = poseAt( model, clip, 0 );
		const moved = poseAt( model, clip, peak( steps, 'leftUpperArm' ) );
		expect( moved.LeftHand.x - rest.LeftHand.x ).toBeGreaterThan( 0.2 );
		expect( moved.LeftHand.y - rest.LeftHand.y ).toBeGreaterThan( 0.1 );
		expect( moved.RightHand.distanceTo( rest.RightHand ) ).toBeLessThan( 1e-6 );
		expect( moved.Head.distanceTo( rest.Head ) ).toBeLessThan( 1e-6 );
		// Al terminar su turno, vuelve a la pose de reposo.
		expect( poseAt( model, clip, clip.duration ).LeftHand.distanceTo( rest.LeftHand ) ).toBeLessThan( 1e-5 );

	} );

	it( 'se ve igual aunque cada hueso tenga sus ejes girados (como en Mixamo)', () => {

		const straight = buildTPoseHumanoid( { twisted: false } );
		const twisted = buildTPoseHumanoid( { twisted: true } );
		const boneMap = detectBoneMap( straight.container ).boneMap;
		expect( detectBoneMap( twisted.container ).boneMap ).toEqual( boneMap );
		expect( Object.keys( boneMap ) ).toHaveLength( 21 );

		const a = createBoneTestClip( straight, boneMap );
		const b = createBoneTestClip( twisted, boneMap );
		for ( const step of a.steps ) {

			const time = peak( a.steps, step.key );
			const poseA = poseAt( straight, a.clip, time );
			const poseB = poseAt( twisted, b.clip, time );
			for ( const name of Object.keys( poseA ) ) {

				expect( poseB[ name ].distanceTo( poseA[ name ] ), `${ step.key }: ${ name }` ).toBeLessThan( 1e-4 );

			}

		}

	} );

	it( 'cada parte se mueve hacia donde se espera', () => {

		const model = buildTPoseHumanoid( { twisted: true } );
		const { clip, steps } = createBoneTestClip( model, model.boneMap );
		const rest = poseAt( model, clip, 0 );
		const at = ( key ) => poseAt( model, clip, peak( steps, key ) );
		// Brazo en pose T: sube. Antebrazo: hacia adelante. Muslo: adelante. Rodilla: atrás. Pie: punta arriba.
		expect( at( 'leftUpperArm' ).LeftHand.y - rest.LeftHand.y ).toBeGreaterThan( 0.2 );
		expect( at( 'rightUpperArm' ).RightHand.y - rest.RightHand.y ).toBeGreaterThan( 0.2 );
		expect( at( 'leftLowerArm' ).LeftHand.z - rest.LeftHand.z ).toBeGreaterThan( 0.15 );
		expect( at( 'leftUpperLeg' ).LeftFoot.z - rest.LeftFoot.z ).toBeGreaterThan( 0.2 );
		expect( at( 'rightLowerLeg' ).RightFoot.z - rest.RightFoot.z ).toBeLessThan( - 0.2 );
		expect( at( 'leftFoot' ).LeftToes.y - rest.LeftToes.y ).toBeGreaterThan( 0.03 );
		expect( at( 'spine' ).Head.z - rest.Head.z ).toBeGreaterThan( 0.1 );
		// La cabeza gira a los lados: la punta de la cabeza no se mueve, pero el giro sí cambia.
		const head = model.container.getObjectByName( 'Head' );
		const restHead = head.quaternion.clone();
		const mixer = new AnimationMixer( model.container );
		mixer.clipAction( clip ).play();
		mixer.setTime( steps.find( ( step ) => step.key === 'head' ).start + 0.25 * 0.85 * STEP_SECONDS );
		expect( head.quaternion.angleTo( restHead ) ).toBeGreaterThan( 0.5 );
		mixer.stopAllAction();
		model.restoreRestPose();

	} );

	it( 'usa los huesos que eligió el usuario y no depende de los ajustes del modelo', () => {

		const { model } = openSample( 'r15' );
		// Error típico: la mano izquierda quedó en otro hueso. El usuario la elige a mano.
		const boneMap = { ...model.boneMap, leftHand: 'LeftLowerArm', leftLowerArm: 'LeftUpperArm', leftUpperArm: 'LeftHand' };
		const { clip, steps } = createBoneTestClip( model, boneMap, [ 'leftHand', 'head', 'spine' ] );
		// La columna no está en el mapa del R15: se salta.
		expect( steps.map( ( step ) => [ step.key, step.boneName ] ) ).toEqual( [ [ 'leftHand', 'LeftLowerArm' ], [ 'head', 'Head' ] ] );
		expect( clip.tracks.map( ( track ) => track.name ) ).toEqual( [ 'LeftLowerArm.quaternion', 'Head.quaternion' ] );

		// Girar o escalar el modelo en "Ajustes" no cambia la animación (va dentro del contenedor).
		const before = createBoneTestClip( model, model.boneMap ).clip;
		rotate90( model, 'x' );
		setUniformScale( model, 3 );
		const after = createBoneTestClip( model, model.boneMap ).clip;
		before.tracks.forEach( ( track, i ) => {

			expect( after.tracks[ i ].name ).toBe( track.name );
			after.tracks[ i ].values.forEach( ( value, j ) => expect( value ).toBeCloseTo( track.values[ j ], 6 ) );

		} );

	} );

	it( 'si dos partes tienen el mismo hueso, junta sus turnos en una sola pista', () => {

		const { model } = openSample( 'r15' );
		const { clip, steps } = createBoneTestClip( model, { leftHand: 'LeftHand', rightHand: 'LeftHand' } );
		expect( steps ).toHaveLength( 2 );
		expect( clip.tracks ).toHaveLength( 1 );
		expect( clip.validate() ).toBe( true );

	} );

} );

describe( 'vista previa en el reproductor', () => {

	it( 'suena una vez, no se agrega al modelo y vuelve a la animación de antes', () => {

		const { model } = openSample( 'r15' );
		const anim = new AnimationController();
		anim.setModel( model );
		anim.select( 1 );
		const arm = model.container.getObjectByName( 'LeftUpperArm' );
		const rest = arm.quaternion.clone();

		const { clip } = createBoneTestClip( model, model.boneMap, [ 'leftUpperArm' ] );
		anim.playPreview( clip );
		expect( anim.previewing ).toBe( true );
		expect( anim.isPlaying ).toBe( true );
		expect( model.clips.map( ( c ) => c.name ) ).toEqual( [ 'Saludar', 'Caminar', 'Saltar' ] );

		anim.update( 0.34 );
		expect( arm.quaternion.angleTo( rest ) ).toBeGreaterThan( 0.5 );
		anim.setLoop( true ); // "Repetir" no afecta a la vista previa
		anim.update( 0.3 );
		anim.update( 0.3 ); // pasa el final (dura 0,8 s)
		expect( anim.previewing ).toBe( false );
		expect( anim.isPlaying ).toBe( false );
		expect( anim.selectedIndex ).toBe( 1 );
		expect( arm.quaternion.angleTo( rest ) ).toBeLessThan( 1e-6 );

	} );

	it( 'detener o elegir otra animación termina la vista previa', () => {

		const { model } = openSample( 'r15' );
		const anim = new AnimationController();
		anim.setModel( model );
		anim.select( 0 );
		const { clip } = createBoneTestClip( model, model.boneMap );
		anim.playPreview( clip );
		anim.update( 0.5 );
		anim.stop();
		expect( anim.previewing ).toBe( false );
		expect( anim.selectedIndex ).toBe( 0 );

		anim.playPreview( clip );
		anim.select( 2 );
		expect( anim.previewing ).toBe( false );
		expect( anim.selectedIndex ).toBe( 2 );
		anim.play();
		expect( anim.isPlaying ).toBe( true );

	} );

} );
