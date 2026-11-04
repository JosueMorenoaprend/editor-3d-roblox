// Modelos de ejemplo generados por código: sirven para probar el editor sin tener
// modelos propios y para las pruebas automáticas. No usan archivos de terceros.
import { createHeavyMesh } from './heavyMesh.js';
import { createMultiPart } from './multiPart.js';
import { createR15Dummy } from './r15Dummy.js';

export const SAMPLES = [
	{
		id: 'r15',
		title: 'Muñeco R15',
		description: 'Personaje con 16 huesos y 3 animaciones',
		fileName: 'muneco_r15.glb',
		create: createR15Dummy,
	},
	{
		id: 'pesado',
		title: 'Malla pesada',
		description: '120.000 triángulos con textura',
		fileName: 'malla_pesada.glb',
		create: createHeavyMesh,
	},
	{
		id: 'piezas',
		title: 'Carrito de piezas',
		description: '8 piezas y varios materiales',
		fileName: 'carrito_piezas.glb',
		create: createMultiPart,
	},
];

/**
 * Crea un ejemplo por su id.
 * @param {string} id
 * @param {object} [options] opciones del generador
 * @returns {{ gltf: { scene: import('three').Group, animations: import('three').AnimationClip[] }, fileName: string }}
 */
export function createSample( id, options ) {

	const sample = SAMPLES.find( ( item ) => item.id === id );
	if ( ! sample ) throw new Error( `No existe el ejemplo "${ id }".` );
	return { gltf: sample.create( options ), fileName: sample.fileName };

}
