// Reducir polígonos en el mismo hilo de la página (la página espera hasta que termina).
// Lo usan las pruebas en Node. La interfaz usa simplifyMeshesAsync() de simplify.js,
// que trabaja en un Web Worker y no congela la página.
import { applySimplification, planSimplification } from './simplify.js';
import { simplifyGeometry } from './simplifyGeometry.js';

export { simplifierReady, simplifyGeometry } from './simplifyGeometry.js';

/**
 * Reduce varias mallas a un número de triángulos por malla.
 * @param {import('three').Mesh[]} meshes
 * @param {number} targetTriangles triángulos objetivo POR MALLA
 * @param {{ permissive?: boolean }} options permissive: permite cruzar costuras de UV
 */
export function simplifyMeshes( meshes, targetTriangles, options = {} ) {

	const plan = planSimplification( meshes, targetTriangles, options );
	const outputs = new Map();
	for ( const job of plan.jobs ) {

		outputs.set( job, simplifyGeometry( job.original, job.targetTriangles, job.options ).geometry );

	}

	return applySimplification( plan, outputs );

}
