// Guardar el proyecto, cerrar (recargar la página) y seguir otro día.
import { readFileSync } from 'node:fs';
import { readGLBJson } from '../helpers/gltf.js';
import { capture, expect, openSample, test } from './fixtures.js';
import { describeIssues, validateGLB } from '../helpers/gltf.js';

test( 'guardar el proyecto, recargar la página y seguir con los ajustes', async ( { page }, testInfo ) => {

	await page.goto( './' );
	await openSample( page, 'Carrito de piezas' );
	const info = page.locator( '#info-body' );
	const height = page.locator( '#height-input' );
	const original = await height.inputValue();

	// Ajustes: girar y poner 10 studs de alto.
	await page.locator( '[data-rotate="y"]' ).click();
	await page.locator( '#height-unit' ).selectOption( 'studs' );
	await height.fill( '10' );
	await page.locator( '#btn-height' ).click();
	await expect( info ).toContainText( '≈ 10 studs' );

	// Guardar proyecto.
	const save = page.locator( '#btn-project-save' );
	await save.scrollIntoViewIfNeeded();
	const [ download ] = await Promise.all( [ page.waitForEvent( 'download' ), save.click() ] );
	expect( download.suggestedFilename() ).toBe( 'carrito_piezas.proyecto.glb' );
	const path = testInfo.outputPath( 'proyecto.glb' );
	await download.saveAs( path );
	await expect( page.locator( '.toast' ).last() ).toContainText( 'Proyecto guardado' );
	await capture( page, testInfo, 'proyecto-guardado' );

	const bytes = readFileSync( path );
	const { errors } = await validateGLB( bytes, 'proyecto.glb' );
	expect( errors, describeIssues( errors ) ).toHaveLength( 0 );
	expect( readGLBJson( bytes ).scenes[ 0 ].extras.editor3dRoblox.kind ).toBe( 'proyecto' );

	// "Otro día": recargar la página y abrir el proyecto.
	await page.reload();
	await expect( page.locator( '#empty-state' ) ).toBeVisible();
	await page.locator( '#file-input' ).setInputFiles( { name: 'carrito_piezas.proyecto.glb', mimeType: 'model/gltf-binary', buffer: bytes } );
	await expect( page.locator( '.toast' ).last() ).toContainText( 'Proyecto abierto: carrito_piezas' );
	await expect( info ).toContainText( '≈ 10 studs' );
	await expect( page.locator( '#export-name' ) ).toHaveValue( 'carrito_piezas_roblox' );

	// Los ajustes siguen siendo ajustes: "Quitar ajustes" vuelve al tamaño original.
	await page.locator( '#height-unit' ).selectOption( 'm' );
	await page.locator( '#btn-reset-transform' ).click();
	await expect( height ).toHaveValue( original );

} );
