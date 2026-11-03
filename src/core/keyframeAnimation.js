// Animación hecha a mano con keyframes: en ciertos momentos se guarda el giro de un hueso y, entre un
// keyframe y el siguiente, three.js lo interpola (suave). La usa la línea de tiempo del panel Animaciones.
import { AnimationClip, QuaternionKeyframeTrack } from 'three';

/** Dos keyframes a menos de esto (segundos) son el mismo momento. */
const SAME_TIME = 1e-3;

export class KeyframeAnimation {

	/**
	 * @param {{ name?: string, duration?: number }} [options]
	 */
	constructor( { name = 'Mi animación', duration = 2 } = {} ) {

		this.name = name;
		this.duration = duration;
		/** hueso → keyframes ordenados por tiempo: [{ time, quaternion: [x, y, z, w] }] */
		this.keys = new Map();

	}

	/** Guarda (o reemplaza) el giro de un hueso en un momento. */
	setKey( boneName, time, quaternion ) {

		const at = this._clampTime( time );
		const list = this.keys.get( boneName ) || [];
		const value = Array.isArray( quaternion ) ? [ ...quaternion ] : quaternion.toArray();
		const index = list.findIndex( ( key ) => Math.abs( key.time - at ) < SAME_TIME );
		if ( index >= 0 ) list[ index ] = { time: list[ index ].time, quaternion: value };
		else list.push( { time: at, quaternion: value } );
		list.sort( ( a, b ) => a.time - b.time );
		this.keys.set( boneName, list );

	}

	/**
	 * Pone keyframes a varias partes en el mismo momento (la pose que se ve).
	 * @param {number} time segundos
	 * @param {Iterable<[string, import('three').Quaternion]>} pose nombre del hueso y su giro
	 * @returns {number} cuántos keyframes se pusieron
	 */
	setPose( time, pose ) {

		let count = 0;
		for ( const [ bone, quaternion ] of pose ) {

			this.setKey( bone, time, quaternion );
			count ++;

		}

		return count;

	}

	/** Quita el keyframe de un hueso en un momento. Devuelve true si había uno. */
	removeKey( boneName, time ) {

		const list = this.keys.get( boneName );
		const index = list ? list.findIndex( ( key ) => Math.abs( key.time - time ) < SAME_TIME ) : - 1;
		if ( index < 0 ) return false;
		list.splice( index, 1 );
		if ( list.length === 0 ) this.keys.delete( boneName );
		return true;

	}

	hasKey( boneName, time ) {

		return ( this.keys.get( boneName ) || [] ).some( ( key ) => Math.abs( key.time - time ) < SAME_TIME );

	}

	/** Momentos con keyframe de un hueso. */
	keyTimes( boneName ) {

		return ( this.keys.get( boneName ) || [] ).map( ( key ) => key.time );

	}

	/** Cuántos keyframes hay en total. */
	get keyCount() {

		let count = 0;
		for ( const list of this.keys.values() ) count += list.length;
		return count;

	}

	/** Cambia la duración; los keyframes que queden fuera se borran. */
	setDuration( duration ) {

		this.duration = Math.max( 0.1, duration );
		for ( const [ bone, list ] of this.keys ) {

			const kept = list.filter( ( key ) => key.time <= this.duration + SAME_TIME );
			if ( kept.length ) this.keys.set( bone, kept );
			else this.keys.delete( bone );

		}

	}

	/** Copia de todos los keyframes y de la duración (para deshacer). */
	snapshot() {

		return { duration: this.duration, keys: copyKeys( this.keys ) };

	}

	/** Vuelve al estado de una copia hecha con snapshot(). */
	restore( { duration, keys } ) {

		this.duration = duration;
		this.keys = copyKeys( keys );

	}

	/** La animación para reproducir o exportar (una pista de giro por hueso con keyframes). */
	toClip( name = this.name ) {

		const tracks = [ ...this.keys ].map( ( [ bone, list ] ) => new QuaternionKeyframeTrack(
			`${ bone }.quaternion`,
			list.map( ( key ) => key.time ),
			list.flatMap( ( key ) => key.quaternion ),
		) );
		return new AnimationClip( name, this.duration, tracks );

	}

	_clampTime( time ) {

		return Math.min( Math.max( Math.round( time * 1000 ) / 1000, 0 ), this.duration );

	}

}

/** Copia profunda de los keyframes (hueso → [{ time, quaternion: [x, y, z, w] }]). */
function copyKeys( keys ) {

	return new Map( [ ...keys ].map( ( [ bone, list ] ) => [ bone, list.map( ( key ) => ( { time: key.time, quaternion: [ ...key.quaternion ] } ) ) ] ) );

}
