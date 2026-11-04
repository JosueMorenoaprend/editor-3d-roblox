// Ayudantes para trabajar con el esqueleto en el espacio del personaje (el del modelo: mira a +Z, su
// izquierda es +X y arriba es +Y, como en glTF). Los usan la prueba del mapa (boneTest.js) y el paso
// de animaciones de un personaje a otro (retarget.js).
import { Euler, MathUtils, Matrix4, PropertyBinding, Quaternion, Vector3 } from 'three';

const UP = new Vector3( 0, 1, 0 );
const FORWARD = new Vector3( 0, 0, 1 );

/** Hacia dónde apunta cada parte: hacia la primera de estas que esté en el mapa. */
const NEXT = {
	hips: [ 'spine', 'chest', 'neck', 'head' ],
	spine: [ 'chest', 'neck', 'head' ],
	chest: [ 'neck', 'head' ],
	neck: [ 'head' ],
	Shoulder: [ 'UpperArm', 'LowerArm' ],
	UpperArm: [ 'LowerArm', 'Hand' ],
	LowerArm: [ 'Hand' ],
	UpperLeg: [ 'LowerLeg', 'Foot' ],
	LowerLeg: [ 'Foot' ],
	Foot: [ 'Toes' ],
};

/** "leftHand" → { side: 'left', part: 'Hand' }; "head" → { side: null, part: 'head' }. */
export function splitKey( key ) {

	const match = /^(left|right)(.+)$/.exec( key );
	return match ? { side: match[ 1 ], part: match[ 2 ] } : { side: null, part: key };

}

/**
 * Parte del mapa hacia la que apunta `key` (el antebrazo apunta a la mano; el muslo, a la pierna), o null.
 * @param {Record<string, string>} boneMap
 * @param {string} key
 */
export function nextBoneKey( boneMap, key ) {

	const { side, part } = splitKey( key );
	for ( const next of NEXT[ part ] || [] ) {

		const candidate = side ? side + next : next;
		if ( boneMap[ candidate ] ) return candidate;

	}

	return null;

}

/** Huesos del modelo por nombre (si dos se llaman igual, el primero, como hacen las animaciones). */
export function findBones( root ) {

	const bones = new Map();
	root.traverse( ( object ) => {

		if ( object.isBone && ! bones.has( object.name ) ) bones.set( object.name, object );

	} );
	return bones;

}

/**
 * Pose de reposo en el espacio del modelo (el contenedor), sin tocar la escena: sirve aunque haya una
 * animación en pausa a mitad de camino.
 */
export class RestPose {

	/**
	 * @param {import('three').Object3D} root el contenedor del modelo
	 * @param {Map<import('three').Object3D, { position, quaternion, scale }>} [restPose] la de LoadedModel
	 */
	constructor( root, restPose ) {

		this.root = root;
		this.restPose = restPose || new Map();
		this.matrices = new Map();

	}

	/** Matriz de reposo del objeto en el espacio del modelo. */
	matrix( object ) {

		if ( ! object || object === this.root ) return new Matrix4();
		let matrix = this.matrices.get( object );
		if ( ! matrix ) {

			const pose = this.restPose.get( object ) || object;
			const local = new Matrix4().compose( pose.position, pose.quaternion, pose.scale );
			matrix = this.matrix( object.parent ).multiply( local );
			this.matrices.set( object, matrix );

		}

		return matrix.clone();

	}

	position( object ) {

		return new Vector3().setFromMatrixPosition( this.matrix( object ) );

	}

	/** Giro (sin escala) del objeto en el espacio del modelo. */
	rotation( object ) {

		const rotation = new Quaternion();
		this.matrix( object ).decompose( new Vector3(), rotation, new Vector3() );
		return rotation;

	}

	/** Giro local de reposo del objeto. */
	quaternion( object ) {

		return ( this.restPose.get( object ) || object ).quaternion.clone();

	}

}

/**
 * Hacia dónde apunta un hueso en reposo (vector de largo 1, en el espacio del modelo): de su
 * articulación a la del siguiente hueso del mapa; si no hay, al promedio de sus huesos hijos.
 * @param {string} key parte del mapa
 * @param {Record<string, string>} boneMap
 * @param {RestPose} rest
 * @param {Map<string, import('three').Bone>} bones huesos por nombre (findBones)
 * @param {{ guess?: boolean }} [options] guess: si no se puede saber, devolver una dirección típica
 *   (la mano sigue al antebrazo, el pie mira hacia adelante, el resto hacia arriba) en vez de null
 * @returns {Vector3|null}
 */
export function boneDirection( key, boneMap, rest, bones, { guess = true } = {} ) {

	const boneOf = ( part ) => ( boneMap[ part ] ? bones.get( boneMap[ part ] ) : undefined );
	const bone = boneOf( key );
	if ( ! bone ) return null;
	const { side, part } = splitKey( key );
	const from = rest.position( bone );
	const direction = new Vector3();

	// 1. Hacia el siguiente hueso del mapa (el antebrazo apunta a la mano…).
	for ( const next of NEXT[ part ] || [] ) {

		const target = boneOf( side ? side + next : next );
		if ( target && target !== bone ) {

			direction.subVectors( rest.position( target ), from );
			break;

		}

	}

	// 2. Si no hay, hacia el promedio de sus huesos hijos (la mano hacia sus dedos…).
	if ( direction.lengthSq() < 1e-12 ) {

		const children = bone.children.filter( ( child ) => child.isBone );
		for ( const child of children ) direction.add( rest.position( child ) );
		if ( children.length > 0 ) direction.divideScalar( children.length ).sub( from );

	}

	if ( direction.lengthSq() >= 1e-12 ) return direction.normalize();
	if ( ! guess ) return null;

	// 3. Una dirección típica: la mano sigue al antebrazo; el pie y los dedos, hacia adelante.
	const previous = part === 'Hand' ? boneOf( side + 'LowerArm' ) : null;
	if ( previous ) {

		direction.subVectors( from, rest.position( previous ) );
		if ( direction.lengthSq() >= 1e-12 ) return direction.normalize();

	}

	return ( part === 'Foot' || part === 'Toes' ? FORWARD : UP ).clone();

}

