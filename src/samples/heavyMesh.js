// Malla pesada con textura, como las que genera Tripo AI: una sola malla con muchos
// triángulos (120.000 por defecto) y una textura de colores para ver si se deforma al reducir.
import * as THREE from 'three';

/**
 * @param {{ texture?: boolean }} options texture: false crea la malla sin textura
 * @returns {{ scene: THREE.Group, animations: THREE.AnimationClip[] }}
 */
export function createHeavyMesh( { texture = true } = {} ) {

	// Nudo: 600 × 100 segmentos × 2 = 120.000 triángulos.
	const geometry = new THREE.TorusKnotGeometry( 0.5, 0.17, 600, 100 );
	geometry.name = 'NudoPesado';

	const material = new THREE.MeshStandardMaterial( { roughness: 0.55, metalness: 0 } );
	material.name = 'Pintura';
	if ( texture ) material.map = createPatternTexture( 256 );

	const mesh = new THREE.Mesh( geometry, material );
	mesh.name = 'NudoPesado';
	mesh.position.y = 0.9;

	const scene = new THREE.Group();
	scene.add( mesh );
	return { scene, animations: [] };

}

/** Textura de cuadros de colores (RGBA de 8 bits), generada en memoria. */
export function createPatternTexture( size ) {

	const data = new Uint8Array( size * size * 4 );
	const color = new THREE.Color();
	const rgb = { r: 0, g: 0, b: 0 };
	const cell = size / 16;
	for ( let y = 0; y < size; y ++ ) {

		for ( let x = 0; x < size; x ++ ) {

			// Cuadros claros y oscuros; el tono cambia de izquierda a derecha.
			const dark = ( Math.floor( x / cell ) + Math.floor( y / cell ) ) % 2 === 0;
			color.setHSL( x / size, 0.65, dark ? 0.35 : 0.65, THREE.SRGBColorSpace );
			color.getRGB( rgb, THREE.SRGBColorSpace );
			const i = ( y * size + x ) * 4;
			data[ i ] = Math.round( rgb.r * 255 );
			data[ i + 1 ] = Math.round( rgb.g * 255 );
			data[ i + 2 ] = Math.round( rgb.b * 255 );
			data[ i + 3 ] = 255;

		}

	}

	const texture = new THREE.DataTexture( data, size, size, THREE.RGBAFormat );
	texture.name = 'Cuadros';
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.needsUpdate = true;
	return texture;

}
