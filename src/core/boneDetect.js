// Detección automática del mapa de huesos (ver boneMap.js).
//
// No depende de una lista fija de nombres: separa cada nombre en palabras
// ("mixamorigLeftUpLeg" → left, up, leg; "upperarm_l" → upperarm, l; "Bip01_L_Thigh" → l, thigh)
// y reconoce el papel de cada hueso. Funciona con Mixamo, Roblox R15, Unreal, Unity, VRM/VRoid,
// ActorCore, Blender (Rigify), 3ds Max (Biped) y, en general, con nombres en inglés.
// Después usa la forma del esqueleto: el pecho es donde se unen los brazos y, si un nombre no dice
// el lado, se mira la posición (el personaje mira hacia +Z, así que su izquierda es +X).
//
// Ojo: three.js limpia los nombres al abrir un archivo ("mixamorig:Hips" → "mixamorigHips",
// "Bip01 L Thigh" → "Bip01_L_Thigh", "upper_arm.L" → "upper_armL"). Este detector lo tiene en cuenta.
import { Vector3 } from 'three';
import { HUMANOID_BONES, validateBoneMap } from './boneMap.js';

// Prefijos de cada programa que no dicen nada del papel del hueso.
const PREFIXES = [ /^mixamorig\d*[:_]?/i, /^(j_bip|j_sec|cc_base|def|org|mch|armature)[-_]+/i, /^bip0*1[\s_-]*/i ];

// Huesos de ayuda o de detalle que nunca son el hueso principal de un papel.
const IGNORE = new Set( [
	'end', 'top', 'nub', 'tip', 'roll', 'ik', 'pole', 'target', 'ctrl', 'control', 'mch', 'helper', 'socket',
	'weapon', 'prop', 'eye', 'eyes', 'jaw', 'tongue', 'teeth', 'finger', 'thumb', 'index', 'middle', 'ring',
	'pinky', 'little', 'breast', 'hair', 'tail', 'cape', 'skirt', 'ear', 'brow', 'lid', 'cheek', 'lip', 'mouth', 'nose',
	'humanoid', 'root', 'part',
] );

/** Separa un nombre de hueso en palabras en minúscula. */
export function tokenize( name ) {

	let text = String( name );
	for ( const prefix of PREFIXES ) text = text.replace( prefix, '' );
	return text
		.replace( /([a-z])([A-Z])/g, '$1 $2' )
		.replace( /([A-Z]+)([A-Z][a-z])/g, '$1 $2' )
		.replace( /([A-Za-z])(\d)/g, '$1 $2' )
		.replace( /(\d)([A-Za-z])/g, '$1 $2' )
		.toLowerCase()
		.split( /[^a-z0-9]+/ )
		.filter( Boolean );

}

/**
 * Papel de un hueso según su nombre.
 * @returns {{ part: string, side: 'left'|'right'|null }|null} part: 'hips', 'spine', 'chest', 'neck',
 *   'head', o (con lado) 'Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes'
 */
export function classifyBoneName( name ) {

	const tokens = tokenize( name );
	if ( tokens.length === 0 ) return null;
	const has = ( ...words ) => words.some( ( word ) => tokens.includes( word ) );
	// Los "twist" de brazos y piernas son ayudantes; los del cuello (ActorCore) sí son el cuello.
	if ( has( 'twist' ) && ! has( 'neck' ) ) return null;
	if ( tokens.some( ( token ) => IGNORE.has( token ) ) ) return null;

	const side = has( 'left', 'l' ) ? 'left' : has( 'right', 'r' ) ? 'right' : null;
	const limb = ( part ) => ( { part, side } );

	if ( has( 'shoulder', 'clavicle', 'collar', 'collarbone' ) ) return limb( 'Shoulder' );
	if ( has( 'forearm', 'lowerarm', 'elbow' ) || ( has( 'lower', 'fore' ) && has( 'arm' ) ) ) return limb( 'LowerArm' );
	if ( has( 'upperarm', 'uparm' ) || has( 'arm' ) ) return limb( 'UpperArm' );
	if ( has( 'hand', 'wrist' ) ) return limb( 'Hand' );
	if ( has( 'toe', 'toes', 'toebase', 'ball' ) ) return limb( 'Toes' );
	if ( has( 'foot', 'ankle' ) ) return limb( 'Foot' );
	if ( has( 'upleg', 'upperleg', 'thigh' ) || ( has( 'up', 'upper' ) && has( 'leg' ) ) ) return limb( 'UpperLeg' );
	if ( has( 'lowerleg', 'calf', 'shin', 'knee' ) || has( 'leg' ) ) return limb( 'LowerLeg' );
	if ( has( 'hips', 'hip', 'pelvis' ) || ( has( 'lower' ) && has( 'torso' ) ) ) return { part: 'hips', side: null };
	if ( has( 'chest', 'upperchest' ) || ( has( 'upper' ) && has( 'torso' ) ) ) return { part: 'chest', side: null };
	if ( has( 'spine', 'waist', 'torso' ) ) return { part: 'spine', side: null };
	if ( has( 'neck' ) ) return { part: 'neck', side: null };
	if ( has( 'head' ) ) return { part: 'head', side: null };
	return null;

}

