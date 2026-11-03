// Punto de entrada: crea el visor y conecta cada panel.
//
// Módulos:
//   core/loader.js     abrir .glb / .gltf (Draco y Meshopt incluidos)
//   core/viewer.js     vista 3D (cámara, luces, piso)
//   core/model.js      el modelo abierto y su contenedor de ajustes
//   core/info.js       triángulos, medidas, huesos, animaciones
//   core/transform.js  escala, giros de 90°, apoyar en el suelo
//   core/simplify.js   reducir polígonos (meshoptimizer)
//   core/animation.js  reproducir animaciones (AnimationMixer)
//   core/exporter.js   exportar .glb (GLTFExporter)
//   ui/*.js            los paneles de la interfaz
import './style.css';
import { App } from './app.js';
import { Viewer } from './core/viewer.js';
import { initAdjustPanel } from './ui/adjustPanel.js';
import { initAnimationPanel } from './ui/animationPanel.js';
import { $ } from './ui/dom.js';
import { initExportPanel } from './ui/exportPanel.js';
import { initInfoPanel } from './ui/infoPanel.js';
import { initSamples } from './ui/samples.js';
import { initSimplifyPanel } from './ui/simplifyPanel.js';
import { toast } from './ui/toast.js';
import { initFileOpening, initViewportTools } from './ui/viewportTools.js';

function start() {

	let viewer;
	try {

		viewer = new Viewer( $( '#viewport' ) );

	} catch ( error ) {

		console.error( error );
		$( '#empty-state' ).innerHTML = `<div class="empty-card"><p class="empty-title">Tu navegador no pudo iniciar WebGL</p>
			<p class="muted">El editor necesita WebGL para mostrar modelos 3D. Prueba con Chrome, Edge o Firefox actualizados y con la aceleración por hardware activada.</p></div>`;
		return;

	}

	const app = new App( viewer );
	initViewportTools( app );
	initFileOpening( app );
	initSamples( app );
	initInfoPanel( app );
	initAdjustPanel( app );
	initSimplifyPanel( app );
	initAnimationPanel( app );
	initExportPanel( app );

	window.addEventListener( 'unhandledrejection', ( event ) => {

		console.error( event.reason );
		toast( `Error inesperado: ${ event.reason?.message || event.reason }`, 'error' );

	} );

}

start();
