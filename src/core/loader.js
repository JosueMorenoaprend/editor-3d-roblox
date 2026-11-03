// Carga de modelos .glb / .gltf (también comprimidos con Draco o Meshopt).
import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

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

		throw new Error( 'No encontré ningún archivo .glb o .gltf entre los que elegiste.' );

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

			throw new Error(
				`Este .gltf usa archivos externos que no elegiste (${ [ ...missing ].join( ', ' ) }). ` +
				'Elige o arrastra todos los archivos juntos, o usa la versión .glb.'
			);

		}

		throw error;

	} finally {

		for ( const url of extraUrls.values() ) URL.revokeObjectURL( url );

	}

}

/** Lee un GLB desde memoria (se usa para comprobar el archivo exportado). */
export function parseGLB( arrayBuffer ) {

	return createLoader( new LoadingManager() ).parseAsync( arrayBuffer, '' );

}
