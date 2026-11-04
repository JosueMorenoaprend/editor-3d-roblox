import { describe, expect, it } from 'vitest';
import { Quaternion } from 'three';
import { changeSpeed, combineClips, makeSeamless, trimClip } from '../../src/core/clipTools.js';
import { UserError } from '../../src/core/errors.js';
import { openSample } from './helpers.js';

const valueAt = ( clip, trackName, time ) => Array.from( clip.tracks.find( ( track ) => track.name === trackName ).createInterpolant().evaluate( time ) );
const expectClose = ( a, b, digits = 5 ) => a.forEach( ( value, i ) => expect( value, `${ i }` ).toBeCloseTo( b[ i ], digits ) );

describe( 'ajustar animaciones', () => {

	const { model } = openSample( 'r15' );
	const [ wave, walk, jump ] = model.clips;
	const LEG = 'LeftUpperLeg.quaternion';

	it( 'cambiar la velocidad: el doble de rápido dura la mitad y pasa por las mismas poses', () => {

		const fast = changeSpeed( walk, 2 );
		expect( fast.duration ).toBeCloseTo( walk.duration / 2, 6 );
		expect( fast.validate() ).toBe( true );
		for ( const time of [ 0.1, 0.33, 0.8 ] ) expectClose( valueAt( fast, LEG, time / 2 ), valueAt( walk, LEG, time ) );
		expect( () => changeSpeed( walk, 0 ) ).toThrow( UserError );

	} );

	it( 'recortar: queda el tramo elegido, empezando en 0', () => {

		const part = trimClip( walk, 0.25, 0.75 );
		expect( part.duration ).toBeCloseTo( 0.5, 6 );
		expect( part.validate() ).toBe( true );
		for ( const time of [ 0, 0.1, 0.25, 0.5 ] ) expectClose( valueAt( part, LEG, time ), valueAt( walk, LEG, time + 0.25 ) );
		expectClose( valueAt( part, 'HumanoidRootPart.position', 0.25 ), valueAt( walk, 'HumanoidRootPart.position', 0.5 ) );
		expect( () => trimClip( walk, 0.5, 0.5 ) ).toThrow( UserError );
		expect( () => trimClip( walk, NaN, 1 ) ).toThrow( UserError );

	} );

	it( 'repetir sin saltos: el último cuadro es igual al primero y el principio no cambia', () => {

		const open = trimClip( walk, 0, 0.6 ); // termina a mitad de paso
		const angle = ( a, b ) => new Quaternion().fromArray( a ).angleTo( new Quaternion().fromArray( b ) );
		expect( angle( valueAt( open, LEG, 0.6 ), valueAt( open, LEG, 0 ) ) ).toBeGreaterThan( 0.3 );
		const loop = makeSeamless( open );
		expect( loop.validate() ).toBe( true );
		for ( const track of loop.tracks ) expectClose( valueAt( loop, track.name, loop.duration ), valueAt( loop, track.name, 0 ) );
		expectClose( valueAt( loop, LEG, 0.2 ), valueAt( open, LEG, 0.2 ) );
		// Sin saltos: entre dos cuadros seguidos (1/30 s) el muslo nunca gira de golpe.
		for ( let time = 0; time < loop.duration; time += 1 / 30 ) {

			expect( angle( valueAt( loop, LEG, time ), valueAt( loop, LEG, Math.min( time + 1 / 30, loop.duration ) ) ), `${ time }` ).toBeLessThan( 0.25 );

		}

	} );

	it( 'combinar: una después de la otra, con una transición corta', () => {

		const both = combineClips( model, wave, jump );
		expect( both.name ).toBe( 'Saludar + Saltar' );
		expect( both.duration ).toBeCloseTo( 2 + 0.2 + 1.2, 6 );
		expect( both.validate() ).toBe( true );
		expectClose( valueAt( both, 'RightUpperArm.quaternion', 1 ), valueAt( wave, 'RightUpperArm.quaternion', 1 ) );
		expectClose( valueAt( both, LEG, 2.2 + 0.5 ), valueAt( jump, LEG, 0.5 ) );
		// Saludar no mueve las piernas: mientras saluda, quedan en reposo.
		expectClose( valueAt( both, LEG, 1 ), [ 0, 0, 0, 1 ] );

	} );

} );
