// Reproducción de las animaciones que trae el modelo (AnimationMixer de three.js).
//
// Pensado para la v2: `addClips()` permitirá sumar animaciones de Mixamo ya
// adaptadas al esqueleto del personaje (SkeletonUtils.retargetClip).
//
// `playPreview( clip )` reproduce una vez una animación que NO es del modelo (por ejemplo, la prueba
// del mapa de huesos): no se exporta ni se guarda, y al terminar el modelo vuelve a su pose de reposo.
import { AnimationMixer, LoopOnce, LoopRepeat } from 'three';

export class AnimationController extends EventTarget {

	constructor() {

		super();
		this.model = null;
		this.mixer = null;
		this.clips = [];
		this.action = null;
		this.loop = true;
		this.speed = 1;
		/** Vista previa en curso: { clip, previousIndex } (o null). */
		this.preview = null;
		this._previewDone = false;

	}

	/** @param {import('./model.js').LoadedModel|null} model */
	setModel( model ) {

		this.stop();
		this.model = model;
		this.clips = model ? model.clips : [];
		this.mixer = model ? new AnimationMixer( model.container ) : null;
		this.action = null;
		if ( this.mixer ) {

			this.mixer.addEventListener( 'finished', ( event ) => {

				// Al terminar la vista previa, el modelo vuelve al reposo y a la animación de antes.
				// (No se detiene aquí, en mitad de la actualización del mezclador, sino justo después.)
				if ( this.preview && event.action.getClip() === this.preview.clip ) this._previewDone = true;
				else this._emit();

			} );

		}

		this._emit();

	}

	/**
	 * Reproduce una animación que no es del modelo (vista previa). Detiene lo que estaba sonando.
	 * @param {import('three').AnimationClip} clip
	 * @param {{ loop?: boolean, time?: number }} [options] loop: repetirla hasta detenerla (si no, suena
	 *   una vez); time: segundo en que empieza (para seguir en el mismo punto al cambiar un deslizador)
	 */
	playPreview( clip, { loop = false, time = 0 } = {} ) {

		if ( ! this.mixer || ! clip ) return;
		const previousIndex = this.preview ? this.preview.previousIndex : this.selectedIndex;
		this.stop();
		this.preview = { clip, previousIndex, loop };
		const action = this.mixer.clipAction( clip );
		action.setLoop( loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1 );
		action.clampWhenFinished = false;
		// Sigue la velocidad elegida (en cámara lenta se ve mejor qué hueso se mueve).
		action.setEffectiveTimeScale( this.speed );
		action.reset().play();
		action.time = Math.min( Math.max( time, 0 ), clip.duration );
		this.mixer.update( 0 );
		this.action = action;
		this._emit();

	}

	/** ¿Se está reproduciendo (o está en pausa) una vista previa? */
	get previewing() {

		return this.preview !== null;

	}

	/** ¿La vista previa en curso es la de este clip? (cada panel sabe así si sigue sonando la suya) */
	isPreviewing( clip ) {

		return !! clip && this.preview !== null && this.preview.clip === clip;

	}

	/** Agrega animaciones al modelo (por ejemplo, las de otro archivo ya pasadas a este personaje). */
	addClips( clips ) {

		if ( ! this.model ) return;
		this.model.clips.push( ...clips );
		this._emit();

	}

	/** Quita animaciones del modelo (por ejemplo, al deshacer "Agregar animaciones"). */
	removeClips( clips ) {

		if ( ! this.model ) return;
		const current = this.action ? this.action.getClip() : null;
		const previewed = this.preview ? this.preview.clip : null;
		if ( clips.includes( current ) || clips.includes( previewed ) ) this.stop();
		for ( const clip of clips ) {

			const index = this.model.clips.indexOf( clip );
			if ( index >= 0 ) this.model.clips.splice( index, 1 );
			if ( this.mixer ) this.mixer.uncacheClip( clip );

		}

		// Si la animación elegida ya no existe, queda elegida la primera.
		if ( this.action && ! this.preview && ! this.clips.includes( this.action.getClip() ) ) {

			this.action = null;
			if ( this.clips.length > 0 ) this.select( 0 );

		}

		this._emit();

	}

	get selectedIndex() {

		return this.action ? this.clips.indexOf( this.action.getClip() ) : - 1;

	}

