import { describe, expect, it } from 'vitest';
import { Bone, Group } from 'three';
import { classifyBoneName, detectBoneMap, guessSkeletonKind, tokenize } from '../../src/core/boneDetect.js';
import { openSample } from './helpers.js';

// Esqueleto humanoide de prueba en pose T (metros). Cada papel puede faltar: entonces sus hijos
// cuelgan del primer padre de la lista que sí exista. El personaje mira a +Z: su izquierda es +X.
const LAYOUT = [
	[ 'root', [], [ 0, 0, 0 ] ],
	[ 'hips', [ 'root' ], [ 0, 1, 0 ] ],
	[ 'pelvis', [ 'hips' ], [ 0, 0.98, 0 ] ],
	[ 'spine', [ 'hips' ], [ 0, 1.1, 0 ] ],
	[ 'spine1', [ 'spine', 'hips' ], [ 0, 1.2, 0 ] ],
	[ 'chest', [ 'spine1', 'spine', 'hips' ], [ 0, 1.35, 0 ] ],
	[ 'upperChest', [ 'chest' ], [ 0, 1.42, 0 ] ],
	[ 'neck', [ 'upperChest', 'chest' ], [ 0, 1.5, 0 ] ],
	[ 'head', [ 'neck', 'upperChest', 'chest' ], [ 0, 1.6, 0 ] ],
	[ 'headEnd', [ 'head' ], [ 0, 1.8, 0 ] ],
	...[ [ 'left', 1 ], [ 'right', - 1 ] ].flatMap( ( [ s, x ] ) => [
		[ `${ s }Shoulder`, [ 'upperChest', 'chest' ], [ 0.05 * x, 1.45, 0 ] ],
		[ `${ s }UpperArm`, [ `${ s }Shoulder`, 'upperChest', 'chest' ], [ 0.15 * x, 1.45, 0 ] ],
		[ `${ s }ArmTwist`, [ `${ s }UpperArm` ], [ 0.3 * x, 1.45, 0 ] ],
		[ `${ s }LowerArm`, [ `${ s }UpperArm` ], [ 0.4 * x, 1.45, 0 ] ],
		[ `${ s }Hand`, [ `${ s }LowerArm` ], [ 0.65 * x, 1.45, 0 ] ],
		[ `${ s }Finger`, [ `${ s }Hand` ], [ 0.72 * x, 1.45, 0 ] ],
		[ `${ s }UpperLeg`, [ 'pelvis', 'hips' ], [ 0.1 * x, 0.95, 0 ] ],
		[ `${ s }LowerLeg`, [ `${ s }UpperLeg` ], [ 0.1 * x, 0.5, 0 ] ],
		[ `${ s }Foot`, [ `${ s }LowerLeg` ], [ 0.1 * x, 0.08, 0 ] ],
		[ `${ s }Toes`, [ `${ s }Foot` ], [ 0.1 * x, 0.02, 0.12 ] ],
	] ),
];

/** Construye un esqueleto con los nombres de una convención ({ papel: nombre }). */
function buildSkeleton( names ) {

	const root = new Group();
	const made = new Map();
	for ( const [ role, parents, position ] of LAYOUT ) {

		if ( ! names[ role ] ) continue;
		const bone = new Bone();
		bone.name = names[ role ];
		const parentRole = parents.find( ( p ) => made.has( p ) );
		const parent = parentRole ? made.get( parentRole ) : null;
		const origin = parent ? parent.userData.world : [ 0, 0, 0 ];
		bone.position.set( position[ 0 ] - origin[ 0 ], position[ 1 ] - origin[ 1 ], position[ 2 ] - origin[ 2 ] );
		bone.userData.world = position;
		( parent || root ).add( bone );
		made.set( role, bone );

	}

	return root;

}

/** Mapa esperado: el pecho es donde se unen los brazos (upperChest si existe). */
function expectedMap( names ) {

	const map = {};
	const put = ( key, role ) => names[ role ] && ( map[ key ] = names[ role ] );
	put( 'hips', 'hips' );
	put( 'spine', 'spine' );
	map.chest = names.upperChest || names.chest;
	put( 'neck', 'neck' );
	put( 'head', 'head' );
	for ( const s of [ 'left', 'right' ] ) {

		for ( const part of [ 'Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes' ] ) put( s + part, s + part );

	}

	return map;

}

/** Nombres de una convención con lados L/R (mismo nombre con "Left"/"Right" u otra marca). */
function sides( pattern ) {

	const names = {};
	for ( const [ s, mark ] of [ [ 'left', 'L' ], [ 'right', 'R' ] ] ) {

		for ( const [ part, name ] of Object.entries( pattern ) ) {

			names[ s + part ] = name.replaceAll( '{Side}', s === 'left' ? 'Left' : 'Right' ).replaceAll( '{S}', mark ).replaceAll( '{s}', mark.toLowerCase() );

		}

	}

	return names;

}

