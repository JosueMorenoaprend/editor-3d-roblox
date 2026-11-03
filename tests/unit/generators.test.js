import { describe, expect, it } from 'vitest';
import { AnimationMixer, LoopOnce, MathUtils, Quaternion, Vector3 } from 'three';
import { UserError } from '../../src/core/errors.js';
import { GENERATORS, GENERATOR_FPS, defaultParams, generateAnimation } from '../../src/core/generators.js';
import { buildTPoseHumanoid, openSample } from './helpers.js';

/** Pone el modelo en un momento de la animación y lee sus huesos (en el espacio del modelo). */
function poseAt( model, clip, time ) {

	const mixer = new AnimationMixer( model.container );
	const action = mixer.clipAction( clip );
	action.setLoop( LoopOnce, 1 );
	action.clampWhenFinished = true;
	action.play();
	mixer.setTime( time );
	model.container.updateMatrixWorld( true );
	const result = {};
	model.container.traverse( ( object ) => {

		if ( ! object.isBone ) return;
		result[ object.name ] = {
			position: model.container.worldToLocal( object.getWorldPosition( new Vector3() ) ),
			quaternion: object.quaternion.clone(),
		};

	} );
	mixer.stopAllAction();
	mixer.uncacheRoot( model.container );
	model.restoreRestPose();
	return result;

}

/** Nombre del hueso de una parte del mapa. */
const boneOf = ( model, key ) => model.boneMap[ key ];

const characters = () => [
	[ 'el muñeco R15', openSample( 'r15' ).model ],
	[ 'un esqueleto en pose T con los ejes girados (Mixamo)', buildTPoseHumanoid( { twisted: true, prefix: 'mixamorig' } ) ],
];

