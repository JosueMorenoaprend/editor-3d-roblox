// Autoguardado: después de cada cambio (con una pequeña espera) guarda el proyecto en el
// navegador. Al volver a abrir el editor ofrece "¿Seguimos donde lo dejaste?".
import { clearAutosave, loadAutosave, saveAutosave } from '../core/autosave.js';
import { exportProject } from '../core/exporter.js';
import { $, formatBytes } from './dom.js';
import { toast } from './toast.js';

/** Espera después del último cambio antes de guardar (ms). */
const DELAY = 1500;
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

const timeFormat = new Intl.DateTimeFormat( 'es-ES', { hour: '2-digit', minute: '2-digit' } );
const dateFormat = new Intl.DateTimeFormat( 'es-ES', { day: 'numeric', month: 'long' } );

/** "hoy a las 10:32", "ayer a las 18:05" o "el 2 de noviembre a las 9:00". */
export function describeWhen( timestamp, now = Date.now() ) {

	const date = new Date( timestamp );
	const today = new Date( now );
	const dayStart = ( d ) => new Date( d.getFullYear(), d.getMonth(), d.getDate() ).getTime();
	const days = Math.round( ( dayStart( today ) - dayStart( date ) ) / 86400000 );
	const time = timeFormat.format( date );
	if ( days === 0 ) return `hoy a las ${ time }`;
	if ( days === 1 ) return `ayer a las ${ time }`;
	return `el ${ dateFormat.format( date ) } a las ${ time }`;

}

export function initAutosave( app ) {

	const status = $( '#autosave-status' );
	const card = $( '#recover' );
	let timer = null;
	let saving = false;
	let again = false;

	/** Solo vale la pena guardar si hubo cambios (abrir un archivo no borra lo guardado antes). */
	const hasEdits = () => app.history.canUndo || app.history.canRedo || draftChanged;
	/** ¿Cambió la animación con keyframes a medio hacer? (también cuenta descartarla: así no vuelve). */
	let draftChanged = false;

	function schedule() {

		clearTimeout( timer );
		timer = setTimeout( save, DELAY );

	}

	async function save() {

		const model = app.model;
		if ( ! model || ! hasEdits() ) return;
		// Espera a que termine lo que se está haciendo (reducir, exportar…) o la animación.
		if ( app.busy || app.animation.isPlaying ) {

			schedule();
			return;

		}

		if ( saving ) {

			again = true;
			return;

		}

		saving = true;
		try {

			const { arrayBuffer } = await app.animation.atRestPose( () => exportProject( model, { appVersion: APP_VERSION } ) );
			if ( app.model !== model ) return; // se abrió otro modelo mientras tanto
			const record = await saveAutosave( { fileName: `${ model.baseName }.proyecto.glb`, baseName: model.baseName, bytes: arrayBuffer } );
			status.textContent = `✓ Guardado automático ${ describeWhen( record.savedAt ) } (${ formatBytes( record.size ) }).`;
			status.dataset.state = 'ok';

		} catch ( error ) {

			console.warn( 'Autoguardado:', error );
			status.textContent = `⚠ No se pudo guardar automáticamente: ${ error && error.message ? error.message : error }. ` +
				'Usa "Guardar proyecto" para no perder tu trabajo.';
			status.dataset.state = 'error';

		} finally {

			saving = false;
			if ( again ) {

				again = false;
				schedule();

			}

		}

	}

	app.history.addEventListener( 'change', () => {

		if ( hasEdits() ) schedule();

	} );

	app.on( 'draft', () => {

		draftChanged = true;
		schedule();

	} );

	app.on( 'model', () => {

		clearTimeout( timer );
		draftChanged = false;
		card.hidden = true;
		status.textContent = 'Mientras editas, tu trabajo se guarda solo en este navegador.';
		status.dataset.state = '';

	} );

	// ---------- ¿Seguimos donde lo dejaste? ----------

	async function offerRecovery() {

		let record = null;
		try {

			record = await loadAutosave();

		} catch ( error ) {

			console.warn( 'No se pudo leer el autoguardado:', error );
			return;

		}

		if ( ! record || app.model ) return;
		$( '#recover-name' ).textContent = record.baseName;
		$( '#recover-when' ).textContent = describeWhen( record.savedAt );
		card.hidden = false;

		$( '#btn-recover' ).onclick = async () => {

			card.hidden = true;
			const file = new File( [ record.bytes ], record.fileName, { type: 'model/gltf-binary' } );
			await app.openFiles( [ file ] );

		};

		$( '#btn-recover-discard' ).onclick = async () => {

			card.hidden = true;
			try {

				await clearAutosave();
				toast( 'Listo: se borró el trabajo guardado.' );

			} catch ( error ) {

				console.warn( 'No se pudo borrar el autoguardado:', error );

			}

		};

	}

	offerRecovery();

}
