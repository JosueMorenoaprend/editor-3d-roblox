import { describe, expect, it } from 'vitest';
import {
	HUMANOID_BONES, REQUIRED_BONES, boneLabel, cleanBoneMap, humanoidBone, listBones, mappedParentKey, mirrorKey,
	sameBoneMap, validateBoneMap,
} from '../../src/core/boneMap.js';
import { openSample } from './helpers.js';

/** Mapa a mano para el muñeco R15 de ejemplo (no tiene columna ni cuello separados). */
const R15_MAP = {
	hips: 'LowerTorso',
	chest: 'UpperTorso',
	head: 'Head',
	leftUpperArm: 'LeftUpperArm', leftLowerArm: 'LeftLowerArm', leftHand: 'LeftHand',
	rightUpperArm: 'RightUpperArm', rightLowerArm: 'RightLowerArm', rightHand: 'RightHand',
	leftUpperLeg: 'LeftUpperLeg', leftLowerLeg: 'LeftLowerLeg', leftFoot: 'LeftFoot',
	rightUpperLeg: 'RightUpperLeg', rightLowerLeg: 'RightLowerLeg', rightFoot: 'RightFoot',
};

describe( 'mapa de huesos estándar', () => {

	it( 'tiene los huesos que pidió el usuario, con nombres en español', () => {

		const keys = HUMANOID_BONES.map( ( bone ) => bone.key );
		for ( const key of [ 'hips', 'spine', 'chest', 'neck', 'head' ] ) expect( keys ).toContain( key );
		for ( const side of [ 'left', 'right' ] ) {

			for ( const part of [ 'UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot' ] ) {

				expect( keys ).toContain( side + part );

			}

		}

		expect( new Set( keys ).size ).toBe( keys.length );
		expect( boneLabel( 'hips' ) ).toBe( 'Cadera' );
		expect( boneLabel( 'leftUpperArm' ) ).toBe( 'Brazo izquierdo' );
		expect( boneLabel( 'rightHand' ) ).toBe( 'Mano derecha' );
		expect( boneLabel( 'leftLowerLeg' ) ).toBe( 'Pierna izquierda' );
		// Cada padre existe y aparece antes que su hijo.
		HUMANOID_BONES.forEach( ( bone, i ) => {

			if ( bone.parent ) expect( HUMANOID_BONES.findIndex( ( b ) => b.key === bone.parent ) ).toBeLessThan( i );

		} );

	} );

	it( 'columna, cuello, hombros y dedos son opcionales (el R15 no los tiene)', () => {

		expect( REQUIRED_BONES ).toHaveLength( 15 );
		for ( const key of [ 'spine', 'neck', 'leftShoulder', 'rightToes' ] ) expect( humanoidBone( key ).required ).toBe( false );

	} );

	it( 'refleja izquierda ↔ derecha', () => {

		expect( mirrorKey( 'leftHand' ) ).toBe( 'rightHand' );
		expect( mirrorKey( 'rightUpperLeg' ) ).toBe( 'leftUpperLeg' );
		expect( mirrorKey( 'head' ) ).toBe( 'head' );
		for ( const bone of HUMANOID_BONES ) {

			const mirrored = humanoidBone( mirrorKey( bone.key ) );
			expect( mirrored ).toBeDefined();
			expect( mirrored.required ).toBe( bone.required );

		}

	} );

	it( 'salta los huesos opcionales que faltan al buscar el padre', () => {

		expect( mappedParentKey( R15_MAP, 'chest' ) ).toBe( 'hips' );
		expect( mappedParentKey( R15_MAP, 'head' ) ).toBe( 'chest' );
		expect( mappedParentKey( R15_MAP, 'leftUpperArm' ) ).toBe( 'chest' );
		expect( mappedParentKey( { ...R15_MAP, spine: 'X' }, 'chest' ) ).toBe( 'spine' );

	} );

	it( 'un mapa correcto del muñeco R15 es válido', () => {

		const { model } = openSample( 'r15' );
		const result = validateBoneMap( R15_MAP, model.container );
		expect( result.problems ).toEqual( [] );
		expect( result.ok ).toBe( true );

	} );

	it( 'explica en español lo que falta o está mal', () => {

		const { model } = openSample( 'r15' );
		const { leftHand, ...withoutHand } = R15_MAP;
		void leftHand;
		const result = validateBoneMap( {
			...withoutHand,
			head: 'Cabezota', // no existe
			rightFoot: 'RightLowerLeg', // usado dos veces
			leftLowerArm: 'LeftUpperLeg', // fuera de su lugar
		}, model.container );
		expect( result.ok ).toBe( false );
		expect( result.missing ).toEqual( [ 'leftHand' ] );
		const text = result.problems.join( '\n' );
		expect( text ).toContain( 'Falta elegir qué hueso es «Mano izquierda»' );
		expect( text ).toContain( 'no tiene un hueso llamado "Cabezota"' );
		expect( text ).toContain( 'está elegido dos veces' );
		expect( text ).toContain( '«Antebrazo izquierdo» ("LeftUpperLeg") debería estar dentro de «Brazo izquierdo»' );

		// Cada problema queda también en la clave que hay que corregir (para marcar su fila).
		expect( result.issues.leftHand ).toContain( 'Falta elegir' );
		expect( result.issues.head ).toContain( 'Cabezota' );
		expect( result.issues.rightLowerLeg ).toContain( 'elegido dos veces' );
		expect( result.issues.rightFoot ).toContain( 'elegido dos veces' );
		// "LeftUpperLeg" también es el muslo: su primer problema es estar elegido dos veces.
		expect( result.issues.leftLowerArm ).toContain( 'elegido dos veces' );
		expect( result.issues.leftUpperLeg ).toContain( 'elegido dos veces' );
		expect( result.issues.hips ).toBeUndefined();
		const misplaced = validateBoneMap( { ...R15_MAP, leftHand: 'RightHand', rightHand: 'LeftHand' }, model.container );
		expect( misplaced.issues.leftHand ).toContain( '«Mano izquierda» ("RightHand") debería estar dentro de «Antebrazo izquierdo»' );

	} );

	it( 'lista los huesos del modelo en orden, con su profundidad', () => {

		const { model } = openSample( 'r15' );
		const bones = listBones( model.container );
		expect( bones ).toHaveLength( 16 );
		expect( bones[ 0 ] ).toMatchObject( { name: 'HumanoidRootPart', depth: 0 } );
		expect( bones[ 1 ] ).toMatchObject( { name: 'LowerTorso', depth: 1 } );
		expect( bones.find( ( b ) => b.name === 'LeftHand' ).depth ).toBe( 5 );

	} );

	it( 'limpia un mapa guardado: solo claves estándar y huesos que existen', () => {

		const { model } = openSample( 'r15' );
		const { head, leftHand, ...expected } = R15_MAP;
		void head;
		void leftHand;
		expect( cleanBoneMap( { ...R15_MAP, head: 'Cabezota', cola: 'Head', leftHand: 42 }, model.container ) ).toEqual( expected );
		expect( cleanBoneMap( null, model.container ) ).toEqual( {} );
		expect( cleanBoneMap( 'roto', model.container ) ).toEqual( {} );

	} );

	it( 'compara dos mapas sin importar el orden ni las claves vacías', () => {

		expect( sameBoneMap( R15_MAP, { ...R15_MAP } ) ).toBe( true );
		expect( sameBoneMap( R15_MAP, { ...R15_MAP, spine: '' } ) ).toBe( true );
		expect( sameBoneMap( R15_MAP, { ...R15_MAP, head: 'LowerTorso' } ) ).toBe( false );

	} );

} );
