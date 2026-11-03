import { describe, expect, it } from 'vitest';
import { AnimationMixer, Quaternion, Vector3 } from 'three';
import { exportGLB } from '../../src/core/exporter.js';
import { KeyframeAnimation } from '../../src/core/keyframeAnimation.js';
import { RestPose, anglesFromLocal, localFromAngles } from '../../src/core/skeletonPose.js';
import { describeIssues, readGLBJson, validateGLB } from '../helpers/gltf.js';
import { buildTPoseHumanoid, openSample } from './helpers.js';

/** Dirección del brazo izquierdo (hombro → codo) en el espacio del modelo, con el brazo girado así. */
function armDirection( model, upper, lower, angles ) {

	const rest = new RestPose( model.container, model.restPose );
	const bone = model.container.getObjectByName( upper );
	bone.quaternion.copy( localFromAngles( rest, bone, angles ) );
	model.container.updateMatrixWorld( true );
	const at = ( name ) => model.container.worldToLocal( model.container.getObjectByName( name ).getWorldPosition( new Vector3() ) );
	const direction = at( lower ).sub( at( upper ) ).normalize();
	model.restoreRestPose();
	return direction;

}

describe( 'ángulos de los deslizadores (en el espacio del personaje)', () => {

	it( 'ida y vuelta: ángulos → giro del hueso → los mismos ángulos', () => {

		let seed = 3;
		const random = ( range ) => ( ( ( seed = ( seed * 16807 ) % 2147483647 ) / 2147483647 ) * 2 - 1 ) * range;
		for ( const model of [ openSample( 'r15' ).model, buildTPoseHumanoid( { twisted: true } ) ] ) {

			const rest = new RestPose( model.container, model.restPose );
			const bones = [];
			model.container.traverse( ( object ) => object.isBone && bones.push( object ) );
			for ( const bone of bones ) {

				const angles = [ random( 80 ), random( 170 ), random( 170 ) ];
				const back = anglesFromLocal( rest, bone, localFromAngles( rest, bone, angles ) );
				back.forEach( ( value, i ) => expect( value, `${ bone.name } ${ i }` ).toBeCloseTo( angles[ i ], 6 ) );

			}

			// En reposo, todo en 0.
			for ( const bone of bones ) expect( anglesFromLocal( rest, bone, bone.quaternion.clone() ).map( ( v ) => Math.abs( v ) < 1e-6 ) ).toEqual( [ true, true, true ] );

		}

	} );

	it( 'significan lo mismo en esqueletos distintos: "hacia los lados" sube o baja el brazo', () => {

		const r15 = openSample( 'r15' ).model;
		const tpose = buildTPoseHumanoid( { twisted: true } );
		// R15 (brazo abajo): +90° hacia los lados → horizontal hacia afuera.
		expect( armDirection( r15, 'LeftUpperArm', 'LeftLowerArm', [ 0, 0, 90 ] ).angleTo( new Vector3( 1, 0, 0 ) ) ).toBeLessThan( 1e-6 );
		// Pose T con ejes girados (brazo horizontal): −90° hacia los lados → abajo.
		expect( armDirection( tpose, 'LeftUpperArm', 'LeftLowerArm', [ 0, 0, - 90 ] ).angleTo( new Vector3( 0, - 1, 0 ) ) ).toBeLessThan( 1e-6 );
		// −90° adelante/atrás → la pierna apunta hacia adelante.
		expect( armDirection( tpose, 'LeftUpperLeg', 'LeftLowerLeg', [ - 90, 0, 0 ] ).angleTo( new Vector3( 0, 0, 1 ) ) ).toBeLessThan( 1e-6 );

	} );

} );

