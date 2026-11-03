// Crear una animación a mano con keyframes: elegir una parte, girarla, poner keyframes, reproducir y exportar.
import { readFileSync } from 'node:fs';
import { describeIssues, readGLBAccessor, readGLBJson, validateGLB } from '../helpers/gltf.js';
import { capture, captureScrolledTo, expect, exportAndValidate, openSample, test } from './fixtures.js';

test( 'crear una animación de 2 keyframes, reproducirla, guardarla y exportarla', async ( { page }, testInfo ) => {

	const editor = page.locator( '#anim-keys-editor' );
	const status = page.locator( '#keys-status' );
	await page.goto( './' );
	await openSample( page, 'Muñeco R15' );
	await page.locator( '#btn-keys-open' ).click();
	await expect( editor ).toBeVisible();
	await expect( page.locator( '#keys-name' ) ).toHaveValue( 'Mi animación' );
	await expect( page.locator( '#keys-part' ) ).toHaveValue( 'leftUpperArm' );
	await expect( status ).toContainText( '0 keyframes en total' );

	// Keyframe 1: a los 0 s, el brazo en reposo.
	await page.locator( '#btn-keys-set' ).click();
	await expect( status ).toContainText( '1 keyframe en total. «Brazo izquierdo»: en 0,00 s.' );

	// Keyframe 2: a 1 s, el brazo 80° hacia los lados.
	await page.locator( '#keys-time' ).fill( '1' );
	await expect( page.locator( '#keys-clock' ) ).toHaveText( '1,00 / 2,00 s' );
	await page.locator( '#keys-z' ).fill( '80' );
	await expect( page.locator( '#keys-z-value' ) ).toHaveText( '80°' );
	await page.locator( '#btn-keys-set' ).click();
	await expect( status ).toContainText( '2 keyframes en total. «Brazo izquierdo»: en 0,00 s, 1,00 s.' );
	await expect( page.locator( '.keys-mark' ) ).toHaveCount( 2 );
	await captureScrolledTo( page, testInfo, 'keyframes-editor', '#anim-keys' );
	await page.locator( '#viewport' ).scrollIntoViewIfNeeded();
	await capture( page, testInfo, 'keyframes-brazo' );

	// En 0,5 s el brazo va por la mitad del camino (el editor completa el movimiento).
	await page.locator( '#keys-time' ).fill( '0.5' );
	await expect( page.locator( '#keys-z-value' ) ).toHaveText( '40°' );

	// Reproducir (en bucle) y detener.
	const play = page.locator( '#btn-keys-play' );
	await play.click();
	await expect( page.locator( '#anim-select option:checked' ) ).toContainText( 'Mi animación (2 s, vista previa)' );
	await expect( play ).toHaveText( '■ Detener' );
	await expect( page.locator( '#btn-keys-set' ) ).toBeDisabled();
	await play.click();
	await expect( play ).toHaveText( '▶ Reproducir' );
	await expect( page.locator( '#keys-z-value' ) ).toHaveText( '40°' );

	// Guardar: queda en la lista.
	await page.locator( '#btn-keys-save' ).click();
	await expect( page.locator( '.toast' ).last() ).toContainText( 'agregué «Mi animación»' );
	await expect( editor ).toBeHidden();
	await expect( page.locator( '#anim-select option:checked' ) ).toContainText( 'Mi animación (2 s)' );

	// Exportar: GLB válido; el brazo tiene 2 keyframes (0 y 1 s) y el segundo está girado 80° en Z.
	const { bytes } = await exportAndValidate( page, testInfo, 'muneco_a_mano.glb' );
	const json = readGLBJson( bytes );
	const animation = json.animations.find( ( item ) => item.name === 'Mi animación' );
	expect( animation.channels ).toHaveLength( 1 );
	const channel = animation.channels[ 0 ];
	expect( json.nodes[ channel.target.node ].name ).toBe( 'LeftUpperArm' );
	const sampler = animation.samplers[ channel.sampler ];
	expect( readGLBAccessor( bytes, json, sampler.input ).map( ( [ time ] ) => time ) ).toEqual( [ 0, 1 ] );
	const [ , raised ] = readGLBAccessor( bytes, json, sampler.output );
	const half = ( 40 * Math.PI ) / 180;
	expect( raised[ 2 ] ).toBeCloseTo( Math.sin( half ), 3 );
	expect( raised[ 3 ] ).toBeCloseTo( Math.cos( half ), 3 );

} );