// Nombres tal como quedan DESPUÉS de abrir el archivo con three.js (sin ":" ni puntos ni espacios).
const CONVENTIONS = {
	'Mixamo': {
		hips: 'mixamorigHips', spine: 'mixamorigSpine', spine1: 'mixamorigSpine1', chest: 'mixamorigSpine2',
		neck: 'mixamorigNeck', head: 'mixamorigHead', headEnd: 'mixamorigHeadTop_End',
		...sides( {
			Shoulder: 'mixamorig{Side}Shoulder', UpperArm: 'mixamorig{Side}Arm', LowerArm: 'mixamorig{Side}ForeArm',
			Hand: 'mixamorig{Side}Hand', Finger: 'mixamorig{Side}HandIndex1', UpperLeg: 'mixamorig{Side}UpLeg',
			LowerLeg: 'mixamorig{Side}Leg', Foot: 'mixamorig{Side}Foot', Toes: 'mixamorig{Side}ToeBase',
		} ),
	},
	'Unreal': {
		root: 'root', hips: 'pelvis', spine: 'spine_01', spine1: 'spine_02', chest: 'spine_03', neck: 'neck_01', head: 'head',
		...sides( {
			Shoulder: 'clavicle_{s}', UpperArm: 'upperarm_{s}', ArmTwist: 'upperarm_twist_01_{s}', LowerArm: 'lowerarm_{s}',
			Hand: 'hand_{s}', Finger: 'index_01_{s}', UpperLeg: 'thigh_{s}', LowerLeg: 'calf_{s}', Foot: 'foot_{s}', Toes: 'ball_{s}',
		} ),
	},
	'Unity / VRM': {
		hips: 'Hips', spine: 'Spine', chest: 'Chest', upperChest: 'UpperChest', neck: 'Neck', head: 'Head',
		...sides( {
			Shoulder: '{Side}Shoulder', UpperArm: '{Side}UpperArm', LowerArm: '{Side}LowerArm', Hand: '{Side}Hand',
			UpperLeg: '{Side}UpperLeg', LowerLeg: '{Side}LowerLeg', Foot: '{Side}Foot', Toes: '{Side}Toes',
		} ),
	},
	'VRoid / VRM': {
		hips: 'J_Bip_C_Hips', spine: 'J_Bip_C_Spine', chest: 'J_Bip_C_Chest', upperChest: 'J_Bip_C_UpperChest',
		neck: 'J_Bip_C_Neck', head: 'J_Bip_C_Head',
		...sides( {
			Shoulder: 'J_Bip_{S}_Shoulder', UpperArm: 'J_Bip_{S}_UpperArm', LowerArm: 'J_Bip_{S}_LowerArm', Hand: 'J_Bip_{S}_Hand',
			Finger: 'J_Bip_{S}_Index1', UpperLeg: 'J_Bip_{S}_UpperLeg', LowerLeg: 'J_Bip_{S}_LowerLeg', Foot: 'J_Bip_{S}_Foot',
			Toes: 'J_Bip_{S}_ToeBase',
		} ),
	},
	'ActorCore / Character Creator': {
		root: 'CC_Base_BoneRoot', hips: 'CC_Base_Hip', pelvis: 'CC_Base_Pelvis', spine: 'CC_Base_Waist', spine1: 'CC_Base_Spine01',
		chest: 'CC_Base_Spine02', neck: 'CC_Base_NeckTwist01', head: 'CC_Base_Head',
		...sides( {
			Shoulder: 'CC_Base_{S}_Clavicle', UpperArm: 'CC_Base_{S}_Upperarm', LowerArm: 'CC_Base_{S}_Forearm', Hand: 'CC_Base_{S}_Hand',
			UpperLeg: 'CC_Base_{S}_Thigh', LowerLeg: 'CC_Base_{S}_Calf', Foot: 'CC_Base_{S}_Foot', Toes: 'CC_Base_{S}_ToeBase',
		} ),
	},
	'3ds Max (Biped)': {
		root: 'Bip01', hips: 'Bip01_Pelvis', spine: 'Bip01_Spine', spine1: 'Bip01_Spine1', chest: 'Bip01_Spine2',
		neck: 'Bip01_Neck', head: 'Bip01_Head', headEnd: 'Bip01_HeadNub',
		...sides( {
			Shoulder: 'Bip01_{S}_Clavicle', UpperArm: 'Bip01_{S}_UpperArm', LowerArm: 'Bip01_{S}_Forearm', Hand: 'Bip01_{S}_Hand',
			Finger: 'Bip01_{S}_Finger0', UpperLeg: 'Bip01_{S}_Thigh', LowerLeg: 'Bip01_{S}_Calf', Foot: 'Bip01_{S}_Foot',
			Toes: 'Bip01_{S}_Toe0',
		} ),
	},
};

