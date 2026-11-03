// Autoguardado en IndexedDB: la base de datos del propio navegador.
// Se guarda solo en esta computadora (nada sale a internet) y sobrevive a cerrar la pestaña.
//
// Se guarda un único registro con el último trabajo:
//   { version, fileName, baseName, savedAt (ms), size, bytes (ArrayBuffer del proyecto .glb) }

const DB_NAME = 'editor-3d-roblox';
const DB_VERSION = 1;
const STORE = 'autoguardado';
const KEY = 'ultimo';

function openDatabase() {

	return new Promise( ( resolve, reject ) => {

		if ( typeof indexedDB === 'undefined' ) {

			reject( new Error( 'Este navegador no permite guardar datos (IndexedDB).' ) );
			return;

		}

		const request = indexedDB.open( DB_NAME, DB_VERSION );
		request.onupgradeneeded = () => {

			if ( ! request.result.objectStoreNames.contains( STORE ) ) request.result.createObjectStore( STORE );

		};
		request.onsuccess = () => resolve( request.result );
		request.onerror = () => reject( request.error || new Error( 'No se pudo abrir el almacenamiento del navegador.' ) );
		request.onblocked = () => reject( new Error( 'El almacenamiento del navegador está ocupado por otra pestaña del editor.' ) );

	} );

}

/** Abre la base de datos, hace una operación y la cierra. */
async function withStore( mode, operation ) {

	const db = await openDatabase();
	try {

		return await new Promise( ( resolve, reject ) => {

			const transaction = db.transaction( STORE, mode );
			const request = operation( transaction.objectStore( STORE ) );
			transaction.oncomplete = () => resolve( request.result );
			transaction.onerror = () => reject( transaction.error );
			transaction.onabort = () => reject( transaction.error || new Error( 'No se pudo guardar en el navegador (¿sin espacio?).' ) );

		} );

	} finally {

		db.close();

	}

}

/**
 * Guarda el trabajo actual.
 * @param {{ fileName: string, baseName: string, bytes: ArrayBuffer }} record
 */
export function saveAutosave( { fileName, baseName, bytes } ) {

	const record = { version: 1, fileName, baseName, savedAt: Date.now(), size: bytes.byteLength, bytes };
	return withStore( 'readwrite', ( store ) => store.put( record, KEY ) ).then( () => record );

}

/** Lee el último trabajo guardado, o null si no hay. */
export async function loadAutosave() {

	const record = await withStore( 'readonly', ( store ) => store.get( KEY ) );
	return record && record.bytes ? record : null;

}

/** Borra el trabajo guardado. */
export function clearAutosave() {

	return withStore( 'readwrite', ( store ) => store.delete( KEY ) );

}
