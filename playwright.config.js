import { defineConfig } from '@playwright/test';

// Pruebas de punta a punta: el editor compilado en Chromium sin ventana.
// WebGL funciona por software (SwiftShader), así que no hace falta tarjeta de video.
const PORT = 4319;
const CI = !! process.env.CI;

export default defineConfig( {
	testDir: 'tests/e2e',
	outputDir: 'test-results/e2e',
	timeout: 120_000,
	expect: { timeout: 20_000 },
	fullyParallel: true,
	workers: CI ? 1 : 2,
	retries: 0,
	forbidOnly: CI,
	reporter: [ [ 'list' ] ],
	use: {
		baseURL: `http://localhost:${ PORT }/editor-3d-roblox/`,
		acceptDownloads: true,
		trace: 'retain-on-failure',
		launchOptions: {
			args: [ '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist' ],
		},
	},
	projects: [
		{
			name: 'escritorio',
			use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
		},
		{
			name: 'movil',
			use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
		},
	],
	webServer: {
		// Compila y sirve la versión final (igual que la publicada).
		command: `npm run build && npx vite preview --port ${ PORT } --strictPort`,
		url: `http://localhost:${ PORT }/editor-3d-roblox/`,
		reuseExistingServer: false,
		timeout: 120_000,
	},
} );
