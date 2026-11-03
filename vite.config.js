import { defineConfig } from 'vite';

// En GitHub Pages la página vive en https://<usuario>.github.io/editor-3d-roblox/
// por eso al compilar (build) y en la vista previa (preview) usamos esa ruta base.
// En desarrollo (npm run dev) usamos la raíz: http://localhost:5173/
export default defineConfig( ( { command, isPreview } ) => ( {
	base: command === 'build' || isPreview ? '/editor-3d-roblox/' : '/',
	build: {
		target: 'es2022',
		// three.js es grande; no es un error que el paquete pase de 500 kB.
		chunkSizeWarningLimit: 1500,
	},
} ) );
