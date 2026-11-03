// Agregar a mi personaje las animaciones de otro archivo (de Tripo o Mixamo), verlas antes y exportarlas.
import { readGLBJson } from '../helpers/gltf.js';
import { createMixamoDanceGLB } from '../helpers/animationFiles.js';
import { createOddRigGLB } from '../helpers/oddRig.js';
import { capture, captureScrolledTo, expect, exportAndValidate, openSample, test } from './fixtures.js';

const GLB = 'model/gltf-binary';

test( 'agregar una animación de Mixamo (sin cuerpo) a un personaje sin animaciones', async ( { page }, testInfo ) => {

	const empty = page.locator( '#anim-empty' );
	const select = page.locator( '#anim-select' );
	const result = page.locator( '#anim-import-result' );

	// Un personaje con esqueleto pero sin animaciones (como uno de Tripo recién hecho).
	await page.goto( './' );
	await page.locator( '#file-input' ).setInputFiles( { name: 'personaje_tripo.glb', mimeType: GLB, buffer: await createOddRigGLB( {} ) } );
	await expect( page.locator( '#bonemap-status' ) ).toContainText( 'Mapa completo' );
	await expect( empty ).toContainText( 'todavía no tiene animaciones' );
	await expect( page.locator( '#btn-anim-import' ) ).toBeVisible();

	// Elegir un archivo de Mixamo que trae solo la animación: el editor la pasa a sus huesos.
	await page.locator( '#anim-import-input' ).setInputFiles( { name: 'baile_mixamo.glb', mimeType: GLB, buffer: await createMixamoDanceGLB() } );
	await expect( result ).toContainText( '«baile_mixamo.glb»: 1 animación' );
	await expect( result ).toContainText( 'esqueleto Mixamo' );
	await captureScrolledTo( page, testInfo, 'animaciones-encontradas', '#anim-import' );

	// Verla antes de agregarla.
	await result.getByRole( 'button', { name: 'Ver «Baile» en mi personaje' } ).click();
	await page.waitForTimeout( 400 );
	await page.locator( '#viewport' ).scrollIntoViewIfNeeded();
	await capture( page, testInfo, 'animaciones-vista-previa', { wait: false } );

	// Agregarla: aparece en la lista, en Información y se puede reproducir.
	await page.locator( '#btn-anim-import-add' ).click();
	await expect( page.locator( '.toast' ).last() ).toContainText( 'agregué 1 animación (Baile)' );
	await expect( result ).toBeHidden();
	await expect( select ).toHaveValue( '0' );
	await expect( select ).toContainText( 'Baile' );
	await expect( page.locator( '#info-body' ) ).toContainText( 'Baile' );
	const play = page.locator( '#btn-anim-play' );
	await play.click();
	await expect( play ).toHaveText( 'Pausa' );
	await page.locator( '#btn-anim-stop' ).click();

	// Deshacer y rehacer.
	await page.locator( '#btn-undo' ).click();
	await expect( empty ).toContainText( 'todavía no tiene animaciones' );
	await page.locator( '#btn-redo' ).click();
	await expect( select ).toContainText( 'Baile' );

	// Exportar: GLB válido, con la animación moviendo los huesos de MI personaje.
	const { bytes } = await exportAndValidate( page, testInfo, 'personaje_con_baile.glb' );
	await expect( page.locator( '#export-result' ) ).toContainText( '1 animación' );
	const json = readGLBJson( bytes );
	expect( json.animations.map( ( animation ) => animation.name ) ).toEqual( [ 'Baile' ] );
	const moved = new Set( json.animations[ 0 ].channels.map( ( channel ) => json.nodes[ channel.target.node ].name ) );
	expect( moved ).toContain( 'LeftUpperArm' );
	expect( moved ).toContain( 'RightUpperArm' );
	expect( [ ...moved ].some( ( name ) => name.startsWith( 'mixamorig' ) ) ).toBe( false );

} );

test( 'agregar animaciones explica qué hacer cuando algo no sirve', async ( { page } ) => {

	const toast = page.locator( '.toast' ).last();

	// Mi personaje con el mapa de huesos incompleto.
	await page.goto( './' );
	await page.locator( '#file-input' ).setInputFiles( { name: 'personaje_raro.glb', mimeType: GLB, buffer: await createOddRigGLB() } );
	await expect( page.locator( '#bonemap-status' ) ).toContainText( 'Hay que revisar el mapa' );
	await page.locator( '#anim-import-input' ).setInputFiles( { name: 'baile_mixamo.glb', mimeType: GLB, buffer: await createMixamoDanceGLB() } );
	await expect( toast ).toContainText( 'Primero completa el mapa de huesos' );
	await expect( page.locator( '#anim-import-result' ) ).toBeHidden();

	// Un archivo sin animaciones.
	await page.reload();
	await openSample( page, 'Muñeco R15' );
	await page.locator( '#anim-import-input' ).setInputFiles( { name: 'quieto.glb', mimeType: GLB, buffer: await createOddRigGLB( {} ) } );
	await expect( toast ).toContainText( '«quieto.glb» no trae animaciones' );

	// Un modelo sin esqueleto no ofrece agregar animaciones.
	await page.reload();
	await openSample( page, 'Carrito de piezas' );
	await expect( page.locator( '#anim-import' ) ).toBeHidden();

} );
