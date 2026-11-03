// Ayudantes para las pruebas del núcleo.
import { Scene } from 'three';
import { LoadedModel } from '../../src/core/model.js';
import { createSample } from '../../src/samples/index.js';

/**
 * Abre un ejemplo como si fuera un archivo: lo envuelve en un LoadedModel y lo pone en una escena.
 * @param {string} id 'r15' | 'pesado' | 'piezas'
 * @param {object} [options]
 */
export function openSample( id, options ) {

	const { gltf, fileName } = createSample( id, options );
	const model = new LoadedModel( gltf, fileName );
	const scene = new Scene();
	scene.add( model.container );
	model.container.updateMatrixWorld( true );
	return { model, scene };

}

/** Tamaño de una caja como [x, y, z]. */
export function sizeOf( box ) {

	return [ box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z ];

}

// Humanoide en pose T (también lo usan las pruebas e2e).
export { buildTPoseHumanoid } from '../helpers/humanoid.js';
