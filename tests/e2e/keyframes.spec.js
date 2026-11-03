// Crear una animación a mano con keyframes: elegir una parte, girarla, poner keyframes, reproducir y exportar.
import { readGLBAccessor, readGLBJson } from '../helpers/gltf.js';
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