test( 'cancelar con keyframes pide confirmar antes de descartar', async ( { page } ) => {

	const editor = page.locator( '#anim-keys-editor' );
	const cancel = page.locator( '#btn-keys-cancel' );
	await page.goto( './' );
	await openSample( page, 'Muñeco R15' );
	await page.locator( '#btn-keys-open' ).click();
	await page.locator( '#keys-part' ).selectOption( 'head' );
	await page.locator( '#keys-y' ).fill( '30' );
	await page.locator( '#btn-keys-set' ).click();
	await cancel.click();
	await expect( cancel ).toHaveText( '¿Descartar 1 keyframe? Toca otra vez' );
	await expect( editor ).toBeVisible();
	await cancel.click();
	await expect( editor ).toBeHidden();
	await expect( page.locator( '#btn-keys-open' ) ).toBeVisible();
	await expect( page.locator( '#anim-select option' ) ).toHaveCount( 3 );

} );

/** El giro del segundo keyframe de «Mi animación» (brazo izquierdo) en un GLB exportado. */
function secondArmKey( bytes ) {

	const json = readGLBJson( bytes );
	const animation = json.animations.find( ( item ) => item.name === 'Mi animación' );
	const channel = animation.channels.find( ( item ) => json.nodes[ item.target.node ].name === 'LeftUpperArm' );
	return readGLBAccessor( bytes, json, animation.samplers[ channel.sampler ].output )[ 1 ];

}

/** Comprueba que un giro (cuaternión) es el de tantos grados "hacia los lados" (en Z) en el R15. */
function expectSideways( quaternion, degrees ) {

	const half = ( degrees * Math.PI ) / 360;
	expect( quaternion[ 0 ] ).toBeCloseTo( 0, 3 );
	expect( quaternion[ 1 ] ).toBeCloseTo( 0, 3 );
	expect( quaternion[ 2 ] ).toBeCloseTo( Math.sin( half ), 3 );
	expect( quaternion[ 3 ] ).toBeCloseTo( Math.cos( half ), 3 );

}

test( 'exportar y guardar el proyecto con el editor abierto: el archivo sale en reposo y la pose sigue', async ( { page }, testInfo ) => {

	const set = page.locator( '#btn-keys-set' );
	await page.goto( './' );
	await openSample( page, 'Muñeco R15' );
	await page.locator( '#btn-keys-open' ).click();
	await set.click(); // 0 s: el brazo en reposo
	await page.locator( '#keys-time' ).fill( '1' );
	await page.locator( '#keys-z' ).fill( '70' ); // girado, todavía sin keyframe

	// El GLB sale en la pose de reposo: el brazo no queda levantado como si fuera su forma normal.
	const { bytes: model } = await exportAndValidate( page, testInfo, 'muneco_editando.glb' );
	const arm = readGLBJson( model ).nodes.find( ( node ) => node.name === 'LeftUpperArm' );
	( arm.rotation || [ 0, 0, 0, 1 ] ).forEach( ( value, i ) => expect( value ).toBeCloseTo( [ 0, 0, 0, 1 ][ i ], 6 ) );

	// El proyecto también.
	const save = page.locator( '#btn-project-save' );
	await save.scrollIntoViewIfNeeded();
	const [ download ] = await Promise.all( [ page.waitForEvent( 'download' ), save.click() ] );
	const projectPath = testInfo.outputPath( 'muneco_editando.proyecto.glb' );
	await download.saveAs( projectPath );
	const project = readFileSync( projectPath );
	const { errors } = await validateGLB( project, 'proyecto.glb' );
	expect( errors, describeIssues( errors ) ).toHaveLength( 0 );
	expect( readGLBJson( project ).nodes.find( ( node ) => node.name === 'LeftUpperArm' ).rotation || [ 0, 0, 0, 1 ] ).toEqual( [ 0, 0, 0, 1 ] );

	// Y el brazo sigue como lo dejé: el keyframe guarda los 70°.
	await expect( page.locator( '#keys-z-value' ) ).toHaveText( '70°' );
	await set.click();
	await expect( page.locator( '#keys-status' ) ).toContainText( '2 keyframes en total' );
	await page.locator( '#btn-keys-save' ).click();
	const { bytes } = await exportAndValidate( page, testInfo, 'muneco_a_mano.glb' );
	expectSideways( secondArmKey( bytes ), 70 );

} );

