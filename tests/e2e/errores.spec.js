// Cada error dice qué pasó y cómo arreglarlo, en español claro.
import { expect, openSample, test } from './fixtures.js';

test( 'valores inválidos: el editor explica qué escribir', async ( { page } ) => {

	await page.goto( './' );
	await openSample( page, 'Carrito de piezas' );
	const lastToast = page.locator( '.toast-error' ).last();

	// Límite de triángulos demasiado bajo.
	const limit = page.locator( '#triangle-limit' );
	await limit.fill( '5' );
	await limit.press( 'Enter' );
	await expect( lastToast ).toContainText( 'tiene que ser un número de 100 o más' );
	await expect( limit ).toHaveValue( '20000' );

	// Objetivo de reducción demasiado bajo.
	const goal = page.locator( '#simplify-target' );
	await goal.fill( '3' );
	await goal.press( 'Enter' );
	await expect( lastToast ).toContainText( '50 triángulos o más' );
	await expect( goal ).toHaveValue( '20000' );

	// Escala y altura que no tienen sentido.
	const scale = page.locator( '#scale-input' );
	await scale.fill( '-2' );
	await scale.press( 'Enter' );
	await expect( lastToast ).toContainText( 'La escala tiene que ser un número mayor que 0' );
	await page.locator( '#height-input' ).fill( '0' );
	await page.locator( '#btn-height' ).click();
	await expect( lastToast ).toContainText( 'Escribe una altura mayor que 0' );

} );

test.describe( 'un .gltf al que le falta su textura', () => {

	// three.js avisa en la consola que no encontró la imagen: aquí es justo lo que se prueba.
	test.use( { allowedConsoleErrors: /Couldn't load texture|Failed to load resource/ } );

	test( 'se abre igual y dice qué archivo falta y qué hacer', async ( { page } ) => {

		await page.goto( './' );
		await page.locator( '#file-input' ).setInputFiles( {
			name: 'con_textura.gltf', mimeType: 'model/gltf+json', buffer: Buffer.from( JSON.stringify( gltfWithMissingTexture() ) ),
		} );
		await expect( page.locator( '#info-body' ) ).toContainText( 'con_textura.gltf' );
		const message = page.locator( '.toast-error' ).last();
		await expect( message ).toContainText( 'No encontré estos archivos del modelo: falta.png' );
		await expect( message ).toContainText( 'eligiendo también esos archivos' );

	} );

} );

/** Un triángulo con material y textura externa "falta.png" (que no se entrega). */
function gltfWithMissingTexture() {

	const positions = new Float32Array( [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ] );
	const uvs = new Float32Array( [ 0, 0, 1, 0, 0, 1 ] );
	const bytes = Buffer.concat( [ Buffer.from( positions.buffer ), Buffer.from( uvs.buffer ) ] );
	return {
		asset: { version: '2.0' },
		scene: 0,
		scenes: [ { nodes: [ 0 ] } ],
		nodes: [ { mesh: 0, name: 'Triangulo' } ],
		meshes: [ { primitives: [ { attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 } ] } ],
		materials: [ { pbrMetallicRoughness: { baseColorTexture: { index: 0 } } } ],
		textures: [ { source: 0 } ],
		images: [ { uri: 'falta.png' } ],
		buffers: [ { byteLength: bytes.length, uri: `data:application/octet-stream;base64,${ bytes.toString( 'base64' ) }` } ],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: 36 },
			{ buffer: 0, byteOffset: 36, byteLength: 24 },
		],
		accessors: [
			{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] },
			{ bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' },
		],
	};

}
