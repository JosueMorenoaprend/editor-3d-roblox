// Archivos de animación generados por código para las pruebas e2e (sin archivos de terceros).
import './fileReader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createBoneTestClip } from '../../src/core/boneTest.js';
import { buildTPoseHumanoid } from './humanoid.js';

/**
 * GLB con SOLO una animación ("Baile", 2,4 s) de un esqueleto tipo Mixamo: nombres "mixamorig…", pose T
 * y los ejes de cada hueso girados. Sin malla ni piel, como una animación de Mixamo convertida "sin cuerpo".
 * @returns {Promise<Buffer>}
 */
export async function createMixamoDanceGLB() {

	const rig = buildTPoseHumanoid( { twisted: true, prefix: 'mixamorig' } );
	const { clip } = createBoneTestClip( rig, rig.boneMap, [ 'leftUpperArm', 'rightUpperArm', 'leftUpperLeg' ] );
	clip.name = 'Baile';
	const glb = await new GLTFExporter().parseAsync( rig.container, { binary: true, animations: [ clip ] } );
	return Buffer.from( glb );

}
