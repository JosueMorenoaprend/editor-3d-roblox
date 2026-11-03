// Crear animaciones con los generadores (caminar, correr, respirar): deslizadores, vista previa y exportar.
import { readGLBAccessor, readGLBJson } from '../helpers/gltf.js';
import { capture, captureScrolledTo, expect, exportAndValidate, openSample, test } from './fixtures.js';

test( 'crear "Caminar" con deslizadores, verla en bucle, agregarla y exportarla en el lugar', async ( { page }, testInfo ) => {

	const editor = page.locator( '#anim-create-editor' );
	const select = page.locator( '#anim-select' );

	await page.goto( './' );
	await openSample( page, 'Muñeco R15' );
	await expect( page.locator( '#anim-create' ) ).toBeVisible();

	// Elegir "Caminar": se abre con sus deslizadores y el muñeco empieza a caminar (vista previa en bucle).
	await page.locator( '[data-generator="caminar"]' ).click();
	await expect( editor ).toBeVisible();
	await expect( page.locator( '[data-generator="caminar"]' ) ).toHaveAttribute( 'aria-pressed', 'true' );
	await expect( select ).toHaveValue( 'vista-previa' );
	await expect( select.locator( 'option:checked' ) ).toContainText( 'Caminar' );

	// Un paso más largo y más lento.
	await page.locator( '#gen-stride' ).fill( '0.9' );
	await expect( page.locator( '#gen-stride-value' ) ).toHaveText( '90 %' );
	await page.locator( '#gen-speed' ).fill( '0.75' );
	await expect( page.locator( '#gen-speed-value' ) ).toHaveText( '×0,75' );
	await expect( select.locator( 'option:checked' ) ).toContainText( '1,47 s, vista previa' );
	// La vista previa sigue sonando (en bucle) después de mover los deslizadores.
	await page.waitForTimeout( 1800 );
	await expect( select ).toHaveValue( 'vista-previa' );
	await captureScrolledTo( page, testInfo, 'generador-caminar', '#anim-create' );
	await page.locator( '#viewport' ).scrollIntoViewIfNeeded();
	await capture( page, testInfo, 'generador-caminar-vista', { wait: false } );

	// Agregarla: el R15 ya tiene "Caminar", así que la nueva se llama "Caminar (2)".
	await page.locator( '#btn-anim-create-add' ).click();
	await expect( page.locator( '.toast' ).last() ).toContainText( 'agregué «Caminar (2)»' );
	await expect( editor ).toBeHidden();
	await expect( select ).toHaveValue( '3' );
	await expect( select.locator( 'option:checked' ) ).toContainText( 'Caminar (2) (1,47 s)' );

	// Deshacer la quita; rehacer la vuelve a poner.
	await page.keyboard.press( 'Control+z' );
	await expect( select.locator( 'option' ) ).toHaveCount( 3 );
	await page.keyboard.press( 'Control+y' );
	await expect( select.locator( 'option' ) ).toHaveCount( 4 );

	// Exportar: GLB válido; en "Caminar (2)" la cadera sube y baja pero no avanza (en el lugar).
	const { bytes } = await exportAndValidate( page, testInfo, 'muneco_caminando.glb' );
	const json = readGLBJson( bytes );
	const walk = json.animations.find( ( animation ) => animation.name === 'Caminar (2)' );
	expect( walk ).toBeDefined();
	const channel = walk.channels.find( ( item ) => json.nodes[ item.target.node ].name === 'LowerTorso' && item.target.path === 'translation' );
	const positions = readGLBAccessor( bytes, json, walk.samplers[ channel.sampler ].output );
	const times = readGLBAccessor( bytes, json, walk.samplers[ channel.sampler ].input );
	expect( times[ times.length - 1 ][ 0 ] ).toBeCloseTo( 1.1 / 0.75, 2 );
	const [ x0, , z0 ] = positions[ 0 ];
	for ( const [ x, , z ] of positions ) {

		expect( Math.abs( x - x0 ) ).toBeLessThan( 1e-5 );
		expect( Math.abs( z - z0 ) ).toBeLessThan( 1e-5 );

	}

	const heights = positions.map( ( [ , y ] ) => y );
	expect( Math.max( ...heights ) - Math.min( ...heights ) ).toBeGreaterThan( 0.005 );
	// Se repite sin saltos: el último cuadro es igual al primero.
	expect( positions[ positions.length - 1 ] ).toEqual( positions[ 0 ] );

} );

test( 'correr y respirar; "Cerrar" detiene la vista previa', async ( { page } ) => {

	const select = page.locator( '#anim-select' );
	await page.goto( './' );
	await openSample( page, 'Muñeco R15' );

	await page.locator( '[data-generator="correr"]' ).click();
	await expect( page.locator( '#anim-create-params input[type="range"]' ) ).toHaveCount( 4 );
	await expect( select.locator( 'option:checked' ) ).toContainText( 'Correr' );

	// Cambiar a "Respirar" reemplaza la vista previa.
	await page.locator( '[data-generator="respirar"]' ).click();
	await expect( page.locator( '#anim-create-params input[type="range"]' ) ).toHaveCount( 2 );
	await expect( select.locator( 'option:checked' ) ).toContainText( 'Respirar (4 s, vista previa)' );
	await expect( page.locator( '[data-generator="correr"]' ) ).toHaveAttribute( 'aria-pressed', 'false' );

	await page.locator( '#btn-anim-create-close' ).click();
	await expect( page.locator( '#anim-create-editor' ) ).toBeHidden();
	await expect( select ).toHaveValue( '0' );
	await expect( select.locator( 'option' ) ).toHaveCount( 3 );

} );
