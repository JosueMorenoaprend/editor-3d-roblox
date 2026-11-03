// Archivos de animación generados por código para las pruebas e2e (sin archivos de terceros).
import './fileReader.js';
import { VectorKeyframeTrack } from 'three';
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

/**
 * GLB con solo una animación ("Correr", 1,6 s) que AVANZA: la cadera recorre 3 m hacia adelante mientras
 * las piernas se mueven, como una animación de Mixamo descargada sin "In Place".
 * @returns {Promise<Buffer>}
 */
export async function createMixamoRunForwardGLB() {

	const rig = buildTPoseHumanoid( { twisted: true, prefix: 'mixamorig' } );
	const { clip } = createBoneTestClip( rig, rig.boneMap, [ 'leftUpperLeg', 'rightUpperLeg' ] );
	clip.name = 'Correr';
	const hips = rig.container.getObjectByName( 'mixamorigHips' ).position;
	clip.tracks.push( new VectorKeyframeTrack( 'mixamorigHips.position', [ 0, clip.duration ], [ hips.x, hips.y, hips.z, hips.x, hips.y, hips.z + 3 ] ) );
	const glb = await new GLTFExporter().parseAsync( rig.container, { binary: true, animations: [ clip ] } );
	return Buffer.from( glb );

}
