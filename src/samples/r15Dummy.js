// Muñeco humanoide tipo R15 hecho por código (sin licencias de terceros).
//
// - 16 huesos con los nombres de Roblox: HumanoidRootPart + las 15 partes del R15.
// - Una sola malla con esqueleto (SkinnedMesh): cada caja sigue a su hueso.
// - 3 animaciones: Saludar, Caminar (en el lugar) y Saltar.
// - Mira hacia +Z (el frente en glTF); su izquierda es +X. Mide 5,2 studs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { positionTrack, rotationTrack } from '../core/keyframes.js';
import { METERS_PER_STUD } from '../core/units.js';

const BLUE = 0x0d69ac;
const YELLOW = 0xf5cd30;
const GREEN = 0x4b974b;
const DARK = 0x2b2b2b;

// Partes del R15 (medidas en studs). `joint` es dónde gira el hueso (posición en el mundo);
// `box` es la caja que dibuja la parte: [ancho, alto, profundo] y su centro en el mundo.
const PARTS = [
	{ name: 'HumanoidRootPart', parent: null, joint: [ 0, 2.2, 0 ] },
	{ name: 'LowerTorso', parent: 'HumanoidRootPart', joint: [ 0, 2, 0 ], box: [ 2, 0.4, 1 ], center: [ 0, 2.2, 0 ], color: BLUE },
	{ name: 'UpperTorso', parent: 'LowerTorso', joint: [ 0, 2.4, 0 ], box: [ 2, 1.6, 1 ], center: [ 0, 3.2, 0 ], color: BLUE },
	{ name: 'Head', parent: 'UpperTorso', joint: [ 0, 4, 0 ], box: [ 1.2, 1.2, 1.2 ], center: [ 0, 4.6, 0 ], color: YELLOW },
	...limb( 'Left', 1 ),
	...limb( 'Right', - 1 ),
];

/** Brazo y pierna de un lado (side = 1: izquierda en +X; side = -1: derecha en -X). */
function limb( prefix, side ) {

	const arm = 1.5 * side;
	const leg = 0.5 * side;
	return [
		{ name: `${ prefix }UpperArm`, parent: 'UpperTorso', joint: [ arm, 3.8, 0 ], box: [ 1, 0.95, 1 ], center: [ arm, 3.525, 0 ], color: YELLOW },
		{ name: `${ prefix }LowerArm`, parent: `${ prefix }UpperArm`, joint: [ arm, 3.05, 0 ], box: [ 1, 0.8, 1 ], center: [ arm, 2.65, 0 ], color: YELLOW },
		{ name: `${ prefix }Hand`, parent: `${ prefix }LowerArm`, joint: [ arm, 2.25, 0 ], box: [ 1, 0.35, 1 ], center: [ arm, 2.075, 0 ], color: YELLOW },
		{ name: `${ prefix }UpperLeg`, parent: 'LowerTorso', joint: [ leg, 2, 0 ], box: [ 0.95, 0.85, 1 ], center: [ leg, 1.575, 0 ], color: GREEN },
		{ name: `${ prefix }LowerLeg`, parent: `${ prefix }UpperLeg`, joint: [ leg, 1.15, 0 ], box: [ 0.95, 0.85, 1 ], center: [ leg, 0.725, 0 ], color: GREEN },
		{ name: `${ prefix }Foot`, parent: `${ prefix }LowerLeg`, joint: [ leg, 0.3, 0 ], box: [ 0.95, 0.3, 1.2 ], center: [ leg, 0.15, 0.1 ], color: GREEN },
	];

}

// Ojos (para saber hacia dónde mira): cajitas oscuras pegadas a la cabeza.
const EYES = [ [ 0.25, 4.7, 0.62 ], [ - 0.25, 4.7, 0.62 ] ].map( ( center ) => ( {
	bone: 'Head', box: [ 0.15, 0.22, 0.04 ], center, color: DARK,
} ) );

