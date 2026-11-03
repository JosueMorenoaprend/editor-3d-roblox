// Humanoide de prueba en pose T, generado por código (sin archivos de terceros).
// Lo usan las pruebas de Vitest y las e2e (para crear archivos de animación tipo Mixamo).
import { Bone, Euler, Group, Quaternion, Vector3 } from 'three';
import { LoadedModel } from '../../src/core/model.js';

// Humanoide sencillo en pose T (metros): [nombre, padre, posición en el mundo]. Mira a +Z; su izquierda es +X.
const T_POSE = [
	[ 'Hips', null, [ 0, 1, 0 ] ],
	[ 'Spine', 'Hips', [ 0, 1.15, 0 ] ],
	[ 'Chest', 'Spine', [ 0, 1.35, 0 ] ],
	[ 'Neck', 'Chest', [ 0, 1.5, 0 ] ],
	[ 'Head', 'Neck', [ 0, 1.6, 0 ] ],
	[ 'HeadEnd', 'Head', [ 0, 1.8, 0 ] ],
	...[ [ 'Left', 1 ], [ 'Right', - 1 ] ].flatMap( ( [ s, x ] ) => [
		[ `${ s }Shoulder`, 'Chest', [ 0.05 * x, 1.45, 0 ] ],
		[ `${ s }UpperArm`, `${ s }Shoulder`, [ 0.15 * x, 1.45, 0 ] ],
		[ `${ s }LowerArm`, `${ s }UpperArm`, [ 0.4 * x, 1.45, 0 ] ],
		[ `${ s }Hand`, `${ s }LowerArm`, [ 0.65 * x, 1.45, 0 ] ],
		[ `${ s }Finger`, `${ s }Hand`, [ 0.75 * x, 1.45, 0.01 ] ],
		[ `${ s }UpperLeg`, 'Hips', [ 0.1 * x, 0.95, 0 ] ],
		[ `${ s }LowerLeg`, `${ s }UpperLeg`, [ 0.1 * x, 0.5, 0 ] ],
		[ `${ s }Foot`, `${ s }LowerLeg`, [ 0.1 * x, 0.08, 0 ] ],
		[ `${ s }Toes`, `${ s }Foot`, [ 0.1 * x, 0.02, 0.12 ] ],
	] ),
];

/**
 * Crea un humanoide en pose T como si se abriera de un archivo (LoadedModel, con nombres como en Unity).
 * Con `twisted`, cada hueso tiene sus ejes girados al azar (como en Mixamo), pero las articulaciones
 * quedan exactamente en el mismo lugar. Con `prefix`, los nombres empiezan así (por ejemplo "mixamorig").
 */
export function buildTPoseHumanoid( { twisted = false, prefix = '' } = {} ) {

	const scene = new Group();
	const made = new Map();
	const worldRotation = new Map();
	let seed = 7;
	const random = () => ( seed = ( seed * 16807 ) % 2147483647 ) / 2147483647;
	for ( const [ name, parentName, position ] of T_POSE ) {

		const bone = new Bone();
		bone.name = prefix + name;
		const parent = parentName ? made.get( parentName ) : null;
		const parentPosition = parentName ? new Vector3( ...T_POSE.find( ( item ) => item[ 0 ] === parentName )[ 2 ] ) : new Vector3();
		const parentRotation = parent ? worldRotation.get( parent ) : new Quaternion();
		bone.position.copy( new Vector3( ...position ).sub( parentPosition ).applyQuaternion( parentRotation.clone().invert() ) );
		if ( twisted ) bone.quaternion.setFromEuler( new Euler( random() * 6, random() * 6, random() * 6 ) );
		worldRotation.set( bone, parentRotation.clone().multiply( bone.quaternion ) );
		( parent || scene ).add( bone );
		made.set( name, bone );

	}

	return new LoadedModel( { scene, animations: [] }, twisted ? 'girado.glb' : 'recto.glb' );

}
