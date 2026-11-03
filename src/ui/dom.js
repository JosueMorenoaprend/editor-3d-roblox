// Utilidades pequeñas para la interfaz.

export const $ = ( selector, root = document ) => root.querySelector( selector );
export const $$ = ( selector, root = document ) => [ ...root.querySelectorAll( selector ) ];

const intFormat = new Intl.NumberFormat( 'es-ES' );

/** 20000 -> "20.000" */
export function formatInt( value ) {

	return intFormat.format( Math.round( value ) );

}

/** 1.234 -> "1,23" */
export function formatNumber( value, digits = 2 ) {

	return new Intl.NumberFormat( 'es-ES', {
		minimumFractionDigits: 0,
		maximumFractionDigits: digits,
	} ).format( value );

}

export function formatBytes( bytes ) {

	if ( bytes < 1024 ) return `${ bytes } B`;
	if ( bytes < 1024 * 1024 ) return `${ formatNumber( bytes / 1024, 0 ) } KB`;
	return `${ formatNumber( bytes / ( 1024 * 1024 ), 1 ) } MB`;

}

export function escapeHtml( text ) {

	return String( text )
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' )
		.replaceAll( '"', '&quot;' )
		.replaceAll( "'", '&#39;' );

}

/** "2 mallas" / "1 malla" */
export function plural( count, singular, pluralForm = singular + 's' ) {

	return `${ formatInt( count ) } ${ count === 1 ? singular : pluralForm }`;

}

/** Espera a que el navegador dibuje (para mostrar "Trabajando…" antes de una tarea pesada). */
export function nextPaint() {

	return new Promise( ( resolve ) => requestAnimationFrame( () => requestAnimationFrame( resolve ) ) );

}

/** Lee un número de un <input>; devuelve null si no es válido. */
export function readNumber( input ) {

	const value = Number.parseFloat( String( input.value ).replace( ',', '.' ) );
	return Number.isFinite( value ) ? value : null;

}
