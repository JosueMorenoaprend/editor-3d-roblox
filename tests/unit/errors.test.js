import { describe, expect, it } from 'vitest';
import { DEFAULT_HELP, UserError, describeError } from '../../src/core/errors.js';

describe( 'mensajes de error', () => {

	it( 'un error esperado se muestra tal cual (ya dice qué hacer)', () => {

		const error = new UserError( 'El archivo está dañado. Descárgalo otra vez.' );
		expect( describeError( error, { action: 'No se pudo abrir el modelo' } ) )
			.toBe( 'No se pudo abrir el modelo: El archivo está dañado. Descárgalo otra vez.' );

	} );

	it( 'un error inesperado dice qué hacer y deja el detalle técnico al final', () => {

		const text = describeError( new TypeError( 'Cannot read properties of undefined' ), {
			action: 'No se pudo exportar',
			help: 'Prueba con texturas de 1024 px.',
		} );
		expect( text ).toBe( 'No se pudo exportar. Prueba con texturas de 1024 px. (Detalle técnico: Cannot read properties of undefined)' );

	} );

	it( 'sin consejo usa uno general, y acepta cosas que no son Error', () => {

		const text = describeError( 'se cortó la luz' );
		expect( text ).toContain( DEFAULT_HELP );
		expect( text ).toContain( 'Detalle técnico: se cortó la luz' );
		expect( text.startsWith( 'Algo salió mal.' ) ).toBe( true );

	} );

} );
