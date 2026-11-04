// Ajustar animaciones: repetir sin saltos, recortar, cambiar la velocidad y combinar dos. Cada operación
// devuelve una animación nueva (la original no cambia), lista para reemplazarla o agregarla con deshacer.
// Las pistas nuevas son lineales: si la original era "cubic spline" (algunos GLB), se toma su valor en
// cada keyframe.
import { AnimationClip, MathUtils, PropertyBinding, Quaternion } from 'three';
import { UserError } from './errors.js';

/** Dos tiempos más cerca que esto (segundos) son el mismo. */
const EPSILON = 1e-4;

/** Los valores de una pista en esos tiempos (todos seguidos). */
function sample( track, times ) {

	const interpolant = track.createInterpolant();
	const values = [];
	for ( const time of times ) values.push( ...interpolant.evaluate( time ) );
	return values;

}

/** Una pista del mismo tipo y nombre, con otros tiempos y valores. */
function rebuild( track, times, values ) {

	return new track.constructor( track.name, times, values );

}

/** Tiempos ordenados y sin repetidos (redondeados a 0,1 ms). */
function cleanTimes( times ) {

	return [ ...new Set( times.map( ( time ) => Math.round( time / EPSILON ) * EPSILON ) ) ].sort( ( a, b ) => a - b );

}

/**
 * La animación más rápida (factor > 1) o más lenta (factor < 1): pasa por las mismas poses.
 * @param {AnimationClip} clip
 * @param {number} factor 2 = el doble de rápido (dura la mitad)
 */
export function changeSpeed( clip, factor, name = clip.name ) {

	if ( ! ( factor >= 0.1 && factor <= 10 ) ) {

		throw new UserError( 'La velocidad tiene que ser un número entre 0,1 y 10 (1 = igual; 2 = el doble de rápido; 0,5 = la mitad).' );

	}

	const tracks = clip.tracks.map( ( track ) => rebuild( track, Array.from( track.times, ( time ) => time / factor ), sample( track, track.times ) ) );
	return new AnimationClip( name, clip.duration / factor, tracks );

}

/**
 * Deja solo el tramo entre `start` y `end` (segundos), que pasa a empezar en 0.
 * @param {AnimationClip} clip
 */
export function trimClip( clip, start, end, name = clip.name ) {

	if ( ! Number.isFinite( start ) || ! Number.isFinite( end ) ) {

		throw new UserError( 'Escribe en «Desde» y «Hasta» los segundos del tramo que quieres dejar (por ejemplo, 0,5 y 1,5).' );

	}

	const from = MathUtils.clamp( start, 0, clip.duration );
	const to = MathUtils.clamp( end, 0, clip.duration );
	if ( to - from < 0.05 ) {

		throw new UserError( `El tramo tiene que durar al menos 0,05 s: «Hasta» tiene que ser mayor que «Desde» (la animación dura ${ clip.duration.toFixed( 2 ).replace( '.', ',' ) } s).` );

	}

	const tracks = clip.tracks.map( ( track ) => {

		const times = [ from, ...Array.from( track.times ).filter( ( time ) => time > from + EPSILON && time < to - EPSILON ), to ];
		return rebuild( track, times.map( ( time ) => time - from ), sample( track, times ) );

	} );
	return new AnimationClip( name, to - from, tracks );

}

/** Suave entre 0 y 1 (sin cambios bruscos de velocidad). */
const smooth = ( x ) => {

	const t = MathUtils.clamp( x, 0, 1 );
	return t * t * ( 3 - 2 * t );

};

/**
 * Repetir sin saltos: en el último tramo (`blend` de la duración, al menos 0,3 s y como mucho la mitad), cada
 * pista se acerca poco a poco a como empieza, y el último cuadro queda igual al primero. Lo de antes de ese
 * tramo no cambia.
 * @param {AnimationClip} clip
 */
export function makeSeamless( clip, { blend = 0.25, name = clip.name } = {} ) {

	const duration = clip.duration;
	const window = Math.min( duration * 0.5, Math.max( duration * blend, 0.3 ) );
	const tracks = clip.tracks.map( ( track ) => {

		// Los keyframes de la pista y, en el tramo de la mezcla, cuadros parejos para que sea suave.
		const steps = Array.from( { length: 9 }, ( _, i ) => duration - window + ( window * i ) / 8 );
		const times = cleanTimes( [ ...Array.from( track.times ).filter( ( time ) => time < duration ), ...steps ] ).filter( ( time ) => time >= 0 );
		times[ times.length - 1 ] = duration;
		const values = sample( track, times );
		const first = sample( track, [ 0 ] );
		const size = first.length;
		const quaternion = track.ValueTypeName === 'quaternion';
		times.forEach( ( time, i ) => {

			const weight = smooth( ( time - ( duration - window ) ) / window );
			if ( weight <= 0 ) return;
			if ( quaternion ) Quaternion.slerpFlat( values, i * size, values, i * size, first, 0, weight );
			else for ( let k = 0; k < size; k ++ ) values[ i * size + k ] += ( first[ k ] - values[ i * size + k ] ) * weight;

		} );
		return rebuild( track, times, values );

	} );
	return new AnimationClip( name, duration, tracks );

}

/** El valor de reposo de la propiedad que mueve una pista (o null si no se sabe). */
function restValue( model, trackName ) {

	const { nodeName, propertyName } = PropertyBinding.parseTrackName( trackName );
	const node = PropertyBinding.findNode( model.container, nodeName );
	const rest = node ? model.restPose.get( node ) : null;
	return rest && rest[ propertyName ] ? rest[ propertyName ].toArray() : null;

}

/**
 * Una animación después de la otra, con una transición corta (`gap` segundos) entre las dos. Lo que una de
 * las dos no mueve queda en reposo mientras suena esa.
 * @param {import('./model.js').LoadedModel} model
 */
export function combineClips( model, first, second, { gap = 0.2, name = `${ first.name } + ${ second.name }` } = {} ) {

	const offset = first.duration + gap;
	const names = [ ...new Set( [ ...first.tracks, ...second.tracks ].map( ( track ) => track.name ) ) ];
	const tracks = names.map( ( trackName ) => {

		const a = first.tracks.find( ( track ) => track.name === trackName );
		const b = second.tracks.find( ( track ) => track.name === trackName );
		const rest = restValue( model, trackName );
		const part = ( track, clip, other ) => {

			const times = track ? cleanTimes( [ 0, ...Array.from( track.times ).filter( ( time ) => time < clip.duration ), clip.duration ] ) : [ 0, clip.duration ];
			// Si esta animación no mueve la pieza: en reposo (o, si no se sabe, como la deja la otra).
			const still = rest || sample( other, [ other === a ? first.duration : 0 ] );
			const values = track ? sample( track, times ) : times.flatMap( () => still );
			return { times, values };

		};

		const one = part( a, first, b );
		const two = part( b, second, a );
		return rebuild( a || b, [ ...one.times, ...two.times.map( ( time ) => time + offset ) ], [ ...one.values, ...two.values ] );

	} );
	return new AnimationClip( name, offset + second.duration, tracks );

}