describe( 'animación con keyframes', () => {

	it( 'pone, reemplaza, ordena y quita keyframes', () => {

		const animation = new KeyframeAnimation( { name: 'Saludo', duration: 2 } );
		const up = new Quaternion().setFromAxisAngle( new Vector3( 0, 0, 1 ), Math.PI / 2 );
		animation.setKey( 'LeftUpperArm', 1, up );
		animation.setKey( 'LeftUpperArm', 0, new Quaternion() );
		animation.setKey( 'LeftUpperArm', 1.0004, new Quaternion() ); // mismo momento: reemplaza
		animation.setKey( 'Head', 5, new Quaternion() ); // fuera de la duración: queda en 2 s
		expect( animation.keyTimes( 'LeftUpperArm' ) ).toEqual( [ 0, 1 ] );
		expect( animation.keyTimes( 'Head' ) ).toEqual( [ 2 ] );
		expect( animation.keyCount ).toBe( 3 );
		expect( animation.hasKey( 'LeftUpperArm', 1 ) ).toBe( true );
		expect( animation.removeKey( 'LeftUpperArm', 1 ) ).toBe( true );
		expect( animation.removeKey( 'LeftUpperArm', 1 ) ).toBe( false );
		expect( animation.keyTimes( 'LeftUpperArm' ) ).toEqual( [ 0 ] );
		animation.setDuration( 1 );
		expect( animation.keyTimes( 'Head' ) ).toEqual( [] );
		expect( animation.keyCount ).toBe( 1 );

	} );

	it( 'se convierte en una animación que interpola entre keyframes y se exporta válida', async () => {

		const { model } = openSample( 'r15' );
		const rest = new RestPose( model.container, model.restPose );
		const arm = model.container.getObjectByName( 'LeftUpperArm' );
		const animation = new KeyframeAnimation( { name: 'Brazo arriba', duration: 2 } );
		animation.setKey( arm.name, 0, localFromAngles( rest, arm, [ 0, 0, 0 ] ) );
		animation.setKey( arm.name, 1, localFromAngles( rest, arm, [ 0, 0, 90 ] ) );
		const clip = animation.toClip();
		expect( clip.name ).toBe( 'Brazo arriba' );
		expect( clip.duration ).toBe( 2 );
		expect( clip.validate() ).toBe( true );
		expect( clip.tracks.map( ( track ) => track.name ) ).toEqual( [ 'LeftUpperArm.quaternion' ] );

		// A la mitad entre los dos keyframes, el brazo va por 45°.
		const mixer = new AnimationMixer( model.container );
		mixer.clipAction( clip ).play();
		mixer.setTime( 0.5 );
		const angles = anglesFromLocal( rest, arm, arm.quaternion.clone() );
		expect( angles[ 2 ] ).toBeCloseTo( 45, 4 );
		mixer.stopAllAction();
		model.restoreRestPose();

		model.clips.push( clip );
		const { arrayBuffer } = await exportGLB( model );
		const { errors } = await validateGLB( arrayBuffer );
		expect( errors, describeIssues( errors ) ).toHaveLength( 0 );
		expect( readGLBJson( arrayBuffer ).animations.map( ( a ) => a.name ) ).toContain( 'Brazo arriba' );

	} );

} );

describe( 'keyframe de toda la pose', () => {

	it( 'pone un keyframe a cada parte en el mismo momento y reemplaza sin duplicar', () => {

		const animation = new KeyframeAnimation( { duration: 2 } );
		const up = new Quaternion().setFromAxisAngle( new Vector3( 0, 0, 1 ), 1 );
		const turn = new Quaternion().setFromAxisAngle( new Vector3( 0, 1, 0 ), 0.5 );
		expect( animation.setPose( 1, [ [ 'LeftUpperArm', up ], [ 'Head', turn ] ] ) ).toBe( 2 );
		expect( animation.keyCount ).toBe( 2 );
		expect( animation.keyTimes( 'LeftUpperArm' ) ).toEqual( [ 1 ] );
		expect( animation.keyTimes( 'Head' ) ).toEqual( [ 1 ] );
		expect( animation.setPose( 1, [ [ 'Head', up ] ] ) ).toBe( 1 );
		expect( animation.keyCount ).toBe( 2 );
		const clip = animation.toClip();
		expect( clip.tracks.map( ( track ) => track.name ).sort() ).toEqual( [ 'Head.quaternion', 'LeftUpperArm.quaternion' ] );
		expect( clip.validate() ).toBe( true );

	} );

} );

