// Modelo de varias piezas: un carrito con 8 mallas, grupos anidados, varios materiales,
// una malla con varios materiales (la cabina) y una geometría compartida (las 4 ruedas).
import * as THREE from 'three';

/** @returns {{ scene: THREE.Group, animations: THREE.AnimationClip[] }} */
export function createMultiPart() {

	const paint = material( 'Pintura', 0xd23b3b, { roughness: 0.4 } );
	const roof = material( 'Techo', 0xf2f2f2, { roughness: 0.5 } );
	const glass = material( 'Vidrio', 0x7fc8ff, { roughness: 0.1, metalness: 0.2 } );
	const tire = material( 'Goma', 0x222222, { roughness: 0.9 } );
	const light = material( 'Faro', 0xfff2a8, { emissive: 0xffe066, emissiveIntensity: 0.8 } );

	const car = new THREE.Group();
	car.name = 'Carrito';

	// Mira hacia +Z (el frente en glTF).
	const body = mesh( 'Chasis', new THREE.BoxGeometry( 0.8, 0.4, 1.6 ), paint );
	body.position.y = 0.45;

	// Cabina: caja con 6 caras; los vidrios adelante y atrás, el techo arriba.
	// Orden de las caras de BoxGeometry: +X, -X, +Y, -Y, +Z, -Z.
	const cabin = mesh( 'Cabina', new THREE.BoxGeometry( 0.7, 0.45, 0.8 ), [ paint, paint, roof, paint, glass, glass ] );
	cabin.position.set( 0, 0.875, - 0.15 );

	// Las 4 ruedas comparten la misma geometría (como pasa en muchos modelos).
	const wheels = new THREE.Group();
	wheels.name = 'Ruedas';
	const wheelGeometry = new THREE.CylinderGeometry( 0.22, 0.22, 0.16, 24 );
	wheelGeometry.rotateZ( Math.PI / 2 );
	wheelGeometry.name = 'Rueda';
	for ( const [ name, x, z ] of [
		[ 'RuedaDelanteraIzquierda', 0.42, 0.5 ], [ 'RuedaDelanteraDerecha', - 0.42, 0.5 ],
		[ 'RuedaTraseraIzquierda', 0.42, - 0.5 ], [ 'RuedaTraseraDerecha', - 0.42, - 0.5 ],
	] ) {

		const wheel = mesh( name, wheelGeometry, tire );
		wheel.position.set( x, 0.22, z );
		wheels.add( wheel );

	}

	const lights = [ 0.25, - 0.25 ].map( ( x, i ) => {

		const lamp = mesh( i === 0 ? 'FaroIzquierdo' : 'FaroDerecho', new THREE.SphereGeometry( 0.07, 16, 8 ), light );
		lamp.position.set( x, 0.5, 0.8 );
		return lamp;

	} );

	car.add( body, cabin, wheels, ...lights );

	const scene = new THREE.Group();
	scene.add( car );
	return { scene, animations: [] };

}

function material( name, color, options = {} ) {

	const result = new THREE.MeshStandardMaterial( { color, ...options } );
	result.name = name;
	return result;

}

function mesh( name, geometry, materials ) {

	const result = new THREE.Mesh( geometry, materials );
	result.name = name;
	return result;

}
