// Mensajes flotantes en la esquina de la pantalla.
import { $ } from './dom.js';

/**
 * @param {string} message
 * @param {'info'|'ok'|'error'} type
 */
export function toast( message, type = 'info', duration = type === 'error' ? 9000 : 4000 ) {

	const box = $( '#toasts' );
	const item = document.createElement( 'div' );
	item.className = `toast toast-${ type }`;
	item.setAttribute( 'role', type === 'error' ? 'alert' : 'status' );
	item.textContent = message;
	box.appendChild( item );
	setTimeout( () => item.remove(), duration );
	item.addEventListener( 'click', () => item.remove() );

}
