import { describe, expect, it } from 'vitest';
import { AnimationClip, Bone, Group, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three';
import { AnimationController } from '../../src/core/animation.js';
import { generateAnimation } from '../../src/core/generators.js';
import { makeInPlace, rootMotion } from '../../src/core/inPlace.js';
import { LoadedModel } from '../../src/core/model.js';
import { ClipSampler } from '../../src/core/skeletonPose.js';
import { buildTPoseHumanoid, openSample } from './helpers.js';

/** Posición de un hueso (en el espacio del modelo) en un momento de la animación. */
function positionAt( model, clip, name, time ) {

	const sampler = new ClipSampler( model.container, clip );
	sampler.apply( time );
	model.container.updateMatrixWorld( true );
	const bone = model.container.getObjectByName( name );
	const position = model.container.worldToLocal( bone.getWorldPosition( new Vector3() ) );
	sampler.restore();
	return position;

}

/** El R15 con una animación que avanza: la cadera 2 m adelante (con rebote) y su raíz 0,5 m al costado. */
function walkingForward() {

	const { model } = openSample( 'r15' );
	const lower = model.container.getObjectByName( 'LowerTorso' ).position;
	const root = model.container.getObjectByName( 'HumanoidRootPart' ).position;
	const times = [ 0, 0.5, 1 ];
	const clip = new AnimationClip( 'Avanzar', 1, [
		new VectorKeyframeTrack( 'LowerTorso.position', times, [
			lower.x, lower.y, lower.z, lower.x, lower.y + 0.05, lower.z + 1, lower.x, lower.y, lower.z + 2,
		] ),
		new VectorKeyframeTrack( 'HumanoidRootPart.position', times, [
			root.x, root.y, root.z, root.x + 0.25, root.y, root.z, root.x + 0.5, root.y, root.z,
		] ),
		new QuaternionKeyframeTrack( 'LeftUpperArm.quaternion', [ 0, 1 ], [ 0, 0, 0, 1, 0, 0, 0.3827, 0.9239 ] ),
	] );
	return { model, clip };

}

describe( 'animaciones en el lugar', () => {

	it( 'mide y quita el avance de la cadera y de su hueso raíz, sin tocar la altura ni lo demás', () => {

		const { model, clip } = walkingForward();
		const restLower = model.container.getObjectByName( 'LowerTorso' ).position.clone();
		const motion = rootMotion( model, clip );
		expect( motion.end ).toBeCloseTo( Math.hypot( 2, 0.5 ), 4 );
		expect( motion.distance ).toBeCloseTo( Math.hypot( 2, 0.5 ), 4 );

		const still = makeInPlace( model, clip );
		expect( still.name ).toBe( 'Avanzar' );
		expect( still.duration ).toBe( 1 );
		expect( still.validate() ).toBe( true );
		expect( rootMotion( model, still ).distance ).toBeLessThan( 1e-6 );
		// El rebote (altura) sigue igual.
		expect( positionAt( model, still, 'LowerTorso', 0.5 ).y ).toBeCloseTo( positionAt( model, clip, 'LowerTorso', 0.5 ).y, 6 );
		// El brazo no cambia, y la animación original tampoco.
		expect( [ ...still.tracks[ 2 ].values ] ).toEqual( [ ...clip.tracks[ 2 ].values ] );
		expect( rootMotion( model, clip ).end ).toBeCloseTo( Math.hypot( 2, 0.5 ), 4 );
		// El modelo quedó como estaba.
		expect( model.container.getObjectByName( 'LowerTorso' ).position.equals( restLower ) ).toBe( true );

	} );

	it( 'funciona con un esqueleto acostado y en centímetros (como al convertir de FBX)', () => {

		// Armature girado -90° en X y en centímetros: el "arriba" del personaje es +Z local y su "adelante", -Y.
		const scene = new Group();
		const armature = new Group();
		armature.name = 'Armature';
		armature.quaternion.setFromAxisAngle( new Vector3( 1, 0, 0 ), - Math.PI / 2 );
		armature.scale.setScalar( 0.01 );
		const hips = new Bone();
		hips.name = 'Hips';
		hips.position.set( 0, 0, 100 );
		armature.add( hips );
		scene.add( armature );
		const model = new LoadedModel( { scene, animations: [] }, 'acostado.glb' );
		model.boneMap = { hips: 'Hips' };

		// Avanza 2 m (−Y local) y rebota 10 cm (+Z local) a la mitad.
		const clip = new AnimationClip( 'Correr', 1, [ new VectorKeyframeTrack( 'Hips.position', [ 0, 0.5, 1 ], [ 0, 0, 100, 0, - 100, 110, 0, - 200, 100 ] ) ] );
		expect( rootMotion( model, clip ).end ).toBeCloseTo( 2, 5 );
		const still = makeInPlace( model, clip );
		expect( rootMotion( model, still ).distance ).toBeLessThan( 1e-6 );
		expect( positionAt( model, still, 'Hips', 0.5 ).y ).toBeCloseTo( 1.1, 6 );

	} );

	it( 'en pistas "cubic spline" (glTF) fija los valores y quita el avance de las tangentes', () => {

		const { model } = openSample( 'r15' );
		const lower = model.container.getObjectByName( 'LowerTorso' ).position;
		// Por cuadro: tangente de entrada, valor, tangente de salida (9 números).
		const values = [
			0, 0, 1, lower.x, lower.y, lower.z, 0, 0.1, 1,
			0, 0, 1, lower.x, lower.y + 0.1, lower.z + 2, 0.5, 0, 1,
		];
		const clip = new AnimationClip( 'Spline', 1, [ new VectorKeyframeTrack( 'LowerTorso.position', [ 0, 1 ], values ) ] );
		const still = makeInPlace( model, clip ).tracks[ 0 ].values;
		// El valor del segundo cuadro vuelve a X/Z del primero; la Y queda.
		expect( still[ 12 ] ).toBeCloseTo( lower.x, 6 );
		expect( still[ 13 ] ).toBeCloseTo( lower.y + 0.1, 6 );
		expect( still[ 14 ] ).toBeCloseTo( lower.z, 6 );
		// Tangentes: sin X ni Z; la Y queda.
		expect( [ still[ 0 ], still[ 2 ], still[ 15 ], still[ 17 ] ] ).toEqual( [ 0, 0, 0, 0 ] );
		expect( still[ 7 ] ).toBeCloseTo( 0.1, 6 );

	} );

	it( 'las animaciones generadas ya están en el lugar', () => {

		const model = buildTPoseHumanoid();
		for ( const id of [ 'caminar', 'correr', 'saltar' ] ) {

			expect( rootMotion( model, generateAnimation( model, id ) ).distance, id ).toBeLessThan( 1e-6 );

		}

	} );

	it( 'el reproductor cambia la animación por la nueva y la deja elegida', () => {

		const { model, clip } = walkingForward();
		model.clips.push( clip );
		const anim = new AnimationController();
		anim.setModel( model );
		anim.select( 3 );
		anim.play();
		const still = makeInPlace( model, clip );
		anim.replaceClip( clip, still );
		expect( model.clips[ 3 ] ).toBe( still );
		expect( anim.selectedIndex ).toBe( 3 );
		expect( anim.isPlaying ).toBe( true );
		anim.update( 0.6 );
		// Suena la nueva: la cadera no avanzó.
		const lower = model.container.getObjectByName( 'LowerTorso' );
		const restZ = model.restPose.get( lower ).position.z;
		expect( lower.position.z ).toBeCloseTo( restZ, 6 );

	} );

} );
