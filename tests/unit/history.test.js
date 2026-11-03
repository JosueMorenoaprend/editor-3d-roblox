import { describe, expect, it, vi } from 'vitest';
import { History } from '../../src/core/history.js';
import { captureGeometryState, applyGeometryState, isSimplified } from '../../src/core/simplify.js';
import { simplifierReady, simplifyMeshes } from '../../src/core/simplifySync.js';
import { countTriangles } from '../../src/core/info.js';
import { getTransformState, rotate90, setTransformState, setUniformScale } from '../../src/core/transform.js';
import { openSample } from './helpers.js';

/** Un contador con acciones de sumar, para probar el historial sin 3D. */
function counter() {

	const state = { value: 0 };
	const add = ( n ) => {

		state.value += n;
		return { label: `Sumar ${ n }`, undo: () => ( state.value -= n ), redo: () => ( state.value += n ) };

	};

	return { state, add };

}

describe( 'History', () => {

	it( 'deshace y rehace en orden', () => {

		const history = new History();
		const { state, add } = counter();
		history.push( add( 1 ) );
		history.push( add( 10 ) );
		expect( state.value ).toBe( 11 );
		expect( history.undoLabel ).toBe( 'Sumar 10' );

		expect( history.undo() ).toBe( 'Sumar 10' );
		expect( state.value ).toBe( 1 );
		expect( history.undo() ).toBe( 'Sumar 1' );
		expect( state.value ).toBe( 0 );
		expect( history.undo() ).toBeNull();
		expect( history.canUndo ).toBe( false );

		expect( history.redo() ).toBe( 'Sumar 1' );
		expect( history.redo() ).toBe( 'Sumar 10' );
		expect( state.value ).toBe( 11 );
		expect( history.canRedo ).toBe( false );

	} );

	it( 'una acción nueva borra lo que se podía rehacer (y lo libera)', () => {

		const history = new History();
		const { state, add } = counter();
		const dispose = vi.fn();
		history.push( { ...add( 1 ), dispose } );
		history.undo();
		expect( history.canRedo ).toBe( true );
		history.push( add( 5 ) );
		expect( history.canRedo ).toBe( false );
		expect( dispose ).toHaveBeenCalledOnce();
		expect( state.value ).toBe( 5 );

	} );

	it( 'recuerda como máximo `limit` pasos', () => {

		const history = new History( { limit: 3 } );
		const { add } = counter();
		for ( let i = 1; i <= 5; i ++ ) history.push( add( i ) );
		let steps = 0;
		while ( history.undo() ) steps ++;
		expect( steps ).toBe( 3 );

	} );

	it( 'avisa con el evento change y se puede vaciar', () => {

		const history = new History();
		const { add } = counter();
		const onChange = vi.fn();
		history.addEventListener( 'change', onChange );
		history.push( add( 1 ) );
		history.undo();
		history.clear();
		expect( onChange ).toHaveBeenCalledTimes( 3 );
		expect( history.canUndo || history.canRedo ).toBe( false );

	} );

	it( 'no acepta comandos sin undo/redo', () => {

		expect( () => new History().push( { label: 'x' } ) ).toThrow( /undo\(\) y redo\(\)/ );

	} );

} );

describe( 'estados para deshacer', () => {

	it( 'ajustes: guarda y restaura escala, giro y posición', () => {

		const { model } = openSample( 'piezas' );
		const before = getTransformState( model );
		rotate90( model, 'y' );
		setUniformScale( model, 2 );
		const after = getTransformState( model );
		setTransformState( model, before );
		expect( getTransformState( model ) ).toEqual( before );
		setTransformState( model, after );
		expect( getTransformState( model ) ).toEqual( after );

	} );

	it( 'reducir: guarda y restaura las geometrías (y si la malla estaba reducida)', async () => {

		await simplifierReady;
		const { model } = openSample( 'pesado', { texture: false } );
		const before = captureGeometryState( model.meshes );
		simplifyMeshes( model.meshes, 20000 );
		const after = captureGeometryState( model.meshes );
		const mesh = model.meshes[ 0 ];

		applyGeometryState( before );
		expect( countTriangles( mesh.geometry ) ).toBe( 120000 );
		expect( isSimplified( mesh ) ).toBe( false );

		applyGeometryState( after );
		expect( countTriangles( mesh.geometry ) ).toBeLessThanOrEqual( 20000 );
		expect( isSimplified( mesh ) ).toBe( true );

	} );

} );