test( 'ver otra animación mientras editas: el editor espera y después vuelve a tu pose', async ( { page }, testInfo ) => {

	const set = page.locator( '#btn-keys-set' );
	const busy = page.locator( '#keys-busy' );
	await page.goto( './' );
	await openSample( page, 'Muñeco R15' );
	await page.locator( '#btn-keys-open' ).click();
	await set.click();
	await page.locator( '#keys-time' ).fill( '1' );
	await page.locator( '#keys-z' ).fill( '70' );

	// Reproducir "Saludar" con el reproductor de arriba: no se puede editar mientras se ve.
	await page.locator( '#anim-select' ).selectOption( '0' );
	await page.locator( '#btn-anim-play' ).click();
	await expect( busy ).toBeVisible();
	await expect( busy ).toContainText( '«Saludar»' );
	await expect( set ).toBeDisabled();
	await expect( page.locator( '#keys-z' ) ).toBeDisabled();
	await captureScrolledTo( page, testInfo, 'keyframes-otra-animacion', '#anim-keys' );

	// "Volver a editar" la detiene y el brazo vuelve a como lo dejé.
	await page.locator( '#btn-keys-resume' ).click();
	await expect( busy ).toBeHidden();
	await expect( set ).toBeEnabled();
	await expect( page.locator( '#keys-z-value' ) ).toHaveText( '70°' );
	await expect( page.locator( '#keys-clock' ) ).toHaveText( '1,00 / 2,00 s' );
	await set.click();
	await page.locator( '#btn-keys-save' ).click();
	const { bytes } = await exportAndValidate( page, testInfo, 'muneco_a_mano.glb' );
	expectSideways( secondArmKey( bytes ), 70 );

} );

test( 'un keyframe guarda toda la pose que se ve y avisa antes de perder giros sin keyframe', async ( { page }, testInfo ) => {

	const status = page.locator( '#keys-status' );
	const lastToast = page.locator( '.toast' ).last();
	await page.goto( './' );
	await openSample( page, 'Muñeco R15' );
	await page.locator( '#btn-keys-open' ).click();

	// A 1 s: girar el brazo y la cabeza, sin poner keyframe todavía.
	await page.locator( '#keys-time' ).fill( '1' );
	await page.locator( '#keys-z' ).fill( '60' );
	await page.locator( '#keys-part' ).selectOption( 'head' );
	await page.locator( '#keys-y' ).fill( '30' );
	await expect( status ).toContainText( 'Giros sin keyframe: «Brazo izquierdo», «Cabeza».' );
	await captureScrolledTo( page, testInfo, 'keyframes-sin-guardar', '#keys-status' );

	// Un solo "Poner keyframe" guarda las 2 partes.
	await page.locator( '#btn-keys-set' ).click();
	await expect( lastToast ).toContainText( 'Keyframe en 1,00 s para 2 partes: Brazo izquierdo, Cabeza.' );
	await expect( status ).toContainText( '2 keyframes en total. «Cabeza»: en 1,00 s.' );
	await expect( status ).not.toContainText( 'Giros sin keyframe' );

	// Un giro sin keyframe se pierde al cambiar de momento, pero el editor lo dice.
	await page.locator( '#keys-x' ).fill( '20' );
	await page.locator( '#keys-time' ).fill( '0.5' );
	await expect( lastToast ).toContainText( 'Se descartaron los giros sin keyframe de «Cabeza».' );
	await expect( page.locator( '#keys-x-value' ) ).toHaveText( '0°' );

	// Guardar y exportar: el brazo y la cabeza tienen su keyframe.
	await page.locator( '#btn-keys-save' ).click();
	const { bytes } = await exportAndValidate( page, testInfo, 'muneco_pose.glb' );
	const json = readGLBJson( bytes );
	const animation = json.animations.find( ( item ) => item.name === 'Mi animación' );
	const partName = ( channel ) => json.nodes[ channel.target.node ].name;
	expect( animation.channels.map( partName ).sort() ).toEqual( [ 'Head', 'LeftUpperArm' ] );
	const arm = animation.channels.find( ( channel ) => partName( channel ) === 'LeftUpperArm' );
	expectSideways( readGLBAccessor( bytes, json, animation.samplers[ arm.sampler ].output )[ 0 ], 60 );

} );
