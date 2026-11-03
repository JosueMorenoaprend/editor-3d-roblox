import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { mirrorAngles, oppositeKey, poseRotations, readPose } from '../../src/core/poseTools.js';
import { RestPose, findBones, localFromAngles } from '../../src/core/skeletonPose.js';
import { buildTPoseHumanoid, openSample } from './helpers.js';

/** Pone grados (en el espacio del personaje) a algunas partes. */
function pose( model, angles ) {

	const rest = new RestPose( model.container, model.restPose );
	const bones = findBones( model.container );
	for ( const [ key, value ] of Object.entries( angles ) ) {

		const bone = bones.get( model.boneMap[ key ] );
		bone.quaternion.copy( localFromAngles( rest, bone, value ) );

	}

	model.container.updateMatrixWorld( true );
	return { rest, bones };

}

function applyRotations( model, bones, rotations ) {

	for ( const [ key, quaternion ] of rotations ) bones.get( model.boneMap[ key ] ).quaternion.copy( quaternion );
	model.container.updateMatrixWorld( true );

}

/** Hacia dónde apunta una parte (de su hueso al siguiente), en el espacio del modelo. */
function direction( model, from, to ) {

	const at = ( key ) => model.container.worldToLocal( model.container.getObjectByName( model.boneMap[ key ] ).getWorldPosition( new Vector3() ) );
	return at( to ).sub( at( from ) ).normalize();

}

describe( 'reflejar, copiar y pegar poses', () => {

	it( 'reflejar pasa el giro al otro lado, en espejo, también con los ejes girados (Mixamo)', () => {

		expect( [ 'leftUpperArm', 'rightFoot', 'head' ].map( oppositeKey ) ).toEqual( [ 'rightUpperArm', 'leftFoot', 'head' ] );
		for ( const model of [ openSample( 'r15' ).model, buildTPoseHumanoid( { twisted: true } ) ] ) {

			const { rest, bones } = pose( model, { leftUpperArm: [ 30, 0, 50 ], head: [ 0, 25, 0 ] } );
			const left = direction( model, 'leftUpperArm', 'leftLowerArm' );
			applyRotations( model, bones, poseRotations( rest, model.boneMap, bones, mirrorAngles( readPose( rest, model.boneMap, bones ) ) ) );
			// El brazo derecho apunta como apuntaba el izquierdo, en espejo (X al revés)…
			const right = direction( model, 'rightUpperArm', 'rightLowerArm' );
			expect( right.angleTo( new Vector3( - left.x, left.y, left.z ) ) ).toBeLessThan( 1e-6 );
			// …y la cabeza gira hacia el otro lado.
			expect( readPose( rest, model.boneMap, bones ).get( 'head' )[ 1 ] ).toBeCloseTo( - 25, 6 );
			model.restoreRestPose();

		}

	} );

	it( 'copiar y pegar devuelve la misma pose', () => {

		const model = buildTPoseHumanoid( { twisted: true } );
		const { rest, bones } = pose( model, { leftUpperLeg: [ - 40, 10, 5 ], spine: [ 15, 0, 0 ] } );
		const copied = readPose( rest, model.boneMap, bones );
		const before = [ ...bones.values() ].map( ( bone ) => bone.quaternion.clone() );
		model.restoreRestPose();
		applyRotations( model, bones, poseRotations( rest, model.boneMap, bones, copied ) );
		[ ...bones.values() ].forEach( ( bone, i ) => expect( bone.quaternion.angleTo( before[ i ] ), bone.name ).toBeLessThan( 1e-6 ) );

	} );

} );
