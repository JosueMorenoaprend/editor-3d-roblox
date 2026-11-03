import { beforeAll, describe, expect, it } from 'vitest';
import { exportGLB, verifyGLB } from '../../src/core/exporter.js';
import { simplifierReady, simplifyMeshes } from '../../src/core/simplifySync.js';
import { centerAndGround, rotate90, scaleToHeight } from '../../src/core/transform.js';
import { describeIssues, readGLBJson, validateGLB } from '../helpers/gltf.js';
import { openSample, sizeOf } from './helpers.js';

beforeAll( () => simplifierReady );

// En Node no hay <canvas> para guardar texturas: aquí se exporta la malla pesada sin
// textura. Las pruebas en el navegador (tests/e2e) exportan con texturas.
const CASES = [
	{ id: 'r15', triangles: 204, bones: 16, animations: 3 },
	{ id: 'pesado', options: { texture: false }, triangles: 120000, bones: 0, animations: 0 },
	{ id: 'piezas', bones: 0, animations: 0 },
];

describe( 'exportar GLB', () => {

	for ( const item of CASES ) {

		it( `ejemplo "${ item.id }": el GLB pasa el validador de Khronos con 0 errores`, async () => {

			const { model, scene } = openSample( item.id, item.options );
			const { arrayBuffer, blob } = await exportGLB( model );
			expect( blob.size ).toBe( arrayBuffer.byteLength );

			const { errors, warnings } = await validateGLB( arrayBuffer, `${ item.id }.glb` );
			expect( errors, describeIssues( errors ) ).toHaveLength( 0 );
			expect( warnings, describeIssues( warnings ) ).toHaveLength( 0 );

			const check = await verifyGLB( arrayBuffer, 20000 );
			if ( item.triangles ) expect( check.triangles ).toBe( item.triangles );
			expect( check.bones ).toBe( item.bones );
			expect( check.animations ).toBe( item.animations );

			// Después de exportar, el modelo vuelve a su escena.
			expect( model.container.parent ).toBe( scene );

		} );

	}

	it( 'los ajustes (giro y altura) quedan dentro del GLB', async () => {

		const { model } = openSample( 'piezas' );
		rotate90( model, 'y' );
		scaleToHeight( model, 2 );
		centerAndGround( model );
		const expected = sizeOf( model.getWorldBox() );

		const { arrayBuffer } = await exportGLB( model );
		const check = await verifyGLB( arrayBuffer, 20000 );
		expect( check.size.x ).toBeCloseTo( expected[ 0 ], 4 );
		expect( check.size.y ).toBeCloseTo( 2, 4 );
		expect( check.size.z ).toBeCloseTo( expected[ 2 ], 4 );

	} );

	it( 'sin animaciones cuando se desmarca la opción', async () => {

		const { model } = openSample( 'r15' );
		const { arrayBuffer } = await exportGLB( model, { animations: false } );
		const check = await verifyGLB( arrayBuffer, 20000 );
		expect( check.animations ).toBe( 0 );
		expect( check.bones ).toBe( 16 );

	} );

	it( 'solo las animaciones elegidas, en un GLB válido', async () => {

		const { model } = openSample( 'r15' );
		const [ wave, , jump ] = model.clips;
		const { arrayBuffer } = await exportGLB( model, { clips: [ wave, jump ] } );
		const { errors } = await validateGLB( arrayBuffer );
		expect( errors, describeIssues( errors ) ).toHaveLength( 0 );
		expect( readGLBJson( arrayBuffer ).animations.map( ( animation ) => animation.name ) ).toEqual( [ 'Saludar', 'Saltar' ] );
		expect( ( await verifyGLB( arrayBuffer, 20000 ) ).animations ).toBe( 2 );
		// El modelo sigue teniendo las 3.
		expect( model.clips ).toHaveLength( 3 );

	} );

	it( 'una malla reducida se exporta válida y bajo el límite', async () => {

		const { model } = openSample( 'pesado', { texture: false } );
		simplifyMeshes( model.meshes, 20000 );
		model.updateLocalBox();
		const { arrayBuffer } = await exportGLB( model );
		const { errors } = await validateGLB( arrayBuffer );
		expect( errors, describeIssues( errors ) ).toHaveLength( 0 );
		const check = await verifyGLB( arrayBuffer, 20000 );
		expect( check.meshesOverLimit ).toBe( 0 );
		expect( check.triangles ).toBeLessThanOrEqual( 20000 );

	} );

} );
