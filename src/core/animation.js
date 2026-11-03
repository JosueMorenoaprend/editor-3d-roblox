// Reproducción de las animaciones que trae el modelo (AnimationMixer de three.js).
//
// Pensado para la v2: `addClips()` permitirá sumar animaciones de Mixamo ya
// adaptadas al esqueleto del personaje (SkeletonUtils.retargetClip).
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

	}

	/** @param {import('./model.js').LoadedModel|null} model */
	setModel( model ) {

		this.stop();
		this.model = model;
		this.clips = model ? model.clips : [];
		this.mixer = model ? new AnimationMixer( model.container ) : null;
		this.action = null;
		if ( this.mixer ) {

			this.mixer.addEventListener( 'finished', () => this._emit() );

		}

		this._emit();

	}

	/** Para la v2: agregar animaciones nuevas (por ejemplo, de Mixamo ya adaptadas). */
	addClips( clips ) {

		if ( ! this.model ) return;
		this.model.clips.push( ...clips );
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
		const index = this.selectedIndex;
		this.action = null;
		if ( index >= 0 && this.mixer ) {

			// Dejamos seleccionada la misma animación, lista para reproducir.
			this.action = this.mixer.clipAction( this.clips[ index ] );
			this._applyLoop();

		}

		this._emit();

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

	}

	_applyLoop() {

		if ( ! this.action ) return;
		this.action.setLoop( this.loop ? LoopRepeat : LoopOnce, Infinity );
		this.action.clampWhenFinished = true;

	}

	_emit() {

		this.dispatchEvent( new Event( 'change' ) );

	}

}
