// Animaciones "en el lugar": sin que el personaje avance (como las usa Roblox, donde el que camina es el
// personaje del juego, no la animación). Muchas animaciones de Mixamo o Tripo avanzan: la cadera (o un
// hueso raíz por encima de ella) se desplaza hacia adelante o a un costado.
//
// Aquí se mide cuánto avanza una animación y se quita ese avance: en cada pista de posición de la cadera
// y de los huesos de los que cuelga, la posición horizontal (X y Z en el espacio del personaje) queda fija
// en la del primer cuadro. La altura (Y) no cambia: el rebote al caminar o el salto siguen igual.
import { AnimationClip, Matrix3, PropertyBinding, Vector3 } from 'three';
import { ClipSampler, RestPose, findBones } from './skeletonPose.js';

/** Cuadros por segundo con que se mide el avance. */
const SAMPLE_FPS = 30;

/**
 * Cuánto se aleja la cadera de su lugar del principio, en horizontal (metros, en el espacio del personaje).
 * No cambia el modelo (lo deja como estaba).
 * @param {import('./model.js').LoadedModel} model
 * @param {import('three').AnimationClip} clip
 * @returns {{ distance: number, end: number }} distance: lo más lejos que llega; end: dónde termina
 */
export function rootMotion( model, clip ) {

	const hips = findBones( model.container ).get( model.boneMap.hips );
	if ( ! hips ) return { distance: 0, end: 0 };
	const sampler = new ClipSampler( model.container, clip );
	const container = model.container;
	const position = new Vector3();
	const at = ( time ) => {

		sampler.apply( time );
		container.updateMatrixWorld( true );
		return container.worldToLocal( hips.getWorldPosition( position ) ).clone();

	};

	try {

		const start = at( 0 );
		const horizontal = ( point ) => Math.hypot( point.x - start.x, point.z - start.z );
		const count = Math.max( 1, Math.ceil( clip.duration * SAMPLE_FPS ) );
		let distance = 0;
		for ( let i = 1; i <= count; i ++ ) distance = Math.max( distance, horizontal( at( ( i / count ) * clip.duration ) ) );
		return { distance, end: horizontal( at( clip.duration ) ) };

	} finally {

		sampler.restore();

	}

}

/**
 * Desde cuántos metros vale la pena avisar que una animación avanza: el 3 % de la altura del modelo
 * (unos 4 cm en un personaje de 1,5 m); menos que eso es un balanceo normal.
 * @param {import('./model.js').LoadedModel} model
 */
export function noticeableMotion( model ) {

	const box = model.localBox;
	const height = box && ! box.isEmpty() ? box.max.y - box.min.y : 1;
	return Math.max( 0.01, 0.03 * height );

}

/**
 * Copia de la animación sin avance: en las pistas de posición de la cadera y de sus huesos padres, la
 * posición horizontal queda fija en la del primer cuadro. El resto de la animación queda igual.
 * @param {import('./model.js').LoadedModel} model
 * @param {import('three').AnimationClip} clip
 * @returns {AnimationClip}
 */
export function makeInPlace( model, clip ) {

	const container = model.container;
	const rest = new RestPose( container, model.restPose );
	// La cadera y los nodos de los que cuelga (dentro del modelo).
	const chain = new Set();
	for ( let node = findBones( container ).get( model.boneMap.hips ); node && node !== container; node = node.parent ) chain.add( node );

	const tracks = clip.tracks.map( ( track ) => {

		const { nodeName, propertyName } = PropertyBinding.parseTrackName( track.name );
		const node = propertyName === 'position' ? PropertyBinding.findNode( container, nodeName ) : null;
		if ( ! node || ! chain.has( node ) ) return track.clone();

		// Posición en el espacio del personaje: matriz de reposo del padre · posición local.
		const toModel = rest.matrix( node.parent );
		const toLocal = toModel.clone().invert();
		const turnToModel = new Matrix3().setFromMatrix4( toModel );
		const turnToLocal = turnToModel.clone().invert();
		// glTF "CUBICSPLINE" guarda por cuadro [tangente de entrada, valor, tangente de salida] (9 números).
		const stride = track.values.length / track.times.length;
		const offset = stride === 9 ? 3 : 0;
		const result = track.clone(); // conserva la interpolación de la pista original
		const values = result.values;
		const point = new Vector3();
		const first = new Vector3().fromArray( values, offset ).applyMatrix4( toModel );
		for ( let i = 0; i < values.length; i += stride ) {

			point.fromArray( values, i + offset ).applyMatrix4( toModel );
			point.x = first.x;
			point.z = first.z;
			point.applyMatrix4( toLocal ).toArray( values, i + offset );
			if ( stride === 9 ) {

				// Las tangentes son velocidades: sin avance horizontal.
				for ( const tangent of [ i, i + 6 ] ) {

					point.fromArray( values, tangent ).applyMatrix3( turnToModel );
					point.x = 0;
					point.z = 0;
					point.applyMatrix3( turnToLocal ).toArray( values, tangent );

				}

			}

		}

		return result;

	} );

	return new AnimationClip( clip.name, clip.duration, tracks );

}
