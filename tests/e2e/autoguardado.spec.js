// Autoguardado: nunca se pierde el trabajo aunque se cierre o recargue la página.
import { capture, expect, openSample, test } from './fixtures.js';

const SAVED = 'Guardado automático';

test( 'recargar la página y recuperar el trabajo guardado solo', async ( { page }, testInfo ) => {

	await page.goto( './' );
	await openSample( page, 'Carrito de piezas' );
	const height = page.locator( '#height-input' );
	const original = await height.inputValue();

	await page.locator( '[data-rotate="x"]' ).click();
	await expect( height ).not.toHaveValue( original );
	const rotated = await height.inputValue();
	await expect( page.locator( '#autosave-status' ) ).toContainText( SAVED, { timeout: 20_000 } );

	// Se cierra la pestaña sin guardar (aquí: recargar).
	await page.reload();
	const card = page.locator( '#recover' );
	await expect( card ).toBeVisible();
	await expect( card ).toContainText( 'carrito_piezas' );
	await expect( card ).toContainText( 'hoy a las' );
	await capture( page, testInfo, 'recuperar-trabajo' );

	await page.getByRole( 'button', { name: 'Recuperar mi trabajo' } ).click();
	await expect( page.locator( '.toast' ).last() ).toContainText( 'Proyecto abierto: carrito_piezas' );
	await expect( height ).toHaveValue( rotated );

	// Lo recuperado conserva los ajustes como ajustes.
	await page.locator( '#btn-reset-transform' ).click();
	await expect( height ).toHaveValue( original );

} );

test( 'abrir otro modelo sin cambios no borra lo guardado; "Descartar" sí', async ( { page } ) => {

	await page.goto( './' );
	await openSample( page, 'Carrito de piezas' );
	await page.locator( '[data-rotate="x"]' ).click();
	await expect( page.locator( '#autosave-status' ) ).toContainText( SAVED, { timeout: 20_000 } );

	// Al volver, se abre otro modelo sin tocar nada: lo guardado sigue ahí.
	await page.reload();
	const card = page.locator( '#recover' );
	await expect( card ).toBeVisible();
	await openSample( page, 'Muñeco R15' );
	await expect( card ).toBeHidden();
	await page.waitForTimeout( 2500 );
	await page.reload();
	await expect( card ).toContainText( 'carrito_piezas' );

	// "Descartar" lo borra para siempre.
	await page.getByRole( 'button', { name: 'Descartar' } ).click();
	await expect( card ).toBeHidden();
	await page.reload();
	await expect( page.locator( '#empty-state' ) ).toBeVisible();
	await page.waitForTimeout( 1000 );
	await expect( card ).toBeHidden();

} );
