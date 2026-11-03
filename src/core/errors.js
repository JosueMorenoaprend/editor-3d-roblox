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

/** Consejo general cuando no sabemos qué falló. */
export const DEFAULT_HELP = 'Prueba otra vez. Si vuelve a pasar, recarga la página: tu trabajo se guarda solo en este navegador.';

/**
 * Mensaje para el usuario: qué pasó, cómo arreglarlo y (si no era un error esperado)
 * el detalle técnico al final, por si hay que pedir ayuda.
 * @param {unknown} error
 * @param {{ action?: string, help?: string }} [context] action: qué se estaba haciendo ("No se pudo exportar")
 */
export function describeError( error, { action = 'Algo salió mal', help = DEFAULT_HELP } = {} ) {

	const detail = error && error.message ? error.message : String( error );
	if ( error instanceof UserError ) return `${ action }: ${ detail }`;
	return `${ action }. ${ help } (Detalle técnico: ${ detail })`;

}
