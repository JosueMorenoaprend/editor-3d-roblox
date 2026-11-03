// Carga de modelos .glb / .gltf (también comprimidos con Draco o Meshopt) y de animaciones .fbx (Mixamo).
import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { UserError } from './errors.js';

// Decodificador Draco (versión para glTF). Vite copia sus archivos al compilar
// y solo se descargan si el modelo viene comprimido con Draco.
const dracoLoader = new DRACOLoader().setDecoderPath( DRACO_GLTF_CONFIG );

const MODEL_EXT = /\.(glb|gltf)$/i;

function createLoader( manager ) {

	return new GLTFLoader( manager )
		.setDRACOLoader( dracoLoader )
		.setMeshoptDecoder( MeshoptDecoder );

}

function fileNameFromUrl( url ) {

	const clean = url.split( /[?#]/ )[ 0 ];
	const name = clean.split( /[\\/]/ ).pop();
	try {

		return decodeURIComponent( name ).toLowerCase();

	} catch {

		return name.toLowerCase();

	}

}

/**
 * Abre un modelo a partir de los archivos que eligió el usuario.
 * Para un .gltf con archivos aparte (.bin, texturas) hay que elegirlos todos juntos.
 * @param {FileList|File[]} fileList
 */
export async function loadModelFromFiles( fileList ) {

	const files = Array.from( fileList );
	const main = files.find( ( f ) => MODEL_EXT.test( f.name ) );
	if ( ! main ) {

		throw new UserError( 'No encontré ningún archivo .glb o .gltf entre los que elegiste. ' +
			'Elige un archivo que termine en .glb o .gltf (Tripo AI los descarga en GLB).' );

	}

	// Archivos extra (para .gltf): se sirven desde memoria con URLs temporales.
	const extraUrls = new Map();
	for ( const file of files ) {

		if ( file !== main ) extraUrls.set( file.name.toLowerCase(), URL.createObjectURL( file ) );

	}

	const missing = new Set();
	const manager = new LoadingManager();
	manager.setURLModifier( ( url ) => {

		if ( /^(data|blob):/i.test( url ) ) return url;
		const name = fileNameFromUrl( url );
		if ( extraUrls.has( name ) ) return extraUrls.get( name );
		missing.add( name );
		return url;

	} );

	try {

		const buffer = await main.arrayBuffer();
		const gltf = await createLoader( manager ).parseAsync( buffer, '' );
		return { gltf, fileName: main.name, fileSize: main.size, missing: [ ...missing ] };

	} catch ( error ) {

		if ( missing.size > 0 ) {

			throw new UserError(
				`Este .gltf usa archivos externos que no elegiste (${ [ ...missing ].join( ', ' ) }). ` +
				'Elige o arrastra todos los archivos juntos, o usa la versión .glb.', { cause: error }
			);

		}

		throw new UserError(
			`No pude leer "${ main.name }": el archivo está dañado o no es un modelo glTF válido. ` +
			'Prueba descargarlo otra vez (por ejemplo, desde Tripo AI) o exportarlo de nuevo como GLB. ' +
			`Detalle técnico: ${ error && error.message ? error.message : error }`, { cause: error }
		);

	} finally {

		for ( const url of extraUrls.values() ) URL.revokeObjectURL( url );

	}

}

/** Lee un GLB desde memoria (se usa para comprobar el archivo exportado). */
export function parseGLB( arrayBuffer ) {

	return createLoader( new LoadingManager() ).parseAsync( arrayBuffer, '' );

}

const FBX_EXT = /\.fbx$/i;

/** Imagen vacía (1×1 transparente) para las texturas externas de un FBX: no se pide nada a internet. */
const EMPTY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Abre un archivo con animaciones: .glb / .gltf (igual que loadModelFromFiles) o .fbx (por ejemplo, de
 * Mixamo). El lector de FBX se descarga solo la primera vez que hace falta.
 * @param {FileList|File[]} fileList
 * @returns {Promise<{ gltf: { scene: import('three').Object3D, animations: import('three').AnimationClip[] }, fileName: string, fileSize: number, missing: string[] }>}
 */
export async function loadAnimationFiles( fileList ) {

	const files = Array.from( fileList );
	const fbx = files.find( ( file ) => FBX_EXT.test( file.name ) );
	if ( ! fbx ) return loadModelFromFiles( files );

	const { FBXLoader } = await import( 'three/addons/loaders/FBXLoader.js' );
	// Las texturas que el FBX nombra pero no trae adentro no se buscan: solo interesa la animación.
	const manager = new LoadingManager();
	manager.setURLModifier( ( url ) => ( /^(data|blob):/i.test( url ) ? url : EMPTY_PNG ) );
	try {

		const group = new FBXLoader( manager ).parse( await fbx.arrayBuffer(), '' );
		return { gltf: { scene: group, animations: group.animations || [] }, fileName: fbx.name, fileSize: fbx.size, missing: [] };

	} catch ( error ) {

		throw new UserError(
			`No pude leer "${ fbx.name }": el archivo está dañado o es un FBX muy viejo (se necesita FBX 2011 o más nuevo). ` +
			'Si es de Mixamo, descárgalo otra vez en formato FBX Binary. ' +
			`Detalle técnico: ${ error && error.message ? error.message : error }`, { cause: error }
		);

	}

}
