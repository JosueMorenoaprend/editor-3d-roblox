// Ayudantes para revisar archivos GLB con el validador oficial de Khronos (gltf-validator).
// Se usan en las pruebas de Vitest y de Playwright.
import * as validatorModule from 'gltf-validator';

const validator = validatorModule.default ?? validatorModule;

const SEVERITY = [ 'error', 'aviso', 'info', 'pista' ];

/**
 * Avisos que se aceptan (con su motivo). Los errores nunca se aceptan.
 * - NODE_SKINNED_MESH_NON_ROOT: la malla con esqueleto cuelga del contenedor del editor, como en
 *   los GLB de Blender y Tripo. glTF y three.js la dibujan igual (la mueven los huesos). Se revisará
 *   al “aplicar escala y giro al exportar” (tarea F4-07 de MEJORAS.md).
 */
export const ALLOWED_WARNINGS = new Set( [ 'NODE_SKINNED_MESH_NON_ROOT' ] );

/**
 * Valida un GLB.
 * @param {ArrayBuffer|Uint8Array} bytes
 * @param {string} [uri] nombre del archivo (solo para los mensajes)
 */
export async function validateGLB( bytes, uri = 'modelo.glb' ) {

	const data = bytes instanceof Uint8Array ? bytes : new Uint8Array( bytes );
	const report = await validator.validateBytes( data, { uri, maxIssues: 500, writeTimestamp: false } );
	const messages = report.issues.messages;
	return {
		report,
		errors: messages.filter( ( m ) => m.severity === 0 ),
		/** Avisos que no están en ALLOWED_WARNINGS (las pruebas exigen 0). */
		warnings: messages.filter( ( m ) => m.severity === 1 && ! ALLOWED_WARNINGS.has( m.code ) ),
		allowedWarnings: messages.filter( ( m ) => m.severity === 1 && ALLOWED_WARNINGS.has( m.code ) ),
		infos: messages.filter( ( m ) => m.severity >= 2 ),
	};

}

/** Lee el JSON de un GLB (para revisar imágenes, animaciones, nodos…). */
export function readGLBJson( bytes ) {

	const data = bytes instanceof Uint8Array ? bytes : new Uint8Array( bytes );
	const view = new DataView( data.buffer, data.byteOffset, data.byteLength );
	if ( view.getUint32( 0, true ) !== 0x46546C67 ) throw new Error( 'No es un GLB (falta la firma "glTF").' );
	const jsonLength = view.getUint32( 12, true );
	const text = new TextDecoder().decode( data.subarray( 20, 20 + jsonLength ) );
	return JSON.parse( text );

}

/** Texto legible con los problemas, para los mensajes de las pruebas. */
export function describeIssues( messages ) {

	if ( messages.length === 0 ) return '(ninguno)';
	return messages.map( ( m ) => `[${ SEVERITY[ m.severity ] }] ${ m.code } ${ m.pointer || '' }: ${ m.message }` ).join( '\n' );

}