	get isPlaying() {

		return !! this.action && this.action.isRunning();

	}

	get time() {

		return this.action ? this.action.time : 0;

	}

	get duration() {

		return this.action ? this.action.getClip().duration : 0;

	}

	select( index ) {

		const clip = this.clips[ index ];
		if ( ! clip || ! this.mixer ) return;
		if ( this.action && this.action.getClip() === clip ) return;
		this.stop();
		this.action = this.mixer.clipAction( clip );
		this._applyLoop();
		this._emit();

	}

	play() {

		if ( ! this.mixer ) return;
		if ( ! this.action ) this.select( 0 );
		if ( ! this.action ) return;
		const action = this.action;
		// Si terminó (modo "una vez"), empieza de nuevo.
		if ( ! this.loop && action.time >= action.getClip().duration ) action.reset();
		action.paused = false;
		action.enabled = true;
		action.setEffectiveTimeScale( this.speed );
		action.play();
		this._emit();

	}

	pause() {

		if ( this.action ) this.action.paused = true;
		this._emit();

	}

	toggle() {

		this.isPlaying ? this.pause() : this.play();

	}

	/** Detiene todo y vuelve a la pose original. */
	stop() {

		if ( this.mixer ) this.mixer.stopAllAction();
		if ( this.model ) this.model.restoreRestPose();
		let index = this.selectedIndex;
		if ( this.preview ) {

			// Se termina la vista previa: vuelve a quedar elegida la animación de antes.
			index = this.preview.previousIndex;
			if ( this.mixer ) this.mixer.uncacheClip( this.preview.clip );
			this.preview = null;
			this._previewDone = false;

		}

		this.action = null;
		if ( index >= 0 && this.mixer ) {

			// Dejamos seleccionada la misma animación, lista para reproducir.
			this.action = this.mixer.clipAction( this.clips[ index ] );
			this._applyLoop();

		}

		this._emit();

	}

	/**
	 * Ejecuta `fn` con el modelo en su pose de reposo (para guardar o exportar) y después vuelve
	 * a la pose en que estaba (por ejemplo, una animación en pausa a mitad de camino).
	 * No se usa mientras una animación está sonando.
	 */
	async atRestPose( fn ) {

		if ( this.model ) this.model.restoreRestPose();
		try {

			return await fn();

		} finally {

			if ( this.mixer && this.action && this.action.isScheduled() ) this.mixer.update( 0 );

		}

	}

	/** Mueve la animación a un momento (en segundos), aunque esté en pausa. */
	seek( seconds ) {

		if ( ! this.action ) return;
		const action = this.action;
		if ( ! action.isScheduled() ) {

			action.play();
			action.paused = true;

		}

		action.time = Math.min( Math.max( seconds, 0 ), action.getClip().duration );
		this.mixer.update( 0 );
		this._emit();
		this._finishPreview();

	}

	setLoop( loop ) {

		this.loop = loop;
		this._applyLoop();

	}

	setSpeed( speed ) {

		this.speed = speed;
		if ( this.action ) this.action.setEffectiveTimeScale( speed );

	}

	update( delta ) {

		if ( this.mixer && this.isPlaying ) {

			this.mixer.update( delta );
			this.dispatchEvent( new Event( 'tick' ) );

		}

		this._finishPreview();

	}

	/** Si la vista previa llegó al final, la termina (el modelo vuelve al reposo). */
	_finishPreview() {

		if ( ! this._previewDone ) return;
		this._previewDone = false;
		if ( this.preview ) this.stop();

	}

	_applyLoop() {

		// La vista previa siempre suena una sola vez.
		if ( ! this.action || this.preview ) return;
		this.action.setLoop( this.loop ? LoopRepeat : LoopOnce, Infinity );
		this.action.clampWhenFinished = true;

	}

	_emit() {

		this.dispatchEvent( new Event( 'change' ) );

	}

}

/**
 * Un nombre de animación que no se repita: "Caminar" → "Caminar (2)" si ya existe.
 * @param {string} name
 * @param {Iterable<string>} taken nombres que ya se usan
 */
export function uniqueClipName( name, taken ) {

	const used = new Set( taken );
	if ( ! used.has( name ) ) return name;
	let n = 2;
	while ( used.has( `${ name } (${ n })` ) ) n ++;
	return `${ name } (${ n })`;

}
