// Web Worker: reduce polígonos en un hilo aparte, así la página no se congela.
// Recibe { id, geometry, targetTriangles, options } y responde con mensajes:
//   { id, type: 'progress', fraction }   avance de 0 a 1
//   { id, type: 'result', geometry }     geometría reducida (empaquetada)
//   { id, type: 'error', message }
import { packGeometry, unpackGeometry } from './geometryTransfer.js';
import { simplifierReady, simplifyGeometry } from './simplifyGeometry.js';

self.addEventListener( 'message', async ( event ) => {

	const { id, geometry, targetTriangles, options } = event.data;
	try {

		await simplifierReady;
		const source = unpackGeometry( geometry );
		const { geometry: result } = simplifyGeometry( source, targetTriangles, {
			...options,
			onStage: ( fraction ) => self.postMessage( { id, type: 'progress', fraction } ),
		} );
		const packed = packGeometry( result, { copy: false } );
		self.postMessage( { id, type: 'result', geometry: packed.data }, packed.transfer );

	} catch ( error ) {

		self.postMessage( { id, type: 'error', message: error && error.message ? error.message : String( error ) } );

	}

} );