/** Nombres de los 16 huesos, en orden. */
export const R15_BONE_NAMES = PARTS.map( ( part ) => part.name );

/**
 * Crea el muñeco. Devuelve un objeto con la misma forma que el resultado de GLTFLoader.
 * @returns {{ scene: THREE.Group, animations: THREE.AnimationClip[] }}
 */
export function createR15Dummy() {

	const s = METERS_PER_STUD;

	// 1. Huesos en su posición de reposo.
	const bones = new Map();
	for ( const part of PARTS ) {

		const bone = new THREE.Bone();
		bone.name = part.name;
		const parent = part.parent ? PARTS.find( ( p ) => p.name === part.parent ) : null;
		const origin = parent ? parent.joint : [ 0, 0, 0 ];
		bone.position.set(
			( part.joint[ 0 ] - origin[ 0 ] ) * s,
			( part.joint[ 1 ] - origin[ 1 ] ) * s,
			( part.joint[ 2 ] - origin[ 2 ] ) * s,
		);
		if ( parent ) bones.get( parent.name ).add( bone );
		bones.set( part.name, bone );

	}

	const boneList = [ ...bones.values() ];
	const boneIndex = ( name ) => boneList.findIndex( ( bone ) => bone.name === name );

	// 2. Una caja por parte, todas unidas en una malla. Cada vértice sigue a un solo hueso.
	const pieces = [
		...PARTS.filter( ( part ) => part.box ).map( ( part ) => ( { ...part, bone: part.name } ) ),
		...EYES,
	].map( ( piece ) => {

		const [ w, h, d ] = piece.box;
		const geometry = new THREE.BoxGeometry( w * s, h * s, d * s );
		geometry.translate( piece.center[ 0 ] * s, piece.center[ 1 ] * s, piece.center[ 2 ] * s );
		const count = geometry.attributes.position.count;
		const color = new THREE.Color( piece.color );
		const colors = new Float32Array( count * 3 );
		const skinIndex = new Uint16Array( count * 4 );
		const skinWeight = new Float32Array( count * 4 );
		const index = boneIndex( piece.bone );
		for ( let i = 0; i < count; i ++ ) {

			color.toArray( colors, i * 3 );
			skinIndex[ i * 4 ] = index;
			skinWeight[ i * 4 ] = 1;

		}

		geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
		geometry.setAttribute( 'skinIndex', new THREE.BufferAttribute( skinIndex, 4 ) );
		geometry.setAttribute( 'skinWeight', new THREE.BufferAttribute( skinWeight, 4 ) );
		return geometry;

	} );

	const geometry = mergeGeometries( pieces, false );
	for ( const piece of pieces ) piece.dispose();
	geometry.name = 'Cuerpo';

	const material = new THREE.MeshStandardMaterial( { vertexColors: true, roughness: 0.6 } );
	material.name = 'Plastico';
	const mesh = new THREE.SkinnedMesh( geometry, material );
	mesh.name = 'Cuerpo';

	// 3. Armado: la malla y el hueso raíz cuelgan del mismo nodo (como en un GLB de Tripo o Roblox).
	const rig = new THREE.Group();
	rig.name = 'MunecoR15';
	rig.add( mesh, bones.get( 'HumanoidRootPart' ) );
	rig.updateMatrixWorld( true );
	mesh.bind( new THREE.Skeleton( boneList ) );

	const scene = new THREE.Group();
	scene.add( rig );
	return { scene, animations: createAnimations( bones.get( 'HumanoidRootPart' ).position ) };

}