/** Programa o estándar del que parece venir el esqueleto (solo para mostrarlo). */
export function guessSkeletonKind( names ) {

	const any = ( pattern ) => names.some( ( name ) => pattern.test( name ) );
	if ( any( /^mixamorig/i ) ) return 'Mixamo';
	if ( any( /^LowerTorso$/ ) && any( /^UpperTorso$/ ) ) return 'Roblox R15';
	if ( any( /^CC_Base_/i ) ) return 'ActorCore / Character Creator';
	if ( any( /^J_Bip_/i ) ) return 'VRoid / VRM';
	if ( any( /^Bip0*1/i ) ) return '3ds Max (Biped)';
	if ( any( /^DEF-/ ) ) return 'Blender (Rigify)';
	if ( any( /^upperarm_[lr]$/i ) && any( /^thigh_[lr]$/i ) ) return 'Unreal';
	if ( any( /^LeftUpperLeg$/ ) && any( /^Hips$/ ) ) return 'Unity / VRM';
	if ( any( /^LeftUpLeg$/ ) && any( /^Hips$/ ) ) return 'Mixamo (sin prefijo)';
	return 'desconocido';

}

/**
 * Detecta el mapa de huesos de un modelo.
 * @param {import('three').Object3D} root el modelo (por ejemplo, model.container)
 * @returns {{ boneMap: Record<string, string>, kind: string, boneCount: number, ok: boolean, missing: string[], problems: string[] }}
 */
export function detectBoneMap( root ) {

	const bones = [];
	root.traverse( ( object ) => {

		if ( object.isBone ) bones.push( object );

	} );
	const kind = guessSkeletonKind( bones.map( ( bone ) => bone.name ) );
	if ( bones.length === 0 ) return { boneMap: {}, kind, boneCount: 0, ok: false, missing: [], problems: [ 'Este modelo no tiene esqueleto (huesos).' ] };

	root.updateMatrixWorld( true );
	const depth = new Map( bones.map( ( bone ) => [ bone, depthOf( bone ) ] ) );
	const localX = ( bone ) => root.worldToLocal( bone.getWorldPosition( new Vector3() ) ).x;

	// 1. Papel de cada hueso según su nombre.
	const candidates = new Map(); // clave estándar → huesos
	const add = ( key, bone ) => {

		if ( ! candidates.has( key ) ) candidates.set( key, [] );
		candidates.get( key ).push( bone );

	};

	const hips0 = bones.find( ( bone ) => classifyBoneName( bone.name )?.part === 'hips' );
	const centerX = hips0 ? localX( hips0 ) : 0;
	for ( const bone of bones ) {

		const role = classifyBoneName( bone.name );
		if ( ! role ) continue;
		if ( /^[A-Z]/.test( role.part ) ) {

			// Sin lado en el nombre: lo decide la posición (izquierda del personaje = +X).
			const side = role.side ?? ( localX( bone ) >= centerX ? 'left' : 'right' );
			add( side + role.part, bone );

		} else {

			add( role.part, bone );

		}

	}

	// Entre varios candidatos, el más cercano a la raíz (los demás suelen ser ayudantes).
	const shallowest = ( list ) => list && list.length ? [ ...list ].sort( ( a, b ) => depth.get( a ) - depth.get( b ) )[ 0 ] : null;
	const pick = {};
	for ( const bone of HUMANOID_BONES ) {

		if ( [ 'spine', 'chest', 'neck', 'head' ].includes( bone.key ) ) continue;
		const chosen = shallowest( candidates.get( bone.key ) );
		if ( chosen ) pick[ bone.key ] = chosen;

	}

	// 2. Columna, pecho, cuello y cabeza, usando la forma del esqueleto.
	//    El pecho es el hueso del que cuelgan los hombros (o los brazos).
	const armRoot = pick.leftShoulder || pick.leftUpperArm || pick.rightShoulder || pick.rightUpperArm;
	const torso = [ ...( candidates.get( 'spine' ) || [] ), ...( candidates.get( 'chest' ) || [] ) ];
	let chest = null;
	if ( armRoot && armRoot.parent && armRoot.parent.isBone && armRoot.parent !== pick.hips ) chest = armRoot.parent;
	if ( ! chest ) chest = shallowest( candidates.get( 'chest' ) ) || deepest( torso, depth );
	if ( chest ) pick.chest = chest;

	const spine = shallowest( torso.filter( ( bone ) => bone !== chest && ( ! chest || isAncestor( bone, chest ) ) ) );
	if ( spine ) pick.spine = spine;

	const head = shallowest( candidates.get( 'head' ) );
	if ( head ) pick.head = head;
	const neck = shallowest( ( candidates.get( 'neck' ) || [] ).filter( ( bone ) => ! chest || isAncestor( chest, bone ) ) );
	if ( neck && neck !== head ) pick.neck = neck;

	// 3. Sin cadera por nombre: el hueso del que salen las dos piernas.
	if ( ! pick.hips && pick.leftUpperLeg && pick.leftUpperLeg.parent?.isBone ) pick.hips = pick.leftUpperLeg.parent;

	const boneMap = {};
	for ( const bone of HUMANOID_BONES ) if ( pick[ bone.key ] ) boneMap[ bone.key ] = pick[ bone.key ].name;
	const { ok, missing, problems } = validateBoneMap( boneMap, root );
	return { boneMap, kind, boneCount: bones.length, ok, missing, problems };

}

function depthOf( object ) {

	let depth = 0;
	for ( let node = object.parent; node; node = node.parent ) depth ++;
	return depth;

}

function deepest( list, depth ) {

	return list.length ? [ ...list ].sort( ( a, b ) => depth.get( b ) - depth.get( a ) )[ 0 ] : null;

}

/** ¿`ancestor` está por encima de `object` en el árbol? */
function isAncestor( ancestor, object ) {

	for ( let node = object.parent; node; node = node.parent ) if ( node === ancestor ) return true;
	return false;

}
