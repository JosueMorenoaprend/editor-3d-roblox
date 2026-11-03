// Exportación a .glb con GLTFExporter (incluye esqueleto, animaciones y ajustes).
import { Scene } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { parseGLB } from './loader.js';
import { computeModelInfo } from './info.js';
import { LoadedModel } from './model.js';

// Formatos de imagen que Roblox Studio acepta dentro de un GLB.
const SAFE_MIME = new Set( [ 'image/png', 'image/jpeg' ] );

/** Versión del formato de proyecto (un GLB normal con datos extra del editor). */
export const PROJECT_FORMAT = 1;

/**
 * Exporta el GLB para Roblox.
 * @param {import('./model.js').LoadedModel} model
 * @param {{ animations?: boolean, maxTextureSize?: number }} options
 * @returns {Promise<{ blob: Blob, arrayBuffer: ArrayBuffer }>}
 */
export function exportGLB( model, { animations = true, maxTextureSize = Infinity } = {} ) {

	// Las texturas WebP/KTX2 se guardan como PNG (Roblox no las lee dentro del GLB).
	return writeGLB( model, {
		clips: animations ? model.clips : [],
		maxTextureSize,
		textureMime: ( mime ) => ( SAFE_MIME.has( mime ) ? null : 'image/png' ),
	} );

}

/**
 * Guarda el proyecto: un GLB que conserva todo el trabajo para seguir otro día.
 * - Los ajustes del editor (escala, giro, posición) quedan como ajustes, no "pegados" al modelo:
 *   al abrirlo, "Quitar ajustes" sigue funcionando.
 * - Todas las animaciones y las texturas a tamaño completo y sin pérdida (PNG).
 * - Sigue siendo un GLB normal: cualquier visor lo abre.
 * @param {import('./model.js').LoadedModel} model
 * @param {{ appVersion?: string }} [options]
 */
export async function exportProject( model, { appVersion = '' } = {} ) {

	const container = model.container;
	const userData = container.userData;
	container.userData = { ...userData, editor3dRoblox: { type: 'contenedor' } };
	try {

		return await writeGLB( model, {
			clips: model.clips,
			maxTextureSize: Infinity,
			textureMime: () => 'image/png',
			sceneUserData: {
				editor3dRoblox: {
					kind: 'proyecto',
					format: PROJECT_FORMAT,
					baseName: model.baseName,
					fileName: model.fileName,
					appVersion,
					savedAt: new Date().toISOString(),
				},
			},
		} );

	} finally {

		container.userData = userData;

	}

}

/** Escribe el GLB. El contenedor del modelo (con sus ajustes) queda como nodo raíz. */
async function writeGLB( model, { clips, maxTextureSize, textureMime, sceneUserData = {} } ) {

	const container = model.container;

	// Escena temporal. El contenedor se agrega a su lista de hijos SIN sacarlo de la escena del
	// visor (como hace GLTFExporter por dentro): así el modelo no "parpadea" al exportar.
	const scene = new Scene();
	scene.name = model.baseName;
	scene.userData = sceneUserData;
	scene.children.push( container );

	const restoreTextures = overrideImageFormats( container, textureMime );

	try {

		const result = await new GLTFExporter().parseAsync( scene, {
			binary: true,
			trs: true,
			onlyVisible: true,
			animations: clips,
			maxTextureSize,
		} );

		return { blob: new Blob( [ result ], { type: 'model/gltf-binary' } ), arrayBuffer: result };

	} finally {

		restoreTextures();
		scene.children.length = 0;

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
 * Cambia (solo mientras se exporta) el formato con que se guarda cada textura.
 * `choose( mimeActual )` devuelve el formato nuevo, o null para dejarlo igual.
 * Devuelve una función que deja todo como estaba.
 */
function overrideImageFormats( root, choose ) {

	const changed = [];
	root.traverse( ( object ) => {

		const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
		for ( const material of materials ) {

			if ( ! material ) continue;
			for ( const value of Object.values( material ) ) {

				if ( ! value || ! value.isTexture || changed.some( ( c ) => c.texture === value ) ) continue;
				const mime = value.userData.mimeType;
				const next = choose( mime );
				if ( next && next !== mime ) {

					changed.push( { texture: value, mime } );
					value.userData.mimeType = next;

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
