// Mapa de huesos: ver lo que se detectó solo, corregirlo a mano, probarlo y guardarlo en el proyecto.
import { readFileSync } from 'node:fs';
import { describeIssues, readGLBJson, validateGLB } from '../helpers/gltf.js';
import { createOddRigGLB } from '../helpers/oddRig.js';
import { capture, captureScrolledTo, expect, exportAndValidate, openSample, test } from './fixtures.js';

test( 'corregir el mapa de huesos a mano, probarlo y guardarlo en el proyecto', async ( { page }, testInfo ) => {

	const status = page.locator( '#bonemap-status' );
	const summary = page.locator( '#bonemap-summary' );
	const now = page.locator( '#bonemap-now' );
	const leftHand = page.locator( '#bonemap-leftHand' );
	const rightFoot = page.locator( '#bonemap-rightFoot' );

	// Un personaje con dos huesos de nombres raros: el editor no sabe cuáles son la mano y el pie.
	await page.goto( './' );
	await page.locator( '#file-input' ).setInputFiles( { name: 'personaje_raro.glb', mimeType: 'model/gltf-binary', buffer: await createOddRigGLB() } );
	await expect( page.locator( '#info-body' ) ).toContainText( 'Sí, 16 huesos' );
	await expect( status ).toContainText( 'Hay que revisar el mapa' );
	await expect( status ).toContainText( 'Falta elegir qué hueso es «Mano izquierda»' );
	await expect( status ).toContainText( 'Falta elegir qué hueso es «Pie derecho»' );
	await expect( summary ).toContainText( '13 de 15 necesarias' );
	// Falta algo: la lista se abre sola y las filas que faltan quedan marcadas.
	await expect( page.locator( '#bonemap-details' ) ).toHaveAttribute( 'open', '' );
	await expect( page.locator( '.bonemap-row[data-key="leftHand"]' ) ).toHaveAttribute( 'data-state', 'missing' );
	await expect( leftHand ).toHaveValue( '' );
	await captureScrolledTo( page, testInfo, 'huesos-faltan', '#bonemap-section' );
	await captureScrolledTo( page, testInfo, 'huesos-faltan-lista', '#bonemap-details' );

	// Elegir a mano los huesos que faltan.
	await leftHand.selectOption( 'Bone_07' );
	await rightFoot.selectOption( 'Bone_12' );
	await expect( status ).toContainText( 'Mapa completo' );
	await expect( summary ).toContainText( '15 de 15 necesarias' );
	await expect( page.locator( '.bonemap-row[data-key="rightFoot"]' ) ).toHaveAttribute( 'data-state', 'ok' );

	// Probar solo la mano izquierda: se mueve el hueso que se eligió.
	await page.locator( '[data-try="leftHand"]' ).click();
	await expect( now ).toContainText( '«Mano izquierda» (Bone_07)' );
	await expect( now ).toContainText( 'Probado: «Mano izquierda» (Bone_07)' );

	// Deshacer y rehacer el cambio del pie.
	await page.locator( '#btn-undo' ).click();
	await expect( rightFoot ).toHaveValue( '' );
	await expect( status ).toContainText( '«Pie derecho»' );
	await page.locator( '#btn-redo' ).click();
	await expect( rightFoot ).toHaveValue( 'Bone_12' );
	await expect( status ).toContainText( 'Mapa completo' );

	// Probar todo el mapa: cada parte por turnos, empezando por la cadera.
	const testButton = page.locator( '#btn-bonemap-test' );
	await testButton.click();
	await expect( now ).toContainText( 'Ahora se mueve: «Cadera» (LowerTorso)' );
	await expect( testButton ).toHaveText( 'Detener la prueba' );
	await expect( now ).toContainText( 'Ahora se mueve: «Brazo izquierdo» (LeftUpperArm)' );
	await page.locator( '#viewport' ).scrollIntoViewIfNeeded();
	await capture( page, testInfo, 'huesos-probando', { wait: false } );
	await testButton.click();
	await expect( now ).toHaveText( 'Prueba detenida.' );
	await expect( testButton ).toHaveText( 'Probar el mapa' );

	// Guardar el proyecto: el mapa corregido va adentro.
	const save = page.locator( '#btn-project-save' );
	await save.scrollIntoViewIfNeeded();
	const [ download ] = await Promise.all( [ page.waitForEvent( 'download' ), save.click() ] );
	const path = testInfo.outputPath( 'personaje_raro.proyecto.glb' );
	await download.saveAs( path );
	const bytes = readFileSync( path );
	const { errors } = await validateGLB( bytes, 'personaje_raro.proyecto.glb' );
	expect( errors, describeIssues( errors ) ).toHaveLength( 0 );
	const saved = readGLBJson( bytes ).scenes[ 0 ].extras.editor3dRoblox;
	expect( saved.format ).toBe( 2 );
	expect( saved.boneMap ).toMatchObject( { leftHand: 'Bone_07', rightFoot: 'Bone_12', hips: 'LowerTorso' } );

	// Otro día: recargar la página y abrir el proyecto. El mapa vuelve con las correcciones.
	await page.reload();
	await expect( page.locator( '#empty-state' ) ).toBeVisible();
	await page.locator( '#file-input' ).setInputFiles( { name: 'personaje_raro.proyecto.glb', mimeType: 'model/gltf-binary', buffer: bytes } );
	await expect( page.locator( '.toast' ).last() ).toContainText( 'Proyecto abierto: personaje_raro' );
	await expect( status ).toContainText( 'Mapa completo' );
	await expect( leftHand ).toHaveValue( 'Bone_07' );
	await expect( rightFoot ).toHaveValue( 'Bone_12' );

	// El GLB para Roblox sigue saliendo válido.
	await exportAndValidate( page, testInfo, 'personaje_raro_roblox.glb' );

} );

