// Ajustes del modelo: escala, giros de 90° y "centrar y apoyar en el suelo".
// Todo se aplica al contenedor del modelo (ver model.js), no a los nodos originales.
import * as THREE from 'three';

const AXES = {
	x: new THREE.Vector3( 1, 0, 0 ),
	y: new THREE.Vector3( 0, 1, 0 ),
	z: new THREE.Vector3( 0, 0, 1 ),
};

/** Escala uniforme (1 = tamaño original). */
export function setUniformScale( model, scale ) {

	if ( ! Number.isFinite( scale ) || scale <= 0 ) return;
	model.container.scale.setScalar( scale );
	model.container.updateMatrixWorld( true );

}

export function getUniformScale( model ) {

	return model.container.scale.x;

}

/** Cambia la escala para que el modelo tenga la altura (eje Y) pedida. */
export function scaleToHeight( model, height ) {

	const box = model.getWorldBox();
	const current = box.max.y - box.min.y;
	if ( ! ( current > 0 ) || ! ( height > 0 ) ) return;
	setUniformScale( model, getUniformScale( model ) * ( height / current ) );

}

/** Gira el modelo 90° (o -90°) alrededor de un eje del mundo. */
export function rotate90( model, axis, direction = 1 ) {

	const container = model.container;
	container.rotateOnWorldAxis( AXES[ axis ], ( direction * Math.PI ) / 2 );
	snapRotation( container );
	container.updateMatrixWorld( true );

}

/**
 * Tras varios giros de 90° se acumulan errores mínimos (0,70710677...).
 * Redondeamos la matriz de rotación a -1, 0 y 1 para que quede exacta.
 */
function snapRotation( object ) {

	const m = new THREE.Matrix4().makeRotationFromQuaternion( object.quaternion );
	const e = m.elements;
	for ( const i of [ 0, 1, 2, 4, 5, 6, 8, 9, 10 ] ) e[ i ] = Math.round( e[ i ] );
	object.quaternion.setFromRotationMatrix( m ).normalize();

}

/** Centra el modelo en X/Z y apoya su base en Y = 0. */
export function centerAndGround( model ) {

	const box = model.getWorldBox();
	if ( box.isEmpty() ) return;
	const center = box.getCenter( new THREE.Vector3() );
	const position = model.container.position;
	position.x -= center.x;
	position.z -= center.z;
	position.y -= box.min.y;
	// Quita residuos de cálculo (ej. 0,0000003) relativos al tamaño del modelo.
	const tiny = Math.max( ...box.getSize( new THREE.Vector3() ).toArray() ) * 1e-6;
	for ( const axis of [ 'x', 'y', 'z' ] ) if ( Math.abs( position[ axis ] ) < tiny ) position[ axis ] = 0;
	model.container.updateMatrixWorld( true );

}

/**
 * Copia de los ajustes del modelo (para deshacer y rehacer).
 * @returns {{ position: number[], quaternion: number[], scale: number[] }}
 */
export function getTransformState( model ) {

	const { position, quaternion, scale } = model.container;
	return { position: position.toArray(), quaternion: quaternion.toArray(), scale: scale.toArray() };

}

/** Vuelve a poner unos ajustes guardados con getTransformState(). */
export function setTransformState( model, state ) {

	const container = model.container;
	container.position.fromArray( state.position );
	container.quaternion.fromArray( state.quaternion );
	container.scale.fromArray( state.scale );
	container.updateMatrixWorld( true );

}

/** ¿Son iguales dos estados de ajustes? */
export function sameTransformState( a, b ) {

	const same = ( x, y ) => x.every( ( value, i ) => value === y[ i ] );
	return same( a.position, b.position ) && same( a.quaternion, b.quaternion ) && same( a.scale, b.scale );

}

/** Quita todos los ajustes (vuelve al modelo tal como venía). */
export function resetTransform( model ) {

	const container = model.container;
	container.position.set( 0, 0, 0 );
	container.quaternion.identity();
	container.scale.set( 1, 1, 1 );
	container.updateMatrixWorld( true );

}