describe( 'deshacer en el borrador', () => {

	it( 'snapshot() y restore() vuelven exactamente al estado guardado', () => {

		const animation = new KeyframeAnimation( { duration: 2 } );
		const up = new Quaternion().setFromAxisAngle( new Vector3( 0, 0, 1 ), 1 );
		animation.setKey( 'LeftUpperArm', 0, new Quaternion() );
		animation.setKey( 'LeftUpperArm', 1.5, up );
		const saved = animation.snapshot();
		animation.setDuration( 1 );
		animation.setKey( 'Head', 0.5, up );
		animation.restore( saved );
		expect( animation.duration ).toBe( 2 );
		expect( animation.keyTimes( 'LeftUpperArm' ) ).toEqual( [ 0, 1.5 ] );
		expect( animation.keyTimes( 'Head' ) ).toEqual( [] );
		// La copia no cambia con lo que se haga después.
		animation.removeKey( 'LeftUpperArm', 0 );
		expect( saved.keys.get( 'LeftUpperArm' ) ).toHaveLength( 2 );
		expect( animation.toClip().validate() ).toBe( true );

	} );

} );

describe( 'guardar el borrador en el proyecto', () => {

	it( 'toJSON() y fromJSON() van y vuelven, y lo dañado se ignora', () => {

		const animation = new KeyframeAnimation( { name: 'Saludo a mano', duration: 3 } );
		const up = new Quaternion().setFromAxisAngle( new Vector3( 0, 0, 1 ), 1 );
		animation.setKey( 'LeftUpperArm', 0, new Quaternion() );
		animation.setKey( 'LeftUpperArm', 1.25, up );
		const data = JSON.parse( JSON.stringify( animation.toJSON() ) );
		const back = KeyframeAnimation.fromJSON( data );
		expect( back.name ).toBe( 'Saludo a mano' );
		expect( back.duration ).toBe( 3 );
		expect( back.keyTimes( 'LeftUpperArm' ) ).toEqual( [ 0, 1.25 ] );
		expect( back.toClip().tracks[ 0 ].values.slice( 4 ) ).toEqual( Float32Array.from( up.toArray() ) );

		data.keys.Head = [ [ 0.5, 1, 'x', 0, 0 ], 'nada' ];
		data.duration = - 4;
		const odd = KeyframeAnimation.fromJSON( data );
		expect( odd.duration ).toBe( 2 );
		expect( odd.keyTimes( 'Head' ) ).toEqual( [] );
		expect( KeyframeAnimation.fromJSON( null ).keyCount ).toBe( 0 );

	} );

} );

describe( 'editar una animación que ya existe', () => {

	it( 'se vuelve borrador sin perder nada (ni la posición de la cadera) y pasa por JSON', () => {

		const { model } = openSample( 'r15' );
		const walk = model.clips.find( ( clip ) => clip.name === 'Caminar' );
		const bones = new Map();
		model.container.traverse( ( object ) => object.isBone && bones.set( object.name, object ) );
		const draft = KeyframeAnimation.fromClip( walk, bones );
		expect( draft.source ).toBe( 'Caminar' );
		expect( draft.keyTimes( 'LeftUpperLeg' ) ).toEqual( [ 0, 0.25, 0.5, 0.75, 1 ] );
		expect( draft.extraTracks.map( ( track ) => track.name ) ).toEqual( [ 'HumanoidRootPart.position' ] );
		const clip = draft.toClip();
		expect( clip.validate() ).toBe( true );
		for ( const track of walk.tracks ) {

			const copy = clip.tracks.find( ( item ) => item.name === track.name );
			expect( Array.from( copy.times ), track.name ).toEqual( Array.from( track.times ) );
			expect( Array.from( copy.values ), track.name ).toEqual( Array.from( track.values ) );

		}

		const back = KeyframeAnimation.fromJSON( JSON.parse( JSON.stringify( draft.toJSON() ) ) );
		expect( back.source ).toBe( 'Caminar' );
		expect( back.toClip().tracks.map( ( track ) => track.name ).sort() ).toEqual( walk.tracks.map( ( track ) => track.name ).sort() );

	} );

} );
