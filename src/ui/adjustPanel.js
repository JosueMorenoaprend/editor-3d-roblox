// Panel "Ajustes": escala, altura deseada, giros de 90° y apoyar en el suelo.
import { METERS_PER_STUD } from '../app.js';
import {
	centerAndGround, getUniformScale, resetTransform, rotate90, scaleToHeight, setUniformScale,
} from '../core/transform.js';
import { $, $$, readNumber } from './dom.js';
import { toast } from './toast.js';

export function initAdjustPanel( app ) {

	const scaleInput = $( '#scale-input' );
	const heightInput = $( '#height-input' );
	const heightUnit = $( '#height-unit' );
	const keepGrounded = $( '#keep-grounded' );
	const controls = [
		scaleInput, heightInput, heightUnit, $( '#btn-height' ), $( '#btn-scale-reset' ),
		$( '#btn-ground' ), $( '#btn-reset-transform' ), ...$$( '[data-scale-mul]' ), ...$$( '[data-rotate]' ),
	];

	keepGrounded.checked = app.settings.keepGrounded;
	heightUnit.value = app.settings.heightUnit;

	/** Aplica un cambio, apoya en el suelo si corresponde y avisa al resto. */
	function adjust( change, { ground = keepGrounded.checked } = {} ) {

		const model = app.model;
		if ( ! model ) return;
		change( model );
		if ( ground ) centerAndGround( model );
		app.viewer.frameBox( model.getWorldBox(), { keepDirection: true } );
		app.emit( 'transform' );

	}

	scaleInput.addEventListener( 'change', () => {

		const value = readNumber( scaleInput );
		if ( value === null || value <= 0 ) {

			toast( 'La escala tiene que ser un número mayor que 0.', 'error' );
			render();
			return;

		}

		adjust( ( model ) => setUniformScale( model, value ) );

	} );

	for ( const button of $$( '[data-scale-mul]' ) ) {

		button.addEventListener( 'click', () => {

			const factor = Number( button.dataset.scaleMul );
			adjust( ( model ) => setUniformScale( model, getUniformScale( model ) * factor ) );

		} );

	}

	$( '#btn-scale-reset' ).addEventListener( 'click', () => adjust( ( model ) => setUniformScale( model, 1 ) ) );

	$( '#btn-height' ).addEventListener( 'click', () => {

		const value = readNumber( heightInput );
		if ( value === null || value <= 0 ) {

			toast( 'Escribe una altura mayor que 0.', 'error' );
			return;

		}

		const meters = heightUnit.value === 'studs' ? value * METERS_PER_STUD : value;
		adjust( ( model ) => scaleToHeight( model, meters ) );

	} );

	heightInput.addEventListener( 'keydown', ( event ) => {

		if ( event.key === 'Enter' ) $( '#btn-height' ).click();

	} );

	heightUnit.addEventListener( 'change', () => {

		app.setSetting( 'heightUnit', heightUnit.value );
		render();

	} );

	for ( const button of $$( '[data-rotate]' ) ) {

		button.addEventListener( 'click', () => adjust( ( model ) => rotate90( model, button.dataset.rotate ) ) );

	}

	keepGrounded.addEventListener( 'change', () => app.setSetting( 'keepGrounded', keepGrounded.checked ) );

	$( '#btn-ground' ).addEventListener( 'click', () => adjust( () => {}, { ground: true } ) );

	$( '#btn-reset-transform' ).addEventListener( 'click', () => adjust( resetTransform, { ground: false } ) );

	function render() {

		const model = app.model;
		for ( const control of controls ) control.disabled = ! model;
		if ( ! model ) {

			scaleInput.value = 1;
			heightInput.value = '';
			return;

		}

		scaleInput.value = String( Number( getUniformScale( model ).toFixed( 4 ) ) );
		const box = model.getWorldBox();
		const height = box.isEmpty() ? 0 : box.max.y - box.min.y;
		const shown = heightUnit.value === 'studs' ? height / METERS_PER_STUD : height;
		heightInput.value = Number( shown.toFixed( 3 ) );

	}

	app.on( [ 'model', 'transform', 'geometry' ], render );
	render();

}
