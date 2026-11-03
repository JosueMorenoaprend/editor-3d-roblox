// Agregar a mi personaje las animaciones de otro archivo (por ejemplo, un GLB de Tripo con una animación
// o una animación de Mixamo convertida a GLB). Se reconoce el esqueleto del archivo con su propio mapa
// de huesos y cada animación se pasa a los huesos de mi personaje (retarget.js).
import { PropertyBinding } from 'three';
import { detectBoneMap } from './boneDetect.js';
import { REQUIRED_BONES, validateBoneMap } from './boneMap.js';
import { UserError } from './errors.js';
import { LoadedModel } from './model.js';
import { retargetClip } from './retarget.js';

/**
 * @param {{ scene: import('three').Object3D, animations?: import('three').AnimationClip[] }} gltf el archivo
 *   ya abierto (loadModelFromFiles / parseGLB). Sus nodos se usan y después se liberan.
 * @param {string} fileName
 * @param {import('./model.js').LoadedModel} target mi personaje
 * @returns {{ clips: import('three').AnimationClip[], kind: string, missing: string[] }}
 *   clips: las animaciones ya pasadas a mi personaje (con nombres que no se repiten)
 *   kind: tipo de esqueleto del archivo ("Mixamo"…); missing: partes necesarias que el archivo no mueve
 */
export function importAnimations( gltf, fileName, target ) {

	// 1. Mi personaje necesita su mapa de huesos completo: si no, no sé a qué hueso pasar cada movimiento.
	if ( ! validateBoneMap( target.boneMap, target.container ).ok ) {

		throw new UserError( 'Primero completa el mapa de huesos de tu personaje (sección «Mapa de huesos»): ' +
			'sin eso no sé a qué hueso pasar cada movimiento.' );

	}

	// 2. El archivo tiene que traer animaciones.
	const clips = ( gltf.animations || [] ).filter( ( clip ) => clip.tracks.length > 0 );
	if ( clips.length === 0 ) {

		throw new UserError( `«${ fileName }» no trae animaciones. Elige un archivo que tenga una animación ` +
			'(por ejemplo, un GLB de Tripo AI descargado con una animación, o una de Mixamo convertida a GLB).' );

	}

	const source = new LoadedModel( gltf, fileName );
	try {

		// 3. Su esqueleto. Un archivo con solo la animación (sin el cuerpo) no tiene "huesos" para three.js:
		//    entonces los huesos son los nodos que la animación mueve.
		markAnimatedNodesAsBones( source, clips );
		const detected = detectBoneMap( source.container );
		source.boneMap = detected.boneMap;
		if ( ! detected.boneMap.hips ) {

			throw new UserError( `No reconozco el esqueleto de «${ fileName }», así que no sé qué parte del cuerpo ` +
				'mueve cada animación. Prueba con una animación de Tripo AI o de Mixamo; si quieres ver sus huesos, ' +
				'ábrelo con «Abrir modelo» y mira su «Mapa de huesos».' );

		}

		// 4. Pasar cada animación, sin repetir nombres con las que ya tiene mi personaje.
		const names = new Set( target.clips.map( ( clip ) => clip.name ) );
		const result = clips.map( ( clip, i ) => {

			const name = uniqueName( clip.name || `Animación ${ i + 1 }`, names );
			names.add( name );
			return retargetClip( source, target, clip, { name } ).clip;

		} );

		const missing = REQUIRED_BONES.filter( ( key ) => target.boneMap[ key ] && ! detected.boneMap[ key ] );
		return { clips: result, kind: detected.kind, missing };

	} finally {

		source.dispose();

	}

}

/**
 * Si el archivo no tiene huesos, marca como huesos los nodos del esqueleto que mueven las animaciones:
 * todo el árbol que los contiene (también las partes que esta animación no mueve, para saber hacia dónde
 * apunta cada hueso y cuál es su pose de reposo). El modelo de origen se descarta al terminar.
 */
function markAnimatedNodesAsBones( model, clips ) {

	let hasBones = false;
	model.container.traverse( ( object ) => {

		if ( object.isBone ) hasBones = true;

	} );
	if ( hasBones ) return;

	// Raíz de cada esqueleto: el nodo que cuelga directamente del contenedor.
	const roots = new Set();
	for ( const clip of clips ) {

		for ( const track of clip.tracks ) {

			const { nodeName } = PropertyBinding.parseTrackName( track.name );
			let node = PropertyBinding.findNode( model.container, nodeName );
			if ( ! node || node === model.container ) continue;
			while ( node.parent && node.parent !== model.container ) node = node.parent;
			roots.add( node );

		}

	}

	for ( const root of roots ) {

		root.traverse( ( object ) => {

			if ( ! object.isMesh ) object.isBone = true;

		} );

	}

}

/** "Correr" → "Correr (2)" si ya existe. */
function uniqueName( name, taken ) {

	if ( ! taken.has( name ) ) return name;
	let n = 2;
	while ( taken.has( `${ name } (${ n })` ) ) n ++;
	return `${ name } (${ n })`;

}