/** Las 3 animaciones del muñeco. `rootRest` es la posición de reposo de HumanoidRootPart. */
function createAnimations( rootRest ) {

	const rest = rootRest.toArray();
	const lift = ( dy ) => [ rest[ 0 ], rest[ 1 ] + dy, rest[ 2 ] ];

	// Saludar: sube el brazo derecho y mueve el antebrazo de lado a lado.
	const wave = new THREE.AnimationClip( 'Saludar', 2, [
		rotationTrack( 'RightUpperArm', [ 0, 0.3, 1.7, 2 ], [ [ 0, 0, 0 ], [ 0, 0, - 160 ], [ 0, 0, - 160 ], [ 0, 0, 0 ] ] ),
		rotationTrack( 'RightLowerArm', [ 0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.7, 2 ],
			[ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 25 ], [ 0, 0, - 25 ], [ 0, 0, 25 ], [ 0, 0, - 25 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ] ),
		rotationTrack( 'Head', [ 0, 0.3, 1.7, 2 ], [ [ 0, 0, 0 ], [ 0, 0, 8 ], [ 0, 0, 8 ], [ 0, 0, 0 ] ] ),
	] );

	// Caminar en el lugar (1 s, se repite sin saltos): piernas y brazos alternados.
	const t = [ 0, 0.25, 0.5, 0.75, 1 ];
	const walk = new THREE.AnimationClip( 'Caminar', 1, [
		rotationTrack( 'LeftUpperLeg', t, [ [ - 30, 0, 0 ], [ 0, 0, 0 ], [ 30, 0, 0 ], [ 0, 0, 0 ], [ - 30, 0, 0 ] ] ),
		rotationTrack( 'RightUpperLeg', t, [ [ 30, 0, 0 ], [ 0, 0, 0 ], [ - 30, 0, 0 ], [ 0, 0, 0 ], [ 30, 0, 0 ] ] ),
		rotationTrack( 'LeftLowerLeg', t, [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 10, 0, 0 ], [ 45, 0, 0 ], [ 0, 0, 0 ] ] ),
		rotationTrack( 'RightLowerLeg', t, [ [ 10, 0, 0 ], [ 45, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ], [ 10, 0, 0 ] ] ),
		rotationTrack( 'LeftUpperArm', t, [ [ 20, 0, 0 ], [ 0, 0, 0 ], [ - 20, 0, 0 ], [ 0, 0, 0 ], [ 20, 0, 0 ] ] ),
		rotationTrack( 'RightUpperArm', t, [ [ - 20, 0, 0 ], [ 0, 0, 0 ], [ 20, 0, 0 ], [ 0, 0, 0 ], [ - 20, 0, 0 ] ] ),
		positionTrack( 'HumanoidRootPart', t, [ lift( 0 ), lift( 0.02 ), lift( 0 ), lift( 0.02 ), lift( 0 ) ] ),
	] );

	// Saltar (una vez): se agacha, sube, cae y amortigua.
	const j = [ 0, 0.25, 0.4, 0.6, 0.95, 1.05, 1.2 ];
	const legs = ( upper, lower ) => [ upper.map( ( x ) => [ x, 0, 0 ] ), lower.map( ( x ) => [ x, 0, 0 ] ) ];
	const [ thigh, shin ] = legs( [ 0, - 40, 0, - 15, 0, - 20, 0 ], [ 0, 70, 0, 25, 0, 35, 0 ] );
	const arms = [ 0, 25, - 150, - 120, - 20, 0, 0 ].map( ( x ) => [ x, 0, 0 ] );
	const jump = new THREE.AnimationClip( 'Saltar', 1.2, [
		positionTrack( 'HumanoidRootPart', j, [ lift( 0 ), lift( - 0.08 ), lift( 0.1 ), lift( 0.45 ), lift( 0 ), lift( - 0.05 ), lift( 0 ) ] ),
		rotationTrack( 'LeftUpperLeg', j, thigh ),
		rotationTrack( 'RightUpperLeg', j, thigh ),
		rotationTrack( 'LeftLowerLeg', j, shin ),
		rotationTrack( 'RightLowerLeg', j, shin ),
		rotationTrack( 'LeftUpperArm', j, arms ),
		rotationTrack( 'RightUpperArm', j, arms ),
	] );

	return [ wave, walk, jump ];

}
