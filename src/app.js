// Estado compartido del editor: el modelo abierto, los ajustes y los avisos de cambio.
//
// Eventos que emite (app.addEventListener):
//   'model'     -> se abrió (o cerró) un modelo
//   'geometry'  -> cambiaron las mallas (por ejemplo, al reducir polígonos)
//   'transform' -> cambió la escala, rotación o posición
//   'settings'  -> cambió una preferencia (límite de triángulos, etc.)
import { AnimationController } from './core/animation.js';
import { UserError } from './core/errors.js';
import { loadModelFromFiles } from './core/loader.js';
import { LoadedModel } from './core/model.js';
import { forgetOriginals } from './core/simplify.js';
import { SAMPLES, createSample } from './samples/index.js';
import { $, nextPaint } from './ui/dom.js';
import { toast } from './ui/toast.js';

const SETTINGS_KEY = 'editor-3d-roblox:ajustes';
const DEFAULT_SETTINGS = {
	triangleLimit: 20000,
	keepGrounded: true,
	textureSize: 1024,
	heightUnit: 'm',
};

export class App extends EventTarget {

	/** @param {import('./core/viewer.js').Viewer} viewer */
	constructor( viewer ) {

		super();
		this.viewer = viewer;
		/** @type {LoadedModel|null} */
		this.model = null;
		this.animation = new AnimationController();
		this.settings = loadSettings();
		this._busyCount = 0;

		viewer.onUpdate( ( delta ) => this.animation.update( delta ) );

	}

	/** Escucha uno o varios eventos. */
	on( types, listener ) {

		for ( const type of [].concat( types ) ) this.addEventListener( type, listener );

	}

	emit( type ) {

		this.dispatchEvent( new Event( type ) );

	}

	setSetting( key, value ) {

		this.settings[ key ] = value;
		saveSettings( this.settings );
		this.emit( 'settings' );

	}

	async openFiles( files ) {

		if ( ! files || files.length === 0 ) return;
		await this.run( 'Abriendo modelo…', async () => {

			const { gltf, fileName, fileSize, missing } = await loadModelFromFiles( files );
			this.setModel( new LoadedModel( gltf, fileName, fileSize ) );
			toast( `Modelo abierto: ${ fileName }`, 'ok' );
			if ( missing.length > 0 ) {

				toast( `No encontré estos archivos del modelo: ${ missing.join( ', ' ) }. Puede que falten texturas.`, 'error' );

			}

		}, 'No se pudo abrir el modelo' );

	}

	/** Abre uno de los modelos de ejemplo generados por código (ver src/samples). */
	async openSample( id ) {

		const sample = SAMPLES.find( ( item ) => item.id === id );
		if ( ! sample ) return;
		await this.run( 'Creando el ejemplo…', () => {

			const { gltf, fileName } = createSample( id );
			this.setModel( new LoadedModel( gltf, fileName ) );
			toast( `Ejemplo abierto: ${ sample.title }`, 'ok' );

		}, 'No se pudo crear el ejemplo' );

	}

	setModel( model ) {

		const previous = this.model;
		this.animation.setModel( null );
		if ( previous ) {

			forgetOriginals( previous.meshes );
			previous.dispose();

		}

		this.model = model;
		this.viewer.setModel( model ? model.container : null );
		this.animation.setModel( model );
		if ( model ) this.viewer.frameBox( model.getWorldBox() );
		this.emit( 'model' );

	}

	/**
	 * Ejecuta una tarea mostrando "Trabajando…" y avisa si falla.
	 * @template T
	 * @param {string} message
	 * @param {() => Promise<T>|T} task
	 * @param {string} errorPrefix
	 * @returns {Promise<T|undefined>}
	 */
	async run( message, task, errorPrefix = 'Algo salió mal' ) {

		const busy = $( '#busy' );
		$( '#busy-text' ).textContent = message;
		busy.hidden = false;
		this._busyCount ++;
		try {

			await nextPaint();
			return await task();

		} catch ( error ) {

			// Los errores esperados (archivo equivocado…) ya traen un mensaje claro: no son fallos del programa.
			if ( error instanceof UserError ) console.warn( error.message );
			else console.error( error );
			toast( `${ errorPrefix }: ${ error && error.message ? error.message : error }`, 'error' );
			return undefined;

		} finally {

			this._busyCount --;
			if ( this._busyCount === 0 ) busy.hidden = true;

		}

	}

}

function loadSettings() {

	try {

		const saved = JSON.parse( localStorage.getItem( SETTINGS_KEY ) || '{}' );
		return { ...DEFAULT_SETTINGS, ...saved };

	} catch {

		return { ...DEFAULT_SETTINGS };

	}

}

function saveSettings( settings ) {

	try {

		localStorage.setItem( SETTINGS_KEY, JSON.stringify( settings ) );

	} catch {

		// Sin almacenamiento (modo privado, etc.): no pasa nada, solo no se recuerda.

	}

}