describe( 'detectar el mapa de huesos', () => {

	for ( const [ kind, names ] of Object.entries( CONVENTIONS ) ) {

		it( `${ kind }: reconoce todos los huesos y el tipo de esqueleto`, () => {

			const result = detectBoneMap( buildSkeleton( names ) );
			expect( result.problems ).toEqual( [] );
			expect( result.ok ).toBe( true );
			expect( result.boneMap ).toEqual( expectedMap( names ) );
			expect( result.kind ).toBe( kind );

		} );

	}

	it( 'Roblox R15 (el muñeco de ejemplo): sin columna ni cuello, y es válido', () => {

		const { model } = openSample( 'r15' );
		const result = detectBoneMap( model.container );
		expect( result.kind ).toBe( 'Roblox R15' );
		expect( result.ok ).toBe( true );
		expect( result.boneMap ).toMatchObject( {
			hips: 'LowerTorso', chest: 'UpperTorso', head: 'Head',
			leftUpperArm: 'LeftUpperArm', leftLowerArm: 'LeftLowerArm', leftHand: 'LeftHand',
			rightUpperLeg: 'RightUpperLeg', rightLowerLeg: 'RightLowerLeg', rightFoot: 'RightFoot',
		} );
		expect( result.boneMap.spine ).toBeUndefined();
		expect( result.boneMap.neck ).toBeUndefined();

	} );

	it( 'si el nombre no dice el lado, lo decide la posición (izquierda = +X)', () => {

		const names = {
			hips: 'Hips', spine: 'Spine', chest: 'Chest', neck: 'Neck', head: 'Head',
			leftUpperArm: 'UpperArm_A', rightUpperArm: 'UpperArm_B', leftLowerArm: 'Forearm_A', rightLowerArm: 'Forearm_B',
			leftHand: 'Hand_A', rightHand: 'Hand_B', leftUpperLeg: 'Thigh_A', rightUpperLeg: 'Thigh_B',
			leftLowerLeg: 'Shin_A', rightLowerLeg: 'Shin_B', leftFoot: 'Foot_A', rightFoot: 'Foot_B',
		};
		const result = detectBoneMap( buildSkeleton( names ) );
		expect( result.ok ).toBe( true );
		expect( result.boneMap.leftHand ).toBe( 'Hand_A' );
		expect( result.boneMap.rightFoot ).toBe( 'Foot_B' );

	} );

	it( 'sin esqueleto, o con nombres que no dicen nada, explica qué falta', () => {

		expect( detectBoneMap( new Group() ).problems ).toEqual( [ 'Este modelo no tiene esqueleto (huesos).' ] );
		const odd = buildSkeleton( { hips: 'Bone001', spine: 'Bone002', chest: 'Bone003', head: 'Bone004' } );
		const result = detectBoneMap( odd );
		expect( result.ok ).toBe( false );
		expect( result.problems.join( '\n' ) ).toContain( 'Falta elegir qué hueso es «Cadera»' );

	} );

} );

describe( 'leer los nombres', () => {

	it( 'separa los nombres en palabras, sin los prefijos de cada programa', () => {

		expect( tokenize( 'mixamorigLeftUpLeg' ) ).toEqual( [ 'left', 'up', 'leg' ] );
		expect( tokenize( 'mixamorig1Hips' ) ).toEqual( [ 'hips' ] );
		expect( tokenize( 'upperarm_twist_01_l' ) ).toEqual( [ 'upperarm', 'twist', '01', 'l' ] );
		expect( tokenize( 'Bip01_L_Thigh' ) ).toEqual( [ 'l', 'thigh' ] );
		expect( tokenize( 'DEF-upper_armL' ) ).toEqual( [ 'upper', 'arm', 'l' ] );
		expect( tokenize( 'LUpperArm' ) ).toEqual( [ 'l', 'upper', 'arm' ] );

	} );

	it( 'reconoce el papel y el lado, e ignora dedos, extremos y ayudantes', () => {

		expect( classifyBoneName( 'mixamorigLeftForeArm' ) ).toEqual( { part: 'LowerArm', side: 'left' } );
		expect( classifyBoneName( 'calf_r' ) ).toEqual( { part: 'LowerLeg', side: 'right' } );
		expect( classifyBoneName( 'LowerTorso' ) ).toEqual( { part: 'hips', side: null } );
		expect( classifyBoneName( 'UpperTorso' ) ).toEqual( { part: 'chest', side: null } );
		expect( classifyBoneName( 'CC_Base_NeckTwist01' ) ).toEqual( { part: 'neck', side: null } );
		for ( const name of [ 'mixamorigLeftHandIndex1', 'mixamorigHeadTop_End', 'upperarm_twist_01_l', 'HumanoidRootPart', 'root', 'Bone001' ] ) {

			expect( classifyBoneName( name ), name ).toBeNull();

		}

	} );

	it( 'adivina de qué programa viene el esqueleto', () => {

		expect( guessSkeletonKind( [ 'mixamorigHips' ] ) ).toBe( 'Mixamo' );
		expect( guessSkeletonKind( [ 'Hips', 'LeftUpLeg' ] ) ).toBe( 'Mixamo (sin prefijo)' );
		expect( guessSkeletonKind( [ 'Bone001' ] ) ).toBe( 'desconocido' );

	} );

} );
