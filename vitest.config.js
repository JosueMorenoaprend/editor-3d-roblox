import { defineConfig } from 'vitest/config';

// Pruebas del núcleo (src/core y src/samples) en Node, sin navegador.
// Las pruebas en el navegador están en tests/e2e (Playwright).
export default defineConfig( {
	test: {
		include: [ 'tests/unit/**/*.test.js' ],
		environment: 'node',
		setupFiles: [ 'tests/unit/setup.js' ],
		testTimeout: 60000,
	},
} );
