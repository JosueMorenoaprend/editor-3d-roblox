// Reducir polígonos sin congelar la página (Web Worker), con avance y botón Cancelar.
import { capture, expect, openSample, test } from './fixtures.js';

test( 'reducir no congela la página, muestra el avance y se puede cancelar', async ( { page }, testInfo ) => {

	await page.goto( './' );
	await openSample( page, 'Malla pesada' );
	const info = page.locator( '#info-body' );
	const reduce = page.locator( '#btn-simplify' );
	await expect( info ).toContainText( '1 malla pasa de 20.000' );

	// "Tareas largas": momentos en que la página no responde (clics, cámara, dibujo).
	await page.evaluate( () => {

		window.__longTasks = [];
		new PerformanceObserver( ( list ) => {

			for ( const entry of list.getEntries() ) window.__longTasks.push( entry.duration );

		} ).observe( { type: 'longtask' } );

	} );

	// 1. Cancelar: el modelo queda igual. Se pulsan "Reducir" y "Cancelar" en el mismo instante,
	//    para que la prueba no dependa de lo rápido que sea la máquina.
	await reduce.scrollIntoViewIfNeeded();
	await page.evaluate( () => {

		document.querySelector( '#btn-simplify' ).click();
		document.querySelector( '#busy-cancel' ).click();

	} );
	await expect( page.locator( '.toast' ).last() ).toContainText( 'Reducción cancelada' );
	await expect( page.locator( '#busy' ) ).toBeHidden();
	await expect( info ).toContainText( '1 malla pasa de 20.000' );
	await expect( reduce ).toHaveText( 'Reducir' );

	// 2. Reducir de verdad: se ve el avance y la página sigue respondiendo.
	await page.evaluate( () => {

		window.__longTasks = [];

	} );
	await reduce.click();
	await expect( page.locator( '#busy-progress' ) ).toBeVisible();
	await expect( reduce ).toHaveText( 'Reduciendo…' );
	await capture( page, testInfo, 'reduciendo-con-avance', { wait: false } );
	await expect( page.locator( '#simplify-result' ) ).toBeVisible( { timeout: 60_000 } );
	await expect( page.locator( '#simplify-result' ) ).toContainText( '120.000 → 20.000' );
	await expect( info ).toContainText( 'Todas las mallas están bajo el límite' );

	const longest = await page.evaluate( () => Math.max( 0, ...window.__longTasks ) );
	console.log( `Tarea más larga mientras reducía: ${ Math.round( longest ) } ms` );
	// Antes (sin worker) la página quedaba bloqueada todo el tiempo de la reducción.
	expect( longest, 'La página se bloqueó mientras reducía' ).toBeLessThan( 800 );

} );
