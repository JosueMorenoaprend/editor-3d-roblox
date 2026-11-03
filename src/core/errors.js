// Errores "esperados": los causa algo que el usuario puede arreglar (un archivo equivocado,
// un archivo dañado…). Su mensaje ya está en español claro y dice qué hacer.
// La interfaz los muestra tal cual y no los registra como fallos del programa.
export class UserError extends Error {

	/**
	 * @param {string} message qué pasó y cómo arreglarlo
	 * @param {{ cause?: unknown }} [options]
	 */
	constructor( message, options ) {

		super( message, options );
		this.name = 'UserError';

	}

}
