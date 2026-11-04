// Ayudantes para crear pistas de animación a partir de ángulos en grados.
//
// Las personas (y las IA) piensan en grados ("sube el brazo 90°"), pero three.js
// guarda las rotaciones de los huesos como cuaterniones. Aquí está la conversión.
import { Euler, MathUtils, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';

const _euler = new Euler();
const _quaternion = new Quaternion();

/**
 * Convierte un giro en grados [x, y, z] (orden XYZ) a cuaternión [x, y, z, w].
 * @param {number[]} degrees
 * @returns {number[]}
 */
export function degreesToQuaternion( [ x = 0, y = 0, z = 0 ] ) {

	_euler.set( MathUtils.degToRad( x ), MathUtils.degToRad( y ), MathUtils.degToRad( z ), 'XYZ' );
	return _quaternion.setFromEuler( _euler ).toArray();

}

/**
 * Pista de rotación de un hueso con keyframes en grados.
 * Si el hueso tiene una rotación de reposo (`rest`), los giros se suman a ella.
 * @param {string} boneName nombre del hueso (o nodo)
 * @param {number[]} times segundos de cada keyframe
 * @param {number[][]} rotations giros [x, y, z] en grados, uno por keyframe
 * @param {Quaternion} [rest] rotación de reposo del hueso
 */
export function rotationTrack( boneName, times, rotations, rest = null ) {

	if ( times.length !== rotations.length ) {

		throw new Error( `La pista de "${ boneName }" tiene ${ times.length } tiempos pero ${ rotations.length } giros.` );

	}

	const values = [];
	for ( const rotation of rotations ) {

		_quaternion.fromArray( degreesToQuaternion( rotation ) );
		if ( rest ) _quaternion.premultiply( rest );
		values.push( ..._quaternion.toArray() );

	}

	return new QuaternionKeyframeTrack( `${ boneName }.quaternion`, times, values );

}

/**
 * Pista de posición de un hueso (por ejemplo, la cadera al saltar).
 * @param {string} boneName
 * @param {number[]} times
 * @param {number[][]} positions posiciones [x, y, z], una por keyframe
 */
export function positionTrack( boneName, times, positions ) {

	if ( times.length !== positions.length ) {

		throw new Error( `La pista de "${ boneName }" tiene ${ times.length } tiempos pero ${ positions.length } posiciones.` );

	}

	return new VectorKeyframeTrack( `${ boneName }.position`, times, positions.flat() );

}
