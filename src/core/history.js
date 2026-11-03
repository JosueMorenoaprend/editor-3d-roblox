// Historial para deshacer y rehacer.
//
// Cada acción del editor (girar, escalar, reducir…) se guarda como un "comando":
//   { label: 'Girar 90° (eje Y)', undo() { … }, redo() { … }, dispose?() { … } }
// La acción ya está hecha cuando se guarda con push(). undo() la revierte y redo() la repite.
// Evento 'change': cambió lo que se puede deshacer o rehacer.

export class History extends EventTarget {

	/** @param {{ limit?: number }} [options] limit: cuántos pasos se recuerdan */
	constructor( { limit = 50 } = {} ) {

		super();
		this.limit = limit;
		this._undo = [];
		this._redo = [];

	}

	get canUndo() {

		return this._undo.length > 0;

	}

	get canRedo() {

		return this._redo.length > 0;

	}

	/** Nombre de la acción que se desharía (o null). */
	get undoLabel() {

		return this.canUndo ? this._undo[ this._undo.length - 1 ].label : null;

	}

	/** Nombre de la acción que se reharía (o null). */
	get redoLabel() {

		return this.canRedo ? this._redo[ this._redo.length - 1 ].label : null;

	}

	/**
	 * Guarda una acción que ya se hizo. Lo que se podía rehacer se pierde (como en cualquier editor).
	 * @param {{ label: string, undo: Function, redo: Function, dispose?: Function }} command
	 */
	push( command ) {

		if ( ! command || typeof command.undo !== 'function' || typeof command.redo !== 'function' ) {

			throw new Error( 'Un comando del historial necesita undo() y redo().' );

		}

		for ( const old of this._redo ) old.dispose?.();
		this._redo = [];
		this._undo.push( command );
		while ( this._undo.length > this.limit ) this._undo.shift().dispose?.();
		this._emit();

	}

	/** Deshace la última acción. Devuelve su nombre, o null si no había nada. */
	undo() {

		const command = this._undo.pop();
		if ( ! command ) return null;
		command.undo();
		this._redo.push( command );
		this._emit();
		return command.label;

	}

	/** Rehace la última acción deshecha. Devuelve su nombre, o null si no había nada. */
	redo() {

		const command = this._redo.pop();
		if ( ! command ) return null;
		command.redo();
		this._undo.push( command );
		this._emit();
		return command.label;

	}

	/** Olvida todo (por ejemplo, al abrir otro modelo). */
	clear() {

		for ( const command of [ ...this._undo, ...this._redo ] ) command.dispose?.();
		this._undo = [];
		this._redo = [];
		this._emit();

	}

	_emit() {

		this.dispatchEvent( new Event( 'change' ) );

	}

}
