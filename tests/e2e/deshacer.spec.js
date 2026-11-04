// Deshacer y rehacer: con el teclado (Ctrl+Z / Ctrl+Y) y con los botones de arriba.
import { capture, expect, openSample, test } from './fixtures.js';

test.beforeEach( async ( { page } ) => {

	await page.goto( './' );

} );

/** Quita el foco de las cajas de texto (ahí Ctrl+Z deshace el texto, no el modelo). */
async function blur( page ) {

	await page.evaluate( () => document.activeElement?.blur() );

}

test( 'deshacer y rehacer ajustes con el teclado y con los botones', async ( { page }, testInfo ) => {

	await openSample( page, 'Carrito de piezas' );
	const height = page.locator( '#height-input' );
	const undo = page.locator( '#btn-undo' );
	const redo = page.locator( '#btn-redo' );
	await expect( undo ).toBeDisabled();
	await expect( redo ).toBeDisabled();
	const original = await height.inputValue();

	// 1. Girar en X (el carrito queda parado: cambia su altura).
	await page.locator( '[data-rotate="x"]' ).click();
	await expect( height ).not.toHaveValue( original );
	const rotated = await height.inputValue();

	// 2. Altura de 10 studs.
	await page.locator( '#height-unit' ).selectOption( 'studs' );
	await height.fill( '10' );
	await page.locator( '#btn-height' ).click();
	await expect( height ).toHaveValue( '10' );
	await expect( undo ).toBeEnabled();
	await expect( undo ).toHaveAttribute( 'title', /Altura: 10 studs/ );
	await capture( page, testInfo, 'deshacer-botones' );

	// Ctrl+Z deshace la altura; el botón deshace el giro.
	await blur( page );
	await page.keyboard.press( 'Control+z' );
	await expect( page.locator( '.toast' ).last() ).toContainText( 'Deshecho: Altura: 10 studs' );
	await page.locator( '#height-unit' ).selectOption( 'm' );
	await expect( height ).toHaveValue( rotated );
	await undo.click();
	await expect( height ).toHaveValue( original );
	await expect( undo ).toBeDisabled();

	// Ctrl+Y rehace el giro; el botón rehace la altura.
	await blur( page );
	await page.keyboard.press( 'Control+y' );
	await expect( height ).toHaveValue( rotated );
	await redo.click();
	await page.locator( '#height-unit' ).selectOption( 'studs' );
	await expect( height ).toHaveValue( '10' );
	await expect( redo ).toBeDisabled();

	// Ctrl+Shift+Z también rehace (después de deshacer otra vez).
	await blur( page );
	await page.keyboard.press( 'Control+z' );
	await page.keyboard.press( 'Control+Shift+z' );
	await expect( height ).toHaveValue( '10' );

} );

test( 'deshacer y rehacer la reducción de polígonos', async ( { page } ) => {

	await openSample( page, 'Malla pesada' );
	const info = page.locator( '#info-body' );
	await expect( info ).toContainText( '1 malla pasa de 20.000' );

	const reduce = page.locator( '#btn-simplify' );
	await reduce.scrollIntoViewIfNeeded();
	await reduce.click();
	await expect( info ).toContainText( 'Todas las mallas están bajo el límite', { timeout: 60_000 } );

	// Deshacer: vuelve a tener 120.000 triángulos.
	await page.locator( '#btn-undo' ).click();
	await expect( info ).toContainText( '1 malla pasa de 20.000' );
	await expect( page.locator( '#simplify-result' ) ).toBeHidden();

	// Rehacer: otra vez reducida, sin esperar a reducir de nuevo.
	await page.locator( '#btn-redo' ).click();
	await expect( info ).toContainText( 'Todas las mallas están bajo el límite' );

	// "Volver al original" también se puede deshacer.
	await page.locator( '#btn-simplify-undo' ).click();
	await expect( info ).toContainText( '1 malla pasa de 20.000' );
	await page.locator( '#btn-undo' ).click();
	await expect( info ).toContainText( 'Todas las mallas están bajo el límite' );

} );
