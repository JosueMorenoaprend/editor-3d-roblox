// Botones sobre la vista 3D y apertura de archivos (botón y arrastrar y soltar).
import { SkeletonHelper } from 'three';
import { $ } from './dom.js';

export function initViewportTools( app ) {

	const viewer = app.viewer;
	const frameButton = $( '#btn-frame' );
	const wireButton = $( '#btn-wire' );
	const bonesButton = $( '#btn-bones' );
	const gridButton = $( '#btn-grid' );

	let wireframe = false;
	let skeletonHelper = null;

	const pressed = ( button, on ) => button.setAttribute( 'aria-pressed', String( on ) );

	function forEachMaterial( fn ) {

		app.model?.container.traverse( ( object ) => {

			if ( ! object.isMesh ) return;
			for ( const material of [].concat( object.material ) ) if ( material ) fn( material );

		} );

	}

	function applyWireframe() {

		forEachMaterial( ( material ) => {

			material.wireframe = wireframe;

		} );

	}

	function setBones( on ) {

		if ( skeletonHelper ) {

			viewer.helpers.remove( skeletonHelper );
			skeletonHelper.dispose();
			skeletonHelper = null;

		}

		if ( on && app.model ) {

			skeletonHelper = new SkeletonHelper( app.model.container );
			viewer.helpers.add( skeletonHelper );

		}

		pressed( bonesButton, !! skeletonHelper );

	}

	frameButton.addEventListener( 'click', () => app.model && viewer.frameBox( app.model.getWorldBox() ) );

	wireButton.addEventListener( 'click', () => {

		wireframe = ! wireframe;
		applyWireframe();
		pressed( wireButton, wireframe );

	} );

	bonesButton.addEventListener( 'click', () => setBones( ! skeletonHelper ) );

	gridButton.addEventListener( 'click', () => {

		const visible = gridButton.getAttribute( 'aria-pressed' ) !== 'true';
		viewer.setGroundVisible( visible );
		pressed( gridButton, visible );

	} );

	app.on( 'model', () => {

		const model = app.model;
		const hasBones = !! model && model.meshes.some( ( mesh ) => mesh.isSkinnedMesh );
		frameButton.disabled = ! model;
		wireButton.disabled = ! model;
		bonesButton.disabled = ! hasBones;
		setBones( false );
		applyWireframe();
		$( '#empty-state' ).hidden = !! model;

	} );

	// Las mallas nuevas (al reducir) usan los mismos materiales, pero por si acaso.
	app.on( 'geometry', applyWireframe );

}

export function initFileOpening( app ) {

	const input = $( '#file-input' );
	const overlay = $( '#drop-overlay' );

	$( '#btn-open' ).addEventListener( 'click', () => input.click() );
	input.addEventListener( 'change', async () => {

		const files = [ ...input.files ];
		input.value = ''; // permite volver a elegir el mismo archivo
		await app.openFiles( files );

	} );

	const hasFiles = ( event ) => [ ...( event.dataTransfer?.types || [] ) ].includes( 'Files' );
	let depth = 0;

	window.addEventListener( 'dragenter', ( event ) => {

		if ( ! hasFiles( event ) ) return;
		event.preventDefault();
		depth ++;
		overlay.hidden = false;

	} );

	window.addEventListener( 'dragover', ( event ) => {

		if ( ! hasFiles( event ) ) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';

	} );

	window.addEventListener( 'dragleave', ( event ) => {

		if ( ! hasFiles( event ) ) return;
		depth = Math.max( 0, depth - 1 );
		if ( depth === 0 ) overlay.hidden = true;

	} );

	window.addEventListener( 'drop', ( event ) => {

		if ( ! hasFiles( event ) ) return;
		event.preventDefault();
		depth = 0;
		overlay.hidden = true;
		app.openFiles( [ ...event.dataTransfer.files ] );

	} );

}