test( 'muñeco R15: mapa completo, detectar otra vez y la prueba se ve en Animaciones', async ( { page }, testInfo ) => {

	const status = page.locator( '#bonemap-status' );
	const hips = page.locator( '#bonemap-hips' );

	// Un modelo sin esqueleto lo explica.
	await page.goto( './' );
	await openSample( page, 'Carrito de piezas' );
	await expect( page.locator( '#bonemap-empty' ) ).toContainText( 'no tiene esqueleto' );
	await expect( page.locator( '#bonemap-controls' ) ).toBeHidden();

	await page.reload();
	await openSample( page, 'Muñeco R15' );
	await expect( status ).toContainText( 'Mapa completo' );
	await expect( page.locator( '#bonemap-summary' ) ).toContainText( 'Roblox R15' );
	await expect( page.locator( '#bonemap-summary' ) ).toContainText( '15 de 15 necesarias' );
	// Completo: la lista queda cerrada para no ocupar lugar.
	await expect( page.locator( '#bonemap-details' ) ).not.toHaveAttribute( 'open', '' );
	await captureScrolledTo( page, testInfo, 'huesos-r15', '#bonemap-section' );

	// "Detectar otra vez" sin cambios no hace nada.
	await page.locator( '#btn-bonemap-detect' ).click();
	await expect( page.locator( '.toast' ).last() ).toContainText( 'ya es el que se detecta solo' );

	// Un cambio a mano y "Detectar otra vez" lo vuelve atrás (y eso también se puede deshacer).
	await page.locator( '#bonemap-details > summary' ).click();
	await hips.selectOption( 'HumanoidRootPart' );
	await expect( status ).toContainText( 'Mapa completo' );
	await page.locator( '#btn-bonemap-detect' ).click();
	await expect( hips ).toHaveValue( 'LowerTorso' );
	await page.keyboard.press( 'Control+z' );
	await expect( hips ).toHaveValue( 'HumanoidRootPart' );

	// Mientras se prueba el mapa, el panel Animaciones muestra la prueba; al detenerla, vuelve.
	await page.locator( '#btn-bonemap-test' ).click();
	const animSelect = page.locator( '#anim-select' );
	await expect( animSelect ).toHaveValue( 'vista-previa' );
	await expect( animSelect.locator( 'option:checked' ) ).toContainText( 'Prueba del mapa de huesos' );
	await page.locator( '#btn-anim-stop' ).click();
	await expect( animSelect ).toHaveValue( '0' );
	await expect( page.locator( '#bonemap-now' ) ).toHaveText( 'Prueba detenida.' );

	// Una prueba que llega al final pregunta si se movió lo que se esperaba.
	await page.locator( '[data-try="head"]' ).click();
	await expect( page.locator( '#bonemap-now' ) ).toContainText( 'Probado: «Cabeza» (Head). ¿Se movió esa parte del cuerpo?' );

	// Exportar en medio de una prueba la detiene y el GLB queda en la pose de reposo, válido.
	await page.locator( '#btn-bonemap-test' ).click();
	await expect( page.locator( '#bonemap-now' ) ).toContainText( 'Ahora se mueve' );
	const { bytes } = await exportAndValidate( page, testInfo, 'muneco_r15_prueba.glb' );
	await expect( page.locator( '#bonemap-now' ) ).toHaveText( 'Prueba detenida.' );
	const json = readGLBJson( bytes );
	expect( json.animations.map( ( a ) => a.name ) ).toEqual( [ 'Saludar', 'Caminar', 'Saltar' ] );
	// La prueba no se exporta y el muñeco sale en reposo: ninguno de sus huesos queda girado.
	const turned = json.nodes.filter( ( node ) => node.rotation && Math.abs( node.rotation[ 3 ] ) < 0.99999 );
	expect( turned.map( ( node ) => node.name ) ).toEqual( [] );

} );
