// Exportación a .glb con GLTFExporter (incluye esqueleto, animaciones y ajustes).
import { Scene } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { parseGLB } from './loader.js';
import { computeModelInfo } from './info.js';
import { LoadedModel } from './model.js';

// Formatos de imagen que Roblox Studio acepta dentro de un GLB.
const SAFE_MIME = new Set( [ 'image/png', 'image/jpeg' ] );

/**
 * @param {import('./model.js').LoadedModel} model
 * @param {{ animations?: boolean, maxTextureSize?: number }} options
 * @returns {Promise<{ blob: Blob, arrayBuffer: ArrayBuffer }>}
 */
export async function exportGLB( model, { animations = true, maxTextureSize = Infinity } = {} ) {

	const container = model.container;
	const parent = container.parent;

	// Escena temporal: así el contenedor (con escala, giro y posición) es el nodo raíz.
	const scene = new Scene();
	scene.name = model.baseName;
	scene.add( container );

	const restoreTextures = useSafeImageFormats( container );

	try {

		const result = await new GLTFExporter().parseAsync( scene, {
			binary: true,
			trs: true,
			onlyVisible: true,
			animations: animations ? model.clips : [],
			maxTextureSize,
		} );

		return { blob: new Blob( [ result ], { type: 'model/gltf-binary' } ), arrayBuffer: result };

	} finally {

		restoreTextures();
		if ( parent ) parent.add( container );
		else scene.remove( container );
		container.updateMatrixWorld( true );

	}

}

/**
 * Vuelve a abrir el archivo exportado para comprobar que está bien.
 * @returns {Promise<{ triangles: number, meshes: number, bones: number, animations: number, meshesOverLimit: number, size: object }>}
 */
export async function verifyGLB( arrayBuffer, triangleLimit ) {

	const gltf = await parseGLB( arrayBuffer );
	const model = new LoadedModel( gltf, 'verificacion.glb' );
	const info = computeModelInfo( model, triangleLimit );
	const summary = {
		triangles: info.totalTriangles,
		meshes: info.meshes.length,
		bones: info.boneCount,
		animations: info.animations.length,
		meshesOverLimit: info.meshesOverLimit,
		size: info.size,
	};
	model.dispose();
	return summary;

}

/** Descarga un Blob como archivo. */
export function downloadBlob( blob, fileName ) {

	const url = URL.createObjectURL( blob );
	const link = document.createElement( 'a' );
	link.href = url;
	link.download = fileName;
	document.body.appendChild( link );
	link.click();
	link.remove();
	setTimeout( () => URL.revokeObjectURL( url ), 2000 );

}

/**
 * Las texturas WebP/KTX2 se guardan como PNG (Roblox no las lee dentro del GLB).
 * Devuelve una función que deja todo como estaba.
 */
function useSafeImageFormats( root ) {

	const changed = [];
	root.traverse( ( object ) => {

		const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
		for ( const material of materials ) {

			if ( ! material ) continue;
			for ( const value of Object.values( material ) ) {

				if ( ! value || ! value.isTexture ) continue;
				const mime = value.userData.mimeType;
				if ( ! SAFE_MIME.has( mime ) && ! changed.some( ( c ) => c.texture === value ) ) {

					changed.push( { texture: value, mime } );
					value.userData.mimeType = 'image/png';

				}

			}

		}

	} );

	return () => {

		for ( const { texture, mime } of changed ) {

			if ( mime === undefined ) delete texture.userData.mimeType;
			else texture.userData.mimeType = mime;

		}

	};

}
