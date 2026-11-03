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
//   core/boneMap.js    mapa de huesos (qué hueso es cada parte del cuerpo) y su detección/prueba
//   core/exporter.js   exportar .glb (GLTFExporter)
//   ui/*.js            los paneles de la interfaz
import './style.css';
import { App } from './app.js';
import { describeError } from './core/errors.js';
import { Viewer } from './core/viewer.js';
import { initAdjustPanel } from './ui/adjustPanel.js';
import { initAnimationImport } from './ui/animationImport.js';
import { initAnimationPanel } from './ui/animationPanel.js';
import { initAutosave } from './ui/autosave.js';
import { initBoneMapPanel } from './ui/boneMapPanel.js';
import { $ } from './ui/dom.js';
import { initExportPanel } from './ui/exportPanel.js';
import { initHistoryControls } from './ui/historyControls.js';
import { initInfoPanel } from './ui/infoPanel.js';
import { initProjectPanel } from './ui/projectPanel.js';
import { initSamples } from './ui/samples.js';
import { initSimplifyPanel } from './ui/simplifyPanel.js';
import { toast } from './ui/toast.js';
import { initFileOpening, initViewportTools } from './ui/viewportTools.js';

function start() {

	// Al recargar, empezar arriba (si no, en el celular no se ve la tarjeta "¿Seguimos donde lo dejaste?").
	if ( 'scrollRestoration' in window.history ) window.history.scrollRestoration = 'manual';

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
	initHistoryControls( app );
	initInfoPanel( app );
	initAdjustPanel( app );
	initSimplifyPanel( app );
	initBoneMapPanel( app );
	initAnimationPanel( app );
	initAnimationImport( app );
	initExportPanel( app );
	initProjectPanel( app );
	initAutosave( app );

	// Fallos que nadie esperaba: se explican igual, sin repetir el mismo aviso muchas veces.
	let lastUnexpected = '';
	const unexpected = ( error ) => {

		const text = describeError( error, {
			action: 'Algo falló sin que lo esperáramos',
			help: 'Si el editor se comporta raro, recarga la página: tu trabajo se guarda solo en este navegador.',
		} );
		if ( text === lastUnexpected ) return;
		lastUnexpected = text;
		toast( text, 'error' );

	};

	window.addEventListener( 'unhandledrejection', ( event ) => {

		console.error( event.reason );
		unexpected( event.reason );

	} );
	window.addEventListener( 'error', ( event ) => {

		// Aviso inofensivo del navegador al cambiar el tamaño de la ventana: no es un fallo.
		if ( String( event.message ).includes( 'ResizeObserver loop' ) ) return;
		unexpected( event.error || event.message );

	} );

}

start();
