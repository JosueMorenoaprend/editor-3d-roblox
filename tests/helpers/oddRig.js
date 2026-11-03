// Personaje de prueba con algunos huesos de nombres que el detector no reconoce (como puede pasar con
// archivos de Tripo u otros programas). Sirve para probar el mapa de huesos hecho a mano.
// Se genera por código a partir del muñeco R15 de ejemplo: no usa archivos de terceros.
import './fileReader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createR15Dummy } from '../../src/samples/r15Dummy.js';

/** Huesos que se renombran (nombre R15 → nombre sin sentido). */
export const ODD_NAMES = { LeftHand: 'Bone_07', RightFoot: 'Bone_12' };

/**
 * GLB del muñeco R15 con los huesos de ODD_NAMES renombrados y sin animaciones.
 * @returns {Promise<Buffer>}
 */
export async function createOddRigGLB( renames = ODD_NAMES ) {

	const { scene } = createR15Dummy();
	scene.traverse( ( object ) => {

		if ( object.isBone && renames[ object.name ] ) object.name = renames[ object.name ];

	} );
	const result = await new GLTFExporter().parseAsync( scene, { binary: true } );
	return Buffer.from( result );

}