/**
 * Giro local de un hueso para un giro D pensado en el espacio del personaje, relativo a su padre en
 * reposo: P⁻¹ · D · P · L (P: giro de reposo del padre; L: giro de reposo del hueso). Si el padre también
 * gira, el hueso lo sigue (como el antebrazo sigue al brazo).
 * @param {RestPose} rest
 * @param {import('three').Object3D} bone
 * @param {Quaternion} delta giro D
 * @returns {Quaternion}
 */
export function localRotation( rest, bone, delta ) {

	const parent = rest.rotation( bone.parent );
	return parent.clone().invert().multiply( delta ).multiply( parent ).multiply( rest.quaternion( bone ) );

}

/**
 * Orden de los ángulos "del personaje" de los deslizadores: primero girar (Y), después adelante/atrás (X)
 * y al final hacia los lados (Z). Con un brazo que cuelga, "girar" lo gira sobre sí mismo.
 */
const ANGLE_ORDER = 'ZXY';

/**
 * Giro local de un hueso a partir de ángulos en grados pensados en el espacio del personaje, relativos a
 * su padre en reposo: [adelante/atrás (X), girar (Y), hacia los lados (Z)]. [0, 0, 0] = pose de reposo.
 * @param {RestPose} rest
 * @param {import('three').Object3D} bone
 * @param {number[]} degrees [x, y, z]
 */
export function localFromAngles( rest, bone, [ x = 0, y = 0, z = 0 ] ) {

	const euler = new Euler( MathUtils.degToRad( x ), MathUtils.degToRad( y ), MathUtils.degToRad( z ), ANGLE_ORDER );
	return localRotation( rest, bone, new Quaternion().setFromEuler( euler ) );

}

/**
 * Lo contrario de localFromAngles: los ángulos (grados) que corresponden a un giro local del hueso.
 * @param {RestPose} rest
 * @param {import('three').Object3D} bone
 * @param {Quaternion} local giro local del hueso
 * @returns {number[]} [x, y, z]
 */
export function anglesFromLocal( rest, bone, local ) {

	// D = P · giro · L⁻¹ · P⁻¹ (P: giro de reposo del padre; L: giro de reposo del hueso).
	const parent = rest.rotation( bone.parent );
	const delta = parent.clone().multiply( local ).multiply( rest.quaternion( bone ).invert() ).multiply( parent.clone().invert() );
	const euler = new Euler().setFromQuaternion( delta.normalize(), ANGLE_ORDER );
	return [ euler.x, euler.y, euler.z ].map( ( radians ) => MathUtils.radToDeg( radians ) );

}

/**
 * Largo de las piernas en reposo (promedio de las dos, del muslo al pie), o null si no hay piernas.
 * @param {Record<string, string>} boneMap
 * @param {RestPose} rest
 * @param {Map<string, import('three').Bone>} bones
 */
export function legLength( boneMap, rest, bones ) {

	const lengths = [];
	for ( const side of [ 'left', 'right' ] ) {

		const upper = bones.get( boneMap[ side + 'UpperLeg' ] );
		const foot = bones.get( boneMap[ side + 'Foot' ] );
		if ( upper && foot ) lengths.push( rest.position( upper ).distanceTo( rest.position( foot ) ) );

	}

	const length = lengths.reduce( ( sum, value ) => sum + value, 0 ) / ( lengths.length || 1 );
	return length > 1e-6 ? length : null;

}

/** Propiedades de las pistas que se evalúan (las demás, como gestos de la cara, se ignoran). */
const TRANSFORMS = new Set( [ 'position', 'quaternion', 'scale' ] );

/**
 * Pone un modelo en cualquier momento de una animación sin AnimationMixer (evalúa cada pista
 * directamente) y después lo deja exactamente como estaba (restore). Sirve para medir o copiar una
 * animación sin tocar el reproductor.
 */
export class ClipSampler {

	/**
	 * @param {import('three').Object3D} root el contenedor del modelo
	 * @param {import('three').AnimationClip} clip
	 */
	constructor( root, clip ) {

		this.root = root;
		this.bindings = [];
		this.saved = new Map();
		for ( const track of clip.tracks ) {

			const { nodeName, propertyName } = PropertyBinding.parseTrackName( track.name );
			const node = PropertyBinding.findNode( root, nodeName );
			if ( ! node || ! TRANSFORMS.has( propertyName ) ) continue;
			if ( ! this.saved.has( node ) ) {

				this.saved.set( node, { position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() } );

			}

			this.bindings.push( { target: node[ propertyName ], interpolant: track.createInterpolant() } );

		}

	}

	apply( time ) {

		for ( const { target, interpolant } of this.bindings ) target.fromArray( interpolant.evaluate( time ) );

	}

	restore() {

		for ( const [ node, pose ] of this.saved ) {

			node.position.copy( pose.position );
			node.quaternion.copy( pose.quaternion );
			node.scale.copy( pose.scale );

		}

		this.root.updateMatrixWorld( true );

	}

}
