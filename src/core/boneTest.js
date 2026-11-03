// Animación de prueba del mapa de huesos: mueve cada parte del cuerpo por turnos para ver en la
// vista 3D si cada hueso del mapa es el correcto ("¿se mueve la mano izquierda?").
//
// Los giros se piensan en el espacio del personaje: mira hacia +Z, su izquierda es +X y arriba es +Y
// (como en glTF, y como supone boneDetect.js). Cada giro se pasa al hueso teniendo en cuenta cómo
// están girados sus ejes en la pose de reposo: así el mismo movimiento ("levanta el brazo") se ve igual
// en un esqueleto de Mixamo (cada hueso con sus ejes girados), en un R15 o en uno de Tripo.
// Es la misma idea que usarán los generadores de animación y el guion para IA.
import { AnimationClip, MathUtils, Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3 } from 'three';
import { HUMANOID_BONES, boneLabel } from './boneMap.js';

/** Nombre de la animación de prueba. */
export const BONE_TEST_NAME = 'Prueba del mapa de huesos';

/** Segundos que dura el turno de cada parte. */
export const STEP_SECONDS = 0.8;

/** Parte del turno en que la parte se mueve (el resto, quieta en reposo, para separar los turnos). */
const MOVE_FRACTION = 0.85;
/** Cuadros por turno (el giro sigue una curva suave). */
const SAMPLES = 9;

const UP = new Vector3( 0, 1, 0 );
const FORWARD = new Vector3( 0, 0, 1 );
const BACK = new Vector3( 0, 0, - 1 );
/** Hacia afuera del cuerpo: +X en el lado izquierdo, -X en el derecho. */
const OUT = 'afuera';

/**
 * Cómo se mueve cada parte.
 * twist: gira hacia un lado y hacia el otro alrededor del eje vertical (grados).
 * toward: lleva el hueso hacia la primera dirección de la lista que no sea paralela a él, y lo devuelve.
 */
const MOTIONS = {
	hips: { twist: 25 },
	spine: { toward: [ FORWARD ], angle: 20 },
	chest: { twist: 25 },
	neck: { toward: [ FORWARD ], angle: 25 },
	head: { twist: 40 },
	Shoulder: { toward: [ UP ], angle: 20 },
	UpperArm: { toward: [ UP, OUT ], angle: 55 },
	LowerArm: { toward: [ FORWARD, UP ], angle: 70 },
	Hand: { toward: [ FORWARD, UP ], angle: 50 },
	UpperLeg: { toward: [ FORWARD ], angle: 45 },
	LowerLeg: { toward: [ BACK ], angle: 70 },
	Foot: { toward: [ UP ], angle: 35 },
	Toes: { toward: [ UP ], angle: 35 },
};

/** Hacia dónde apunta cada hueso: hacia el primero de estos que esté en el mapa. */
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
function splitKey( key ) {

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

/**
 * Crea la animación de prueba.
 * @param {import('./model.js').LoadedModel} model
 * @param {Record<string, string>} boneMap clave estándar → nombre del hueso
 * @param {string[]} [keys] qué partes probar, en orden (por defecto, todas las del mapa)
 * @returns {{ clip: AnimationClip, steps: { key: string, label: string, boneName: string, start: number, end: number }[] }}
 *   steps: qué parte se mueve en cada momento (para mostrarlo en la interfaz)
 */
export function createBoneTestClip( model, boneMap, keys = null ) {

	const root = model.container;
	const rest = new RestPose( root, model.restPose );
	const bones = new Map();
	root.traverse( ( object ) => {

		if ( object.isBone && ! bones.has( object.name ) ) bones.set( object.name, object );

	} );
	const boneOf = ( key ) => ( boneMap[ key ] ? bones.get( boneMap[ key ] ) : undefined );

	const order = keys ?? HUMANOID_BONES.map( ( bone ) => bone.key ).filter( ( key ) => boneMap[ key ] );
	const steps = [];
	/** hueso → cuadros de su pista ({ times, values }) */
	const frames = new Map();
	let start = 0;

	for ( const key of order ) {

		const bone = boneOf( key );
		const motion = MOTIONS[ splitKey( key ).part ];
		if ( ! bone || ! motion ) continue;

		const restLocal = rest.quaternion( bone );
		const parentRotation = rest.rotation( bone.parent );
		const parentInverse = parentRotation.clone().invert();
		// Giro en el espacio del personaje (D) → giro local del hueso: P⁻¹ · D · P · L.
		const local = ( delta ) => parentInverse.clone().multiply( delta ).multiply( parentRotation ).multiply( restLocal );

		const axis = motion.twist ? UP : swingAxis( key, motion.toward, rest, boneOf, bone );
		const amplitude = MathUtils.degToRad( motion.twist ?? motion.angle );
		// Curva suave: va y vuelve (toward) o va a un lado, al otro y vuelve (twist).
		const curve = motion.twist ? ( u ) => Math.sin( 2 * Math.PI * u ) : ( u ) => Math.sin( Math.PI * u );

		if ( ! frames.has( bone ) ) frames.set( bone, { times: [], values: [] } );
		const track = frames.get( bone );
		for ( let i = 0; i < SAMPLES; i ++ ) {

			const u = i / ( SAMPLES - 1 );
			const delta = new Quaternion().setFromAxisAngle( axis, amplitude * curve( u ) );
			track.times.push( start + u * MOVE_FRACTION * STEP_SECONDS );
			track.values.push( ...local( delta ).toArray() );

		}

		steps.push( { key, label: boneLabel( key ), boneName: bone.name, start, end: start + STEP_SECONDS } );
		start += STEP_SECONDS;

	}

	const tracks = [ ...frames ].map( ( [ bone, { times, values } ] ) => new QuaternionKeyframeTrack( `${ bone.name }.quaternion`, times, values ) );
	return { clip: new AnimationClip( BONE_TEST_NAME, start, tracks ), steps };

}

/**
 * Eje (en el espacio del personaje) para llevar el hueso hacia una de las direcciones pedidas.
 * La dirección del hueso va de su articulación a la del siguiente hueso del mapa (o a sus hijos).
 */
function swingAxis( key, targets, rest, boneOf, bone ) {

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

	// 3. Si tampoco, la dirección de la parte anterior (la mano sigue al antebrazo) o una típica.
	if ( direction.lengthSq() < 1e-12 ) {

		const previous = part === 'Hand' ? boneOf( side + 'LowerArm' ) : null;
		if ( previous ) direction.subVectors( from, rest.position( previous ) );
		else direction.copy( part === 'Foot' || part === 'Toes' ? FORWARD : UP );

	}

	direction.normalize();
	const axis = new Vector3();
	for ( const target of targets ) {

		const toward = target === OUT ? new Vector3( side === 'right' ? - 1 : 1, 0, 0 ) : target;
		axis.crossVectors( direction, toward );
		// Si el hueso ya apunta hacia ahí (o justo al revés), se prueba la siguiente dirección.
		if ( axis.length() > 0.25 ) return axis.normalize();

	}

	return new Vector3( 1, 0, 0 );

}

/**
 * Pose de reposo en el espacio del modelo (el contenedor), sin tocar la escena: sirve aunque haya una
 * animación en pausa a mitad de camino.
 */
class RestPose {

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
