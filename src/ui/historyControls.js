// Botones "Deshacer" / "Rehacer" y atajos de teclado (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z; Cmd en Mac).
import { $ } from './dom.js';

export function initHistoryControls( app ) {

	const undoButton = $( '#btn-undo' );
	const redoButton = $( '#btn-redo' );
	const history = app.history;

	undoButton.addEventListener( 'click', () => app.undo() );
	redoButton.addEventListener( 'click', () => app.redo() );

	window.addEventListener( 'keydown', ( event ) => {

		if ( ! ( event.ctrlKey || event.metaKey ) || event.altKey ) return;
		// Dentro de una caja de texto, Ctrl+Z deshace lo que escribiste (como siempre).
		if ( event.target.closest?.( 'input[type="text"], input[type="number"], textarea, [contenteditable="true"]' ) ) return;
		const key = event.key.toLowerCase();
		if ( key === 'z' && ! event.shiftKey ) {

			event.preventDefault();
			app.undo();

		} else if ( key === 'y' || ( key === 'z' && event.shiftKey ) ) {

			event.preventDefault();
			app.redo();

		}

	} );

	function render() {

		undoButton.disabled = ! history.canUndo;
		redoButton.disabled = ! history.canRedo;
		undoButton.title = history.canUndo ? `Deshacer: ${ history.undoLabel } (Ctrl+Z)` : 'Deshacer (Ctrl+Z)';
		redoButton.title = history.canRedo ? `Rehacer: ${ history.redoLabel } (Ctrl+Y)` : 'Rehacer (Ctrl+Y)';

	}

	history.addEventListener( 'change', render );
	render();

}
