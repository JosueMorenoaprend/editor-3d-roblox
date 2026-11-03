// Botones "Probar con un ejemplo" de la pantalla inicial.
import { SAMPLES } from '../samples/index.js';
import { $, escapeHtml } from './dom.js';

export function initSamples( app ) {

	const box = $( '#sample-buttons' );
	box.innerHTML = SAMPLES.map( ( sample ) => `
		<button type="button" class="btn sample-btn" data-sample="${ sample.id }">
			<span class="sample-title">${ escapeHtml( sample.title ) }</span>
			<span class="sample-desc">${ escapeHtml( sample.description ) }</span>
		</button>` ).join( '' );

	box.addEventListener( 'click', ( event ) => {

		const button = event.target.closest( '[data-sample]' );
		if ( button ) app.openSample( button.dataset.sample );

	} );

}
