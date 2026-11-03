// Panel "Proyecto": guardar todo el trabajo en un archivo y volver a abrirlo.
import { downloadBlob, exportProject } from '../core/exporter.js';
import { $ } from './dom.js';
import { toast } from './toast.js';

/** Versión del editor (la pone Vite desde package.json). */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

export function initProjectPanel( app ) {

	const saveButton = $( '#btn-project-save' );

	saveButton.addEventListener( 'click', async () => {

		const model = app.model;
		if ( ! model ) return;

		// Se guarda en la pose de reposo, no en el cuadro actual de una animación.
		app.animation.stop();
		const fileName = `${ model.baseName }.proyecto.glb`;
		const saved = await app.run( 'Guardando proyecto…', async () => {

			const { blob } = await exportProject( model, { appVersion: APP_VERSION } );
			downloadBlob( blob, fileName );
			return true;

		}, 'No se pudo guardar el proyecto', { help: 'Prueba otra vez. Mientras tanto, tu trabajo sigue guardado en este navegador (autoguardado).' } );

		if ( saved ) toast( `Proyecto guardado: ${ fileName }. Para seguir otro día, ábrelo con "Abrir proyecto".`, 'ok', 7000 );

	} );

	// Abrir un proyecto es igual que abrir un modelo: el editor reconoce el archivo solo.
	$( '#btn-project-open' ).addEventListener( 'click', () => $( '#file-input' ).click() );

	function render() {

		saveButton.disabled = ! app.model;

	}

	app.on( 'model', render );
	render();

}
