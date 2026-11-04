// FileReader mínimo para Node (lo usan Vitest y las pruebas e2e que generan archivos GLB).
//
// GLTFExporter usa FileReader (del navegador) para armar el .glb. Node no lo tiene,
// así que ponemos uno mínimo que hace lo mismo con Blob.arrayBuffer().
if ( typeof globalThis.FileReader === 'undefined' ) {

	globalThis.FileReader = class FileReader {

		readAsArrayBuffer( blob ) {

			blob.arrayBuffer().then( ( buffer ) => this._done( buffer ) );

		}

		readAsDataURL( blob ) {

			blob.arrayBuffer().then( ( buffer ) => {

				const type = blob.type || 'application/octet-stream';
				this._done( `data:${ type };base64,${ Buffer.from( buffer ).toString( 'base64' ) }` );

			} );

		}

		_done( result ) {

			this.result = result;
			if ( this.onload ) this.onload( { target: this } );
			if ( this.onloadend ) this.onloadend( { target: this } );

		}

	};

}