describe( 'generadores de animación', () => {

	for ( const generator of GENERATORS ) {

		for ( const [ who, model ] of characters() ) {

			it( `${ generator.name} con ${ who }: válida, se repite sin saltos y queda en el lugar`, () => {

				const clip = generateAnimation( model, generator.id );
				expect( clip.name ).toBe( generator.name );
				expect( clip.validate() ).toBe( true );
				for ( const track of clip.tracks ) {

					// El último cuadro es igual al primero.
					const size = track.getValueSize();
					const first = track.values.slice( 0, size );
					const last = track.values.slice( track.values.length - size );
					expect( [ ...last ], track.name ).toEqual( [ ...first ] );
					expect( track.times[ track.times.length - 1 ] ).toBeCloseTo( clip.duration, 6 );

				}

				// En el lugar: la cadera sube y baja, pero no avanza ni se va a un costado.
				const hips = boneOf( model, 'hips' );
				const start = poseAt( model, clip, 0 )[ hips ].position;
				for ( let time = 0; time <= clip.duration; time += clip.duration / 8 ) {

					const position = poseAt( model, clip, time )[ hips ].position;
					expect( Math.abs( position.x - start.x ), `${ time }` ).toBeLessThan( 1e-6 );
					expect( Math.abs( position.z - start.z ), `${ time }` ).toBeLessThan( 1e-6 );

				}

			} );

		}

	}

	it( 'caminar: pies y brazos alternados, y los brazos en pose T bajan a los costados', () => {

		const model = buildTPoseHumanoid( { twisted: true } );
		const clip = generateAnimation( model, 'caminar' );
		const quarter = poseAt( model, clip, clip.duration * 0.25 );
		const threeQuarters = poseAt( model, clip, clip.duration * 0.75 );
		// A 1/4 del ciclo, el pie izquierdo va adelante y el brazo derecho también (al revés que la pierna).
		expect( quarter.LeftFoot.position.z - quarter.RightFoot.position.z ).toBeGreaterThan( 0.2 );
		expect( quarter.RightHand.position.z - quarter.LeftHand.position.z ).toBeGreaterThan( 0.1 );
		expect( threeQuarters.RightFoot.position.z - threeQuarters.LeftFoot.position.z ).toBeGreaterThan( 0.2 );
		expect( threeQuarters.LeftHand.position.z - threeQuarters.RightHand.position.z ).toBeGreaterThan( 0.1 );
		// En pose T las manos están a la altura de los hombros; caminando, cuelgan a los costados.
		for ( let time = 0; time <= clip.duration; time += clip.duration / 6 ) {

			const pose = poseAt( model, clip, time );
			expect( pose.LeftHand.position.y ).toBeLessThan( pose.LeftUpperArm.position.y - 0.3 );
			expect( pose.RightHand.position.y ).toBeLessThan( pose.RightUpperArm.position.y - 0.3 );

		}

	} );

	it( 'se ve igual aunque cada hueso tenga sus ejes girados', () => {

		const straight = buildTPoseHumanoid( { twisted: false } );
		const twisted = buildTPoseHumanoid( { twisted: true } );
		for ( const generator of GENERATORS ) {

			const a = generateAnimation( straight, generator.id );
			const b = generateAnimation( twisted, generator.id );
			for ( const fraction of [ 0.1, 0.3, 0.6, 0.85 ] ) {

				const poseA = poseAt( straight, a, a.duration * fraction );
				const poseB = poseAt( twisted, b, b.duration * fraction );
				for ( const name of Object.keys( poseA ) ) {

					expect( poseB[ name ].position.distanceTo( poseA[ name ].position ), `${ generator.id } ${ name }` ).toBeLessThan( 1e-4 );

				}

			}

		}

	} );

	it( 'los deslizadores cambian la animación', () => {

		const model = buildTPoseHumanoid();
		const separation = ( params ) => {

			const clip = generateAnimation( model, 'caminar', params );
			const pose = poseAt( model, clip, clip.duration * 0.25 );
			return pose.LeftFoot.position.z - pose.RightFoot.position.z;

		};

		expect( separation( { stride: 1 } ) ).toBeGreaterThan( separation( { stride: 0 } ) * 1.8 );
		// Velocidad ×2: el ciclo dura la mitad.
		expect( generateAnimation( model, 'caminar', { speed: 2 } ).duration ).toBeCloseTo( generateAnimation( model, 'caminar' ).duration / 2, 6 );
		// Sin balanceo de brazos, las manos quedan quietas al caminar.
		const still = generateAnimation( model, 'caminar', { arms: 0 } );
		const a = poseAt( model, still, still.duration * 0.25 );
		const b = poseAt( model, still, still.duration * 0.75 );
		expect( Math.abs( a.LeftHand.position.z - b.LeftHand.position.z ) ).toBeLessThan( 0.02 );
		expect( defaultParams( 'correr' ) ).toEqual( { speed: 1, stride: 0.5, arms: 0.6, lean: 0.4 } );

	} );

	it( 'correr dobla más las rodillas y se inclina; respirar se mueve poco', () => {

		const model = buildTPoseHumanoid();
		const maxKnee = ( clip ) => {

			let max = 0;
			const track = clip.tracks.find( ( t ) => t.name === 'LeftLowerLeg.quaternion' );
			for ( let i = 0; i < track.times.length; i ++ ) {

				const q = new Quaternion().fromArray( track.values, i * 4 );
				max = Math.max( max, MathUtils.radToDeg( q.angleTo( new Quaternion() ) ) );

			}

			return max;

		};

		const walk = generateAnimation( model, 'caminar' );
		const run = generateAnimation( model, 'correr' );
		expect( maxKnee( run ) ).toBeGreaterThan( maxKnee( walk ) + 30 );
		const running = poseAt( model, run, 0 );
		expect( running.Head.position.z - running.Hips.position.z ).toBeGreaterThan( 0.05 );

		// Respirar: ningún hueso gira más de 10° (salvo los brazos, que bajan de la pose T).
		const breathe = generateAnimation( model, 'respirar' );
		for ( const track of breathe.tracks ) {

			if ( ! track.name.endsWith( '.quaternion' ) || /UpperArm/.test( track.name ) ) continue;
			const first = new Quaternion().fromArray( track.values, 0 );
			for ( let i = 1; i < track.times.length; i ++ ) {

				const q = new Quaternion().fromArray( track.values, i * 4 );
				expect( MathUtils.radToDeg( q.angleTo( first ) ), track.name ).toBeLessThan( 10 );

			}

		}

		expect( breathe.duration ).toBeCloseTo( 4, 6 );
		expect( breathe.tracks[ 0 ].times.length ).toBe( 4 * GENERATOR_FPS + 1 );

	} );

	for ( const [ who, make ] of [ [ 'R15', () => openSample( 'r15' ).model ], [ 'Mixamo', () => buildTPoseHumanoid( { twisted: true, prefix: 'mixamorig' } ) ] ] ) {

		it( `agacharse (${ who }): la cadera baja, las rodillas se doblan y los pies no se mueven del piso`, () => {

			const model = make();
			const clip = generateAnimation( model, 'agacharse', { depth: 1 } );
			const hips = boneOf( model, 'hips' );
			const feet = [ boneOf( model, 'leftFoot' ), boneOf( model, 'rightFoot' ) ];
			const rest = poseAt( model, clip, 0 );
			for ( let i = 0; i <= 12; i ++ ) {

				const pose = poseAt( model, clip, ( clip.duration * i ) / 12 );
				for ( const foot of feet ) {

					expect( pose[ foot ].position.distanceTo( rest[ foot ].position ), `${ foot } en ${ i }/12` ).toBeLessThan( 0.01 );

				}

			}

			// En el medio, agachado: la cadera bajó un 45 % del largo de las piernas y las rodillas se doblaron.
			const low = poseAt( model, clip, clip.duration / 2 );
			const legs = rest[ boneOf( model, 'leftUpperLeg' ) ].position.distanceTo( rest[ feet[ 0 ] ].position );
			expect( rest[ hips ].position.y - low[ hips ].position.y ).toBeCloseTo( 0.45 * legs, 3 );
			const knee = low[ boneOf( model, 'leftLowerLeg' ) ].quaternion.angleTo( rest[ boneOf( model, 'leftLowerLeg' ) ].quaternion );
			expect( MathUtils.radToDeg( knee ) ).toBeGreaterThan( 60 );

		} );

		it( `saltar (${ who }): pies apoyados al agacharse, en el aire arriba, y con altura 0 no sube`, () => {

			const model = make();
			const hips = boneOf( model, 'hips' );
			const foot = boneOf( model, 'leftFoot' );
			const clip = generateAnimation( model, 'saltar', { height: 1 } );
			const rest = poseAt( model, clip, 0 );
			const crouched = poseAt( model, clip, clip.duration * 0.25 );
			expect( crouched[ hips ].position.y ).toBeLessThan( rest[ hips ].position.y - 0.01 );
			expect( crouched[ foot ].position.distanceTo( rest[ foot ].position ) ).toBeLessThan( 0.01 );
			const top = poseAt( model, clip, clip.duration * 0.52 );
			expect( top[ hips ].position.y - rest[ hips ].position.y ).toBeGreaterThan( 0.1 );
			expect( top[ foot ].position.y - rest[ foot ].position.y ).toBeGreaterThan( 0.05 );
			// En el aire, los brazos van arriba (las manos por encima de los hombros).
			expect( top[ boneOf( model, 'leftHand' ) ].position.y ).toBeGreaterThan( top[ boneOf( model, 'leftUpperArm' ) ].position.y );

			// Para el salto del jugador en Roblox: con altura 0 la cadera nunca sube del reposo.
			const flat = generateAnimation( model, 'saltar', { height: 0 } );
			for ( let i = 0; i <= 26; i ++ ) {

				const pose = poseAt( model, flat, ( flat.duration * i ) / 26 );
				expect( pose[ hips ].position.y, `${ i }/26` ).toBeLessThanOrEqual( rest[ hips ].position.y + 1e-6 );

			}

		} );

		it( `caer (${ who }): los brazos quedan arriba todo el tiempo`, () => {

			const model = make();
			const clip = generateAnimation( model, 'caer' );
			for ( let i = 0; i <= 8; i ++ ) {

				const pose = poseAt( model, clip, ( clip.duration * i ) / 8 );
				for ( const side of [ 'left', 'right' ] ) {

					expect( pose[ boneOf( model, side + 'Hand' ) ].position.y, `${ side } ${ i }/8` )
						.toBeGreaterThan( pose[ boneOf( model, side + 'UpperArm' ) ].position.y );

				}

			}

		} );

	}

	it( 'sin el mapa de huesos completo explica qué hacer', () => {

		const model = buildTPoseHumanoid();
		delete model.boneMap.leftFoot;
		expect( () => generateAnimation( model, 'caminar' ) ).toThrow( UserError );
		expect( () => generateAnimation( model, 'caminar' ) ).toThrow( 'Primero completa el mapa de huesos' );

	} );

} );

