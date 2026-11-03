// Base común de las pruebas de punta a punta.
// - Falla si aparece cualquier error en la consola del navegador.
// - Ayudantes para capturas, descargas y esperas.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test as base, expect } from '@playwright/test';
import { describeIssues, validateGLB } from '../helpers/gltf.js';

export { expect };

export const SHOTS_DIR = join( 'test-results', 'capturas' );

export const test = base.extend( {

	/** Errores de la consola. Al terminar cada prueba se exige que no haya ninguno. */
	consoleErrors: [ async ( { page }, use ) => {

		const errors = [];
		// Con E2E_CONSOLE=1 se imprime toda la consola del navegador (para depurar).
		const verbose = !! process.env.E2E_CONSOLE;
		page.on( 'console', ( message ) => {

			if ( verbose ) console.log( `[navegador ${ message.type() }] ${ message.text() }` );
			if ( message.type() === 'error' ) errors.push( message.text() );

		} );
		page.on( 'pageerror', ( error ) => errors.push( `Error sin capturar: ${ error.message }` ) );
		await use( errors );
		expect( errors, 'La consola del navegador tiene errores' ).toEqual( [] );

	}, { auto: true } ],

} );

/** Espera a que el visor haya dibujado un par de cuadros. */
export async function settle( page ) {

	await page.evaluate( () => new Promise( ( resolve ) => requestAnimationFrame( () => requestAnimationFrame( resolve ) ) ) );
	await page.waitForTimeout( 200 );

}

/** Guarda una captura en test-results/capturas/<proyecto>-<nombre>.png. */
export async function capture( page, testInfo, name, options = {} ) {

	mkdirSync( SHOTS_DIR, { recursive: true } );
	await settle( page );
	const path = join( SHOTS_DIR, `${ testInfo.project.name }-${ name }.png` );
	await page.screenshot( { path, ...options } );
	await testInfo.attach( name, { path, contentType: 'image/png' } );
	return path;

}

/** Comprueba que la página no tiene scroll horizontal. */
export async function expectNoHorizontalScroll( page ) {

	const overflow = await page.evaluate( () => document.documentElement.scrollWidth - document.documentElement.clientWidth );
	expect( overflow, 'La página tiene scroll horizontal' ).toBeLessThanOrEqual( 0 );

}

/** Pulsa "Descargar .glb", guarda el archivo y lo valida. Devuelve la ruta y los bytes. */
export async function exportAndValidate( page, testInfo, fileName ) {

	const exportButton = page.locator( '#btn-export' );
	await exportButton.scrollIntoViewIfNeeded();
	const [ download ] = await Promise.all( [ page.waitForEvent( 'download' ), exportButton.click() ] );
	const path = testInfo.outputPath( fileName );
	await download.saveAs( path );
	await expect( page.locator( '#export-result' ) ).toBeVisible();

	const bytes = readFileSync( path );
	const { errors, warnings } = await validateGLB( bytes, fileName );
	expect( errors, `El validador de glTF encontró errores:\n${ describeIssues( errors ) }` ).toHaveLength( 0 );
	expect( warnings, `El validador de glTF encontró avisos:\n${ describeIssues( warnings ) }` ).toHaveLength( 0 );
	return { path, bytes, suggestedName: download.suggestedFilename() };

}

/** Abre un ejemplo con su botón de la pantalla inicial. */
export async function openSample( page, title ) {

	await page.getByRole( 'button', { name: new RegExp( title ) } ).click();
	await expect( page.locator( '#info-body .stats' ) ).toBeVisible();
	await expect( page.locator( '#empty-state' ) ).toBeHidden();

}
