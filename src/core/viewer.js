// Visor 3D: renderizador, cámara, controles de órbita, luces, piso y cuadrícula.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class Viewer {

	/** @param {HTMLElement} container elemento donde se dibuja el lienzo */
	constructor( container ) {

		this.container = container;
		this.updaters = new Set();
		this.model = null;

		const renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
		renderer.toneMapping = THREE.NeutralToneMapping;
		renderer.shadowMap.enabled = true;
		container.prepend( renderer.domElement );
		this.renderer = renderer;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x1b1e24 );
		// Entorno de luz suave: sin esto los materiales metálicos (PBR) se ven negros.
		const pmrem = new THREE.PMREMGenerator( renderer );
		scene.environment = pmrem.fromScene( new RoomEnvironment(), 0.04 ).texture;
		scene.environmentIntensity = 0.9;
		pmrem.dispose();
		this.scene = scene;

		this.camera = new THREE.PerspectiveCamera( 45, 1, 0.01, 1000 );
		this.camera.position.set( 2.5, 1.8, 3.5 );

		this.controls = new OrbitControls( this.camera, renderer.domElement );
		this.controls.enableDamping = true;
		this.controls.target.set( 0, 0.8, 0 );

		const hemi = new THREE.HemisphereLight( 0xffffff, 0x445566, 0.6 );
		scene.add( hemi );

		const sun = new THREE.DirectionalLight( 0xffffff, 1.6 );
		sun.castShadow = true;
		sun.shadow.mapSize.set( 2048, 2048 );
		sun.shadow.bias = - 0.0005;
		sun.shadow.normalBias = 0.02;
		scene.add( sun, sun.target );
		this.sun = sun;

		// Piso: recibe sombras (ShadowMaterial es transparente salvo la sombra).
		this.floor = new THREE.Mesh(
			new THREE.PlaneGeometry( 1, 1 ),
			new THREE.ShadowMaterial( { color: 0x000000, opacity: 0.3 } )
		);
		this.floor.rotation.x = - Math.PI / 2;
		this.floor.receiveShadow = true;
		scene.add( this.floor );

		this.grid = null;
		this.helpers = new THREE.Group();
		scene.add( this.helpers );

		this.setGroundSize( 2 );

		this._resize = this._resize.bind( this );
		new ResizeObserver( this._resize ).observe( container );
		this._resize();

		this._last = performance.now();
		renderer.setAnimationLoop( () => this._tick() );

	}

	/** Registra una función que se llama en cada cuadro con el tiempo transcurrido (segundos). */
	onUpdate( fn ) {

		this.updaters.add( fn );
		return () => this.updaters.delete( fn );

	}

	/** Pone un objeto en la escena (y quita el anterior). */
	setModel( object ) {

		if ( this.model ) this.scene.remove( this.model );
		this.model = object;
		if ( object ) this.scene.add( object );

	}

	setGroundVisible( visible ) {

		this.grid.visible = visible;
		this.floor.visible = visible;

	}

	/**
	 * Ajusta el tamaño de la cuadrícula al tamaño del modelo.
	 * Cada casilla mide una potencia de 10 (0,1 m, 1 m, 10 m...), de modo que
	 * el modelo ocupe entre 5 y 50 casillas.
	 */
	setGroundSize( span ) {

		span = Math.max( span, 1e-3 );
		const cell = Math.pow( 10, Math.ceil( Math.log10( span / 50 ) ) );
		let divisions = Math.ceil( ( span * 4 ) / cell );
		divisions = Math.min( 200, divisions + ( divisions % 2 ) );
		const size = divisions * cell;

		const visible = this.grid ? this.grid.visible : true;
		if ( this.grid ) {

			this.scene.remove( this.grid );
			this.grid.geometry.dispose();
			this.grid.material.dispose();

		}

		this.grid = new THREE.GridHelper( size, divisions, 0x5a6a85, 0x343b48 );
		this.grid.visible = visible;
		this.scene.add( this.grid );
		this.floor.scale.set( size, size, 1 );
		this.cellSize = cell;

	}

	/**
	 * Mueve la cámara para que el objeto se vea completo.
	 * Con keepDirection la cámara mantiene el ángulo actual y solo se acerca o aleja.
	 */
	frame( object = this.model, options = {} ) {

		if ( ! object ) return;
		object.updateMatrixWorld( true );
		this.frameBox( new THREE.Box3().setFromObject( object, true ), options );

	}

	/** Igual que frame(), pero a partir de una caja ya calculada. */
	frameBox( box, { keepDirection = false } = {} ) {

		if ( ! box || box.isEmpty() ) return;

		const size = box.getSize( new THREE.Vector3() );
		const center = box.getCenter( new THREE.Vector3() );
		const radius = Math.max( size.length() / 2, 1e-3 );

		const camera = this.camera;
		const vFov = THREE.MathUtils.degToRad( camera.fov );
		const hFov = 2 * Math.atan( Math.tan( vFov / 2 ) * camera.aspect );
		const fov = Math.min( vFov, hFov );
		const distance = ( radius / Math.sin( fov / 2 ) ) * 1.05;

		const direction = new THREE.Vector3( 0.55, 0.4, 1 );
		if ( keepDirection ) direction.subVectors( camera.position, this.controls.target );
		if ( direction.lengthSq() < 1e-12 ) direction.set( 0.55, 0.4, 1 );
		direction.normalize();
		camera.position.copy( center ).addScaledVector( direction, distance );
		camera.near = distance / 100;
		camera.far = distance * 100;
		camera.updateProjectionMatrix();

		this.controls.target.copy( center );
		this.controls.update();

		this.fitLightsAndGround( box );

	}

	/** Coloca la luz y el piso según el tamaño del modelo. */
	fitLightsAndGround( box ) {

		const size = box.getSize( new THREE.Vector3() );
		const center = box.getCenter( new THREE.Vector3() );
		const span = Math.max( size.x, size.y, size.z, 1e-3 );

		this.setGroundSize( Math.max( span, Math.abs( center.x ) * 2, Math.abs( center.z ) * 2 ) );

		const sun = this.sun;
		sun.position.set( center.x + span, center.y + span * 2, center.z + span * 1.5 );
		sun.target.position.copy( center );
		const cam = sun.shadow.camera;
		cam.left = cam.bottom = - span * 1.5;
		cam.right = cam.top = span * 1.5;
		cam.near = span * 0.01;
		cam.far = span * 8;
		cam.updateProjectionMatrix();

	}

	_resize() {

		const width = Math.max( 1, this.container.clientWidth );
		const height = Math.max( 1, this.container.clientHeight );
		this.renderer.setSize( width, height, false );
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();

	}

	_tick() {

		const now = performance.now();
		const delta = Math.min( ( now - this._last ) / 1000, 0.1 );
		this._last = now;

		for ( const fn of this.updaters ) fn( delta );
		this.controls.update();
		this.renderer.render( this.scene, this.camera );

	}

}