describe( 'saludar, atacar y bailar', () => {

	for ( const [ who, model ] of characters() ) {

		it( `con ${ who }: la mano sube sobre la cabeza, el golpe va adelante y los brazos se turnan`, () => {

			const bone = ( key ) => boneOf( model, key );
			const wave = generateAnimation( model, 'saludar' );
			const start = poseAt( model, wave, 0 );
			const up = poseAt( model, wave, wave.duration / 2 );
			expect( up[ bone( 'rightHand' ) ].position.y ).toBeGreaterThan( up[ bone( 'head' ) ].position.y );
			expect( start[ bone( 'rightHand' ) ].position.y ).toBeLessThan( start[ bone( 'rightUpperArm' ) ].position.y );
			const arm = start[ bone( 'rightUpperArm' ) ].position.distanceTo( start[ bone( 'rightHand' ) ].position );

			// El golpe: la mano derecha va bien adelante del hombro, más que en la guardia.
			const punch = generateAnimation( model, 'atacar' );
			const forward = ( pose ) => pose[ bone( 'rightHand' ) ].position.z - pose[ bone( 'rightUpperArm' ) ].position.z;
			const guard = forward( poseAt( model, punch, 0 ) );
			const hit = forward( poseAt( model, punch, punch.duration / 2 ) );
			expect( hit ).toBeGreaterThan( 0.6 * arm );
			expect( hit ).toBeGreaterThan( guard + 0.2 * arm );

			// Bailar: primero arriba la mano izquierda, después la derecha.
			const dance = generateAnimation( model, 'bailar' );
			const height = ( pose, side ) => pose[ bone( side + 'Hand' ) ].position.y;
			const first = poseAt( model, dance, dance.duration / 4 );
			const second = poseAt( model, dance, ( 3 * dance.duration ) / 4 );
			expect( height( first, 'left' ) ).toBeGreaterThan( height( first, 'right' ) + 0.5 * arm );
			expect( height( second, 'right' ) ).toBeGreaterThan( height( second, 'left' ) + 0.5 * arm );

		} );

	}

} );
