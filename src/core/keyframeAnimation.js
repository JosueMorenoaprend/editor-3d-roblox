// Animación hecha a mano con keyframes: en ciertos momentos se guarda el giro de un hueso y, entre un
// keyframe y el siguiente, three.js lo interpola (suave). La usa la línea de tiempo del panel Animaciones.
import { AnimationClip, PropertyBinding, QuaternionKeyframeTrack } from 'three';

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
		/** Nombre de la animación del personaje que se está editando (se reemplaza al guardar), o null. */
		this.source = null;
		/** Pistas que no son giros de huesos (posición de la cadera, escalas…): se guardan tal cual. */
		this.extraTracks = [];

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

	/** Datos para guardar en el proyecto: { name, duration, keys: { hueso: [ [ tiempo, x, y, z, w ]… ] } }. */
	toJSON() {

		const keys = {};
		for ( const [ bone, list ] of this.keys ) keys[ bone ] = list.map( ( key ) => [ key.time, ...key.quaternion ] );
		const data = { name: this.name, duration: this.duration, keys };
		if ( this.source ) data.source = this.source;
		if ( this.extraTracks.length > 0 ) data.extra = AnimationClip.toJSON( new AnimationClip( 'extra', this.duration, this.extraTracks ) ).tracks;
		return data;

	}

	/** Vuelve a armar un borrador guardado con toJSON(). Lo que no se entiende (archivo dañado) se ignora. */
	static fromJSON( data ) {

		const duration = Number( data?.duration );
		const name = typeof data?.name === 'string' && data.name.trim() ? data.name : undefined;
		const animation = new KeyframeAnimation( { name, duration: duration >= 0.2 && duration <= 30 ? duration : 2 } );
		for ( const [ bone, list ] of Object.entries( data?.keys || {} ) ) {

			if ( ! Array.isArray( list ) ) continue;
			for ( const item of list ) {

				if ( Array.isArray( item ) && item.length === 5 && item.every( ( value ) => Number.isFinite( value ) ) ) animation.setKey( bone, item[ 0 ], item.slice( 1 ) );

			}

		}

		if ( typeof data?.source === 'string' ) animation.source = data.source;
		if ( Array.isArray( data?.extra ) ) {

			try {

				animation.extraTracks = AnimationClip.parse( { name: 'extra', duration: animation.duration, tracks: data.extra } ).tracks;

			} catch {

				animation.extraTracks = [];

			}

		}

		return animation;

	}

	/**
	 * Un borrador con una animación que ya existe: los giros de los huesos pasan a keyframes (uno por cuadro);
	 * lo demás (posición de la cadera, escalas, otras piezas) queda tal cual en `extraTracks`.
	 * @param {AnimationClip} clip
	 * @param {Map<string, any>} bones huesos del personaje, por nombre
	 */
	static fromClip( clip, bones ) {

		const animation = new KeyframeAnimation( { name: clip.name, duration: clip.duration } );
		animation.source = clip.name;
		for ( const track of clip.tracks ) {

			const { nodeName, propertyName } = PropertyBinding.parseTrackName( track.name );
			if ( propertyName !== 'quaternion' || ! bones.has( nodeName ) ) {

				animation.extraTracks.push( track.clone() );
				continue;

			}

			const interpolant = track.createInterpolant();
			for ( const time of track.times ) animation.setKey( nodeName, time, Array.from( interpolant.evaluate( time ) ) );

		}

		return animation;

	}

	/** La animación para reproducir o exportar (una pista de giro por hueso con keyframes). */
	toClip( name = this.name ) {

		const tracks = [ ...this.keys ].map( ( [ bone, list ] ) => new QuaternionKeyframeTrack(
			`${ bone }.quaternion`,
			list.map( ( key ) => key.time ),
			list.flatMap( ( key ) => key.quaternion ),
		) );
		// Las pistas extra (de una animación que ya existía) se recortan a la duración.
		for ( const track of this.extraTracks ) {

			const copy = track.clone().trim( 0, this.duration );
			if ( copy.times.length > 0 ) tracks.push( copy );

		}

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

/** Cuántos keyframes trae un borrador guardado con toJSON() (sin armarlo). */
export function countDraftKeys( data ) {

	return Object.values( data?.keys || {} ).reduce( ( sum, list ) => sum + ( Array.isArray( list ) ? list.length : 0 ), 0 );

}
