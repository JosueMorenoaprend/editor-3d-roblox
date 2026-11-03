import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse( readFileSync( new URL( './package.json', import.meta.url ), 'utf8' ) );

// ¿En qué ruta vive la página?
// - Vercel: en la raíz, https://<proyecto>.vercel.app/  (Vercel define VERCEL=1 al compilar)
// - GitHub Pages: en https://<usuario>.github.io/editor-3d-roblox/
// - Desarrollo (npm run dev): en la raíz, http://localhost:5173/
function basePath( command, isPreview ) {

	if ( process.env.VERCEL ) return '/';
	if ( command === 'build' || isPreview ) return '/editor-3d-roblox/';
	return '/';

}

export default defineConfig( ( { command, isPreview } ) => ( {
	base: basePath( command, isPreview ),
	// Versión del editor, disponible en el código como __APP_VERSION__.
	define: {
		__APP_VERSION__: JSON.stringify( version ),
	},
	// Los Web Workers (por ejemplo, el que reduce polígonos) son módulos ES.
	worker: {
		format: 'es',
	},
	build: {
		target: 'es2022',
		// three.js es grande; no es un error que el paquete pase de 500 kB.
		chunkSizeWarningLimit: 1500,
	},
} ) );
