// Pasar una animación de un personaje a otro ("retarget"), usando los mapas de huesos de los dos.
//
// Para cada parte del cuerpo (cadera, brazo izquierdo…) y en cada cuadro:
// 1. Se mide cuánto giró el hueso del origen respecto de su pose de reposo, en el espacio del personaje
//    (mira a +Z, su izquierda es +X): D = giro actual · giro de reposo⁻¹.
// 2. Se alinean las poses de reposo (A): si el origen está en pose T y el destino tiene los brazos
//    abajo (como el R15), el brazo del destino se lleva primero a la dirección del brazo del origen.
// 3. El hueso del destino queda con el giro D · A · (su giro de reposo), pasado a su espacio local.
// Así cada parte del destino apunta hacia donde apunta la del origen, aunque los huesos tengan los ejes
// girados distinto (Mixamo, Tripo, R15…). La cadera además se desplaza (saltos, agacharse), escalada al
// largo de las piernas del destino.
//
// No usa SkeletonUtils.retargetClip de three.js: ese copia las matrices globales, y solo funciona si los
// dos esqueletos tienen la misma pose de reposo y los mismos ejes en cada hueso.
import { AnimationClip, Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three';
import { HUMANOID_BONES, humanoidBone } from './boneMap.js';
import { ClipSampler, RestPose, boneDirection, findBones, legLength } from './skeletonPose.js';

/** Cuadros por segundo con que se copia la animación. */
export const RETARGET_FPS = 30;

/**
 * @typedef {object} Character un LoadedModel, o algo con la misma forma
 * @property {import('three').Object3D} container
 * @property {Map<import('three').Object3D, { position: Vector3, quaternion: Quaternion, scale: Vector3 }>} restPose
 * @property {Record<string, string>} boneMap
 */

/**
 * Pasa una animación del personaje de origen al de destino. No cambia a ninguno de los dos.
 * @param {Character} source personaje que trae la animación
 * @param {Character} target personaje que la recibe
 * @param {AnimationClip} clip animación del origen
 * @param {{ fps?: number, name?: string }} [options]
 * @returns {{ clip: AnimationClip, keys: string[] }} keys: partes del cuerpo que se pasaron
 */
export function retargetClip( source, target, clip, { fps = RETARGET_FPS, name = clip.name } = {} ) {

	const sourceBones = findBones( source.container );
	const targetBones = findBones( target.container );
	const sourceRest = new RestPose( source.container, source.restPose );
	const targetRest = new RestPose( target.container, target.restPose );

	// Partes con hueso en los dos personajes, de la cadera hacia afuera (los padres antes que los hijos).
	const parts = [];
	/** Alineación de reposo de cada parte (clave → giro A). */
	const aligns = new Map();
	for ( const { key, parent } of HUMANOID_BONES ) {

		const from = sourceBones.get( source.boneMap[ key ] );
		const to = targetBones.get( target.boneMap[ key ] );
		if ( ! from || ! to ) continue;
		const sourceDirection = boneDirection( key, source.boneMap, sourceRest, sourceBones, { guess: false } );
		const targetDirection = boneDirection( key, target.boneMap, targetRest, targetBones, { guess: false } );
		// Si no se sabe hacia dónde apunta (una mano sin dedos), sigue alineado como la parte de la que cuelga.
		const align = sourceDirection && targetDirection
			? new Quaternion().setFromUnitVectors( targetDirection, sourceDirection )
			: inheritedAlign( parent, aligns );
		aligns.set( key, align.clone() );
		parts.push( {
			key,
			from,
			to,
			sourceRestInverse: sourceRest.rotation( from ).invert(),
			// Giro de reposo del destino, ya alineado con el del origen: A · R.
			targetAligned: align.multiply( targetRest.rotation( to ) ),
			values: [],
		} );

	}

	const times = sampleTimes( clip.duration, fps );
	const hips = parts.find( ( part ) => part.key === 'hips' );
	const hipsMotion = hips ? new HipsMotion( hips, source, target, sourceRest, targetRest, sourceBones, targetBones ) : null;
	const sampler = new ClipSampler( source.container, clip );

	const sourceToModel = new Matrix4();
	const matrix = new Matrix4();
	const position = new Vector3();
	const rotation = new Quaternion();
	const scale = new Vector3();

	try {

		for ( const time of times ) {

			sampler.apply( time );
			source.container.updateMatrixWorld( true );
			sourceToModel.copy( source.container.matrixWorld ).invert();

			// Giros de este cuadro en el destino (solo los huesos que se mueven; el resto, en reposo).
			const local = new Map();
			const worlds = new Map();
			const world = ( object ) => {

				if ( ! object || object === target.container ) return new Quaternion();
				let result = worlds.get( object );
				if ( ! result ) {

					result = world( object.parent ).clone().multiply( local.get( object ) || targetRest.quaternion( object ) );
					worlds.set( object, result );

				}

				return result;

			};

			for ( const part of parts ) {

				matrix.multiplyMatrices( sourceToModel, part.from.matrixWorld ).decompose( position, rotation, scale );
				// Giro buscado en el espacio del personaje: D · A · R, con D = giro actual · reposo⁻¹.
				const wanted = rotation.clone().multiply( part.sourceRestInverse ).multiply( part.targetAligned );
				const localRotation = world( part.to.parent ).clone().invert().multiply( wanted );
				local.set( part.to, localRotation );
				part.values.push( ...localRotation.toArray() );
				if ( part === hips ) hipsMotion.add( position );

			}

		}

	} finally {

		sampler.restore();

	}

	const tracks = parts.map( ( part ) => new QuaternionKeyframeTrack( `${ part.to.name }.quaternion`, times, part.values ) );
	const hipsTrack = hipsMotion?.track( times );
	if ( hipsTrack ) tracks.push( hipsTrack );
	return { clip: new AnimationClip( name, clip.duration, tracks ), keys: parts.map( ( part ) => part.key ) };

}

/** Alineación de la parte más cercana de la que cuelga (siguiendo el mapa estándar), o ninguna. */
function inheritedAlign( parent, aligns ) {

	for ( let key = parent; key; key = humanoidBone( key )?.parent ) {

		if ( aligns.has( key ) ) return aligns.get( key ).clone();

	}

	return new Quaternion();

}

/**
 * Momentos en que se copia la animación: repartidos parejos (unos `fps` por segundo) de 0 a la duración.
 * Parejos y no "cada 1/fps": si no, el último cuadro podía quedar a millonésimas del anterior y, guardados
 * en float32 en el GLB, ser iguales (el validador lo rechaza: los tiempos tienen que aumentar siempre).
 */
function sampleTimes( duration, fps ) {

	if ( ! ( duration > 0 ) ) return [ 0 ];
	const count = Math.max( 1, Math.round( duration * fps ) );
	return Array.from( { length: count + 1 }, ( _, i ) => ( i === count ? duration : ( i * duration ) / count ) );

}

/** Desplazamiento de la cadera (saltar, agacharse, caminar), escalado al tamaño del destino. */
class HipsMotion {

	constructor( hips, source, target, sourceRest, targetRest, sourceBones, targetBones ) {

		this.hips = hips;
		this.sourceRest = sourceRest.position( hips.from );
		this.targetRest = targetRest.position( hips.to );
		// Escala: largo de las piernas del destino / del origen (o, sin piernas, altura de la cadera).
		const sourceLegs = legLength( source.boneMap, sourceRest, sourceBones );
		const targetLegs = legLength( target.boneMap, targetRest, targetBones );
		const byHeight = this.sourceRest.y > 1e-3 && this.targetRest.y > 1e-3 ? this.targetRest.y / this.sourceRest.y : 1;
		this.scale = sourceLegs && targetLegs ? targetLegs / sourceLegs : byHeight;
		this.size = targetLegs || Math.abs( this.targetRest.y ) || 1;
		// La cadera se mueve en el espacio de su padre, que queda en reposo.
		this.toParent = targetRest.matrix( hips.to.parent ).invert();
		this.positions = [];
		this.moved = 0;

	}

	/** @param {Vector3} position posición de la cadera del origen en este cuadro (espacio del modelo) */
	add( position ) {

		const offset = position.clone().sub( this.sourceRest ).multiplyScalar( this.scale );
		this.moved = Math.max( this.moved, offset.length() );
		this.positions.push( ...offset.add( this.targetRest ).applyMatrix4( this.toParent ).toArray() );

	}

	/** Pista de posición de la cadera, o null si casi no se mueve. */
	track( times ) {

		if ( this.moved < this.size * 1e-4 ) return null;
		return new VectorKeyframeTrack( `${ this.hips.to.name }.position`, times, this.positions );

	}

}
