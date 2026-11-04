// Exportar solo las animaciones que quieres llevar a Roblox.
import { readGLBJson } from '../helpers/gltf.js';
import { captureScrolledTo, expect, exportAndValidate, openSample, test } from './fixtures.js';

test( 'exportar 2 de las 3 animaciones, volver a abrir el archivo y validarlo', async ( { page }, testInfo ) => {

	const list = page.locator( '#export-clips' );
	await page.goto( './' );
	await openSample( page, 'Muñeco R15' );
	await expect( list ).toBeVisible();
	await expect( list.locator( 'input[data-clip]' ) ).toHaveCount( 3 );
	await expect( list.locator( 'input[data-clip]:checked' ) ).toHaveCount( 3 );

	// Sacar "Caminar" del archivo.
	await list.getByLabel( /Caminar/ ).uncheck();
	await captureScrolledTo( page, testInfo, 'exportar-animaciones', '#export-body' );
	const { bytes } = await exportAndValidate( page, testInfo, 'muneco_dos_animaciones.glb' );
	await expect( page.locator( '#export-result' ) ).toContainText( '2 animaciones' );
	expect( readGLBJson( bytes ).animations.map( ( animation ) => animation.name ) ).toEqual( [ 'Saludar', 'Saltar' ] );

	// Sin "Incluir animaciones" la lista se oculta.
	await page.locator( '#export-anims' ).uncheck();
	await expect( list ).toBeHidden();
	await page.locator( '#export-anims' ).check();
	await expect( list ).toBeVisible();

	// El archivo exportado se vuelve a abrir con sus 2 animaciones.
	await page.locator( '#file-input' ).setInputFiles( { name: 'muneco_dos_animaciones.glb', mimeType: 'model/gltf-binary', buffer: bytes } );
	await expect( page.locator( '#info-body' ) ).toContainText( 'muneco_dos_animaciones.glb' );
	await expect( page.locator( '#anim-select option' ) ).toHaveCount( 2 );
	// Con otro modelo, todas vuelven a estar marcadas.
	await expect( list.locator( 'input[data-clip]:checked' ) ).toHaveCount( 2 );

} );
