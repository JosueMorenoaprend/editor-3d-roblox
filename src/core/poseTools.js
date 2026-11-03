// Copiar, pegar y reflejar poses (izquierda ⇄ derecha). Las poses se guardan como grados por parte del
// cuerpo, en el espacio del personaje (como los deslizadores del editor de keyframes): por eso una pose
// copiada se puede pegar en otro momento o en otro personaje, aunque sus huesos tengan los ejes girados.
import { anglesFromLocal, localFromAngles } from './skeletonPose.js';

/** La parte del otro lado: leftUpperArm ⇄ rightUpperArm. Las del centro (cadera, cabeza…) son la misma. */
export function oppositeKey( key ) {

	if ( key.startsWith( 'left' ) ) return 'right' + key.slice( 4 );
	if ( key.startsWith( 'right' ) ) return 'left' + key.slice( 5 );
	return key;

}

/**
 * La pose actual: los grados [adelante/atrás, girar, hacia los lados] de cada parte del mapa.
 * @param {import('./skeletonPose.js').RestPose} rest
 * @param {Record<string, string>} boneMap
 * @param {Map<string, import('three').Bone>} bones nombre → hueso
 * @returns {Map<string, number[]>} parte → [x, y, z]
 */
export function readPose( rest, boneMap, bones ) {

	const pose = new Map();
	for ( const [ key, name ] of Object.entries( boneMap ) ) {

		const bone = bones.get( name );
		if ( bone ) pose.set( key, anglesFromLocal( rest, bone, bone.quaternion.clone() ) );

	}

	return pose;

}

/**
 * Refleja una pose: cada parte toma los grados de la del otro lado, en espejo. Adelante/atrás queda igual;
 * girar y hacia los lados cambian de signo (espejo en el plano X = 0, porque la izquierda del personaje es +X).
 * @param {Map<string, number[]>} pose
 * @returns {Map<string, number[]>}
 */
export function mirrorAngles( pose ) {

	const mirrored = new Map();
	for ( const [ key, [ x, y, z ] ] of pose ) mirrored.set( oppositeKey( key ), [ x, - y, - z ] );
	return mirrored;

}

/**
 * Los giros locales que ponen una pose en este personaje.
 * @returns {Map<string, import('three').Quaternion>} parte → giro local de su hueso
 */
export function poseRotations( rest, boneMap, bones, pose ) {

	const rotations = new Map();
	for ( const [ key, angles ] of pose ) {

		const bone = bones.get( boneMap[ key ] );
		if ( bone ) rotations.set( key, localFromAngles( rest, bone, angles ) );

	}

	return rotations;

}
