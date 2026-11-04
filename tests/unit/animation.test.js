import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { AnimationController } from '../../src/core/animation.js';
import { openSample } from './helpers.js';

describe( 'la pose de un editor cuando no suena nada (setIdlePose)', () => {

	it( 'vuelve después de detener, exportar o una vista previa; las animaciones parten del reposo', async () => {

		const { model } = openSample( 'r15' );
		const anim = new AnimationController();
		anim.setModel( model );
		const arm = model.container.getObjectByName( 'LeftUpperArm' );
		const raised = new Quaternion().setFromAxisAngle( new Vector3( 0, 0, 1 ), 1.2 );
		const isRaised = () => arm.quaternion.angleTo( raised ) < 1e-6;
		const atRest = () => arm.quaternion.equals( new Quaternion() );

		// Como el editor de keyframes: el brazo izquierdo levantado (sin keyframe).
		anim.setIdlePose( () => arm.quaternion.copy( raised ) );
		arm.quaternion.copy( raised );

		// Detener (lo hacen Exportar, Guardar proyecto y "Agregar animación") no la borra.
		anim.stop();
		expect( isRaised() ).toBe( true );

		// Exportar o autoguardar: en reposo mientras dura; después vuelve.
		let during = null;
		await anim.atRestPose( async () => {

			during = atRest();

		} );
		expect( during ).toBe( true );
		expect( isRaised() ).toBe( true );

		// "Saludar" no mueve el brazo izquierdo: se ve sobre el reposo, no sobre la pose del editor.
		anim.select( 0 );
		anim.play();
		anim.update( 0.5 );
		expect( atRest() ).toBe( true );
		anim.stop();
		expect( isRaised() ).toBe( true );

		// En pausa a mitad de camino (moviendo el tiempo), también desde el reposo; al exportar, vuelve ahí.
		anim.seek( 1 );
		expect( atRest() ).toBe( true );
		await anim.atRestPose( async () => {} );
		expect( atRest() ).toBe( true );
		expect( model.container.getObjectByName( 'RightUpperArm' ).quaternion.equals( new Quaternion() ) ).toBe( false );
		anim.stop();
		expect( isRaised() ).toBe( true );

		// Una vista previa que termina sola.
		anim.playPreview( model.clips[ 2 ] );
		expect( anim.previewing ).toBe( true );
		anim.update( 5 );
		expect( anim.previewing ).toBe( false );
		expect( isRaised() ).toBe( true );

		// Sin editor, detener vuelve al reposo, como siempre.
		anim.setIdlePose( null );
		anim.stop();
		expect( atRest() ).toBe( true );

	} );

} );
