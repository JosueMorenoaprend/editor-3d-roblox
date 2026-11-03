// Flujos reales del editor, como los haría un principiante.
import { readGLBJson } from '../helpers/gltf.js';
import {
	capture, expect, expectNoHorizontalScroll, exportAndValidate, openSample, settle, test,
} from './fixtures.js';

test.beforeEach( async ( { page } ) => {

	await page.goto( './' );
	await expect( page.locator( '#viewport canvas' ) ).toBeVisible();

} );

test( 'pantalla inicial: se entiende qué hacer y hay ejemplos para probar', async ( { page }, testInfo ) => {

	await expect( page.getByText( 'Arrastra aquí tu modelo' ) ).toBeVisible();
	await expect( page.getByRole( 'button', { name: 'Abrir modelo' } ) ).toBeEnabled();
	await expect( page.locator( '[data-sample]' ) ).toHaveCount( 3 );
	await expectNoHorizontalScroll( page );
	await capture( page, testInfo, 'inicio' );
	await capture( page, testInfo, 'inicio-completa', { fullPage: true } );

} );

test( 'muñeco R15: abrir, animar, exportar, validar y volver a abrir', async ( { page }, testInfo ) => {

	await openSample( page, 'Muñeco R15' );
	const info = page.locator( '#info-body' );
	await expect( info ).toContainText( 'Sí, 16 huesos' );
	await expect( info ).toContainText( 'Saludar' );

	// Reproducir una animación y detenerla.
	const play = page.locator( '#btn-anim-play' );
	await play.scrollIntoViewIfNeeded();
	await play.click();
	await expect( play ).toHaveText( 'Pausa' );
	await page.waitForTimeout( 600 );
	await page.locator( '#viewport' ).scrollIntoViewIfNeeded();
	await capture( page, testInfo, 'r15-animando' );
	await page.locator( '#btn-anim-stop' ).click();
	await expect( play ).toHaveText( 'Reproducir' );

	// Exportar: el GLB pasa el validador y conserva huesos y animaciones.
	const { bytes, suggestedName } = await exportAndValidate( page, testInfo, 'muneco.glb' );
	expect( suggestedName ).toBe( 'muneco_r15_roblox.glb' );
	const result = page.locator( '#export-result' );
	await expect( result ).toContainText( '16 huesos' );
	await expect( result ).toContainText( '3 animaciones' );
	const json = readGLBJson( bytes );
	expect( json.skins ).toHaveLength( 1 );
	expect( json.animations.map( ( a ) => a.name ) ).toEqual( [ 'Saludar', 'Caminar', 'Saltar' ] );

	// Volver a abrir el archivo exportado con "Abrir modelo" (el flujo real).
	// Se pasa el contenido y no la ruta: Chromium no recibe archivos cuya ruta lleva letras como "ñ".
	await page.locator( '#file-input' ).setInputFiles( { name: 'muneco.glb', mimeType: 'model/gltf-binary', buffer: bytes } );
	await expect( info ).toContainText( 'muneco.glb' );
	await expect( info ).toContainText( 'Sí, 16 huesos' );
	await settle( page );

} );

test( 'malla pesada: aviso del límite, reducir y exportar con textura', async ( { page }, testInfo ) => {

	await openSample( page, 'Malla pesada' );
	const info = page.locator( '#info-body' );
	await expect( info ).toContainText( '1 malla pasa de 20.000 triángulos' );
	await expect( info ).toContainText( '120.000' );
	await capture( page, testInfo, 'pesada-abierta' );

	const reduce = page.locator( '#btn-simplify' );
	await reduce.scrollIntoViewIfNeeded();
	await expect( reduce ).toBeEnabled();
	await reduce.click();
	const result = page.locator( '#simplify-result' );
	await expect( result ).toBeVisible( { timeout: 60_000 } );
	await expect( result ).toContainText( '120.000 →' );
	await expect( info ).toContainText( 'Todas las mallas están bajo el límite' );

	// Ver los triángulos con el botón "Malla".
	await page.locator( '#btn-wire' ).click();
	await page.locator( '#viewport' ).scrollIntoViewIfNeeded();
	await capture( page, testInfo, 'pesada-reducida-malla' );
	await page.locator( '#btn-wire' ).click();

	const { bytes } = await exportAndValidate( page, testInfo, 'pesada.glb' );
	const json = readGLBJson( bytes );
	expect( json.images, 'El GLB tiene que llevar la textura' ).toHaveLength( 1 );
	expect( json.images[ 0 ].mimeType ).toBe( 'image/png' );
	await expect( page.locator( '#export-result' ) ).toContainText( '1 malla' );

} );

test( 'carrito de piezas: girar, cambiar la altura en studs y exportar', async ( { page }, testInfo ) => {

	await openSample( page, 'Carrito de piezas' );
	const info = page.locator( '#info-body' );
	await expect( info ).toContainText( 'en 8 mallas' );

	await page.locator( '[data-rotate="y"]' ).click();
	await page.locator( '#height-unit' ).selectOption( 'studs' );
	await page.locator( '#height-input' ).fill( '10' );
	await page.locator( '#btn-height' ).click();
	await expect( info ).toContainText( '≈ 10 studs' );
	await capture( page, testInfo, 'carrito-ajustado' );

	await exportAndValidate( page, testInfo, 'carrito.glb' );
	// 10 studs × 0,28 m = 2,8 m de alto.
	await expect( page.locator( '#export-result' ) ).toContainText( '× 2,8 ×' );
	await expectNoHorizontalScroll( page );
	await capture( page, testInfo, 'carrito-exportado-completa', { fullPage: true } );

} );

test( 'un archivo equivocado da un mensaje claro (sin errores en la consola)', async ( { page } ) => {

	await page.locator( '#file-input' ).setInputFiles( {
		name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from( 'hola' ),
	} );
	await expect( page.locator( '.toast-error' ) ).toContainText( 'No encontré ningún archivo .glb o .gltf' );

	await page.locator( '#file-input' ).setInputFiles( {
		name: 'roto.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from( 'esto no es un glb' ),
	} );
	await expect( page.locator( '.toast-error' ).last() ).toContainText( 'está dañado o no es un modelo glTF válido' );
	await expect( page.locator( '#empty-state' ) ).toBeVisible();

} );
