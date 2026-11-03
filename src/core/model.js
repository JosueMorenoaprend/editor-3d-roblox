// Representa el modelo abierto en el editor.
//
// Estructura:
//   container (Group)   <- aquí se aplican los ajustes del editor (escala, rotación, posición)
//     └─ nodos originales del archivo (mallas, huesos...)
//
// Así los ajustes nunca chocan con las animaciones, que mueven los nodos de adentro.
import * as THREE from 'three';

export class LoadedModel {

	constructor( gltf, fileName, fileSize = 0 ) {

		this.fileName = fileName;
		this.fileSize = fileSize;
		this.baseName = fileName.replace( /\.(glb|gltf)$/i, '' ) || 'modelo';
		this.clips = [ ...( gltf.animations || [] ) ];

		const source = gltf.scene;
		const container = new THREE.Group();
		container.userData = { ...source.userData };
		for ( const child of [ ...source.children ] ) container.add( child );
		container.name = this._uniqueRootName( container );
		this.container = container;

		const geometries = new Set();
		container.traverse( ( object ) => {

			if ( object.isMesh ) {

				object.castShadow = true;
				object.receiveShadow = true;
				geometries.add( object.geometry );

			}

		} );

		// Los archivos optimizados (gltfpack, Meshopt) guardan los vértices "cuantizados"
		// (enteros de 8/16 bits). Los pasamos a números normales (Float32) para que el
		// GLB exportado no necesite la extensión KHR_mesh_quantization, que Roblox
		// podría no entender.
		for ( const geometry of geometries ) useFloatAttributes( geometry );

		// Guardamos la pose original (la de reposo) para volver a ella al detener
		// las animaciones y antes de exportar.
		this.restPose = new Map();
		container.traverse( ( object ) => {

			if ( object === container ) return;
			this.restPose.set( object, {
				position: object.position.clone(),
				quaternion: object.quaternion.clone(),
				scale: object.scale.clone(),
			} );

		} );

		this.localBox = new THREE.Box3();
		this.updateLocalBox();

	}

	/** Mallas del modelo, en orden. */
	get meshes() {

		const list = [];
		this.container.traverse( ( object ) => {

			if ( object.isMesh ) list.push( object );

		} );
		return list;

	}

	/**
	 * Vuelve a calcular la caja del modelo sin los ajustes del editor y
	 * en la pose de reposo (aunque haya una animación en pausa a mitad de camino).
	 */
	updateLocalBox() {

		const c = this.container;
		const saved = { p: c.position.clone(), q: c.quaternion.clone(), s: c.scale.clone(), parent: c.parent };
		const currentPose = [];
		for ( const object of this.restPose.keys() ) {

			currentPose.push( [ object, object.position.clone(), object.quaternion.clone(), object.scale.clone() ] );

		}

		if ( saved.parent ) saved.parent.remove( c );
		c.position.set( 0, 0, 0 );
		c.quaternion.identity();
		c.scale.set( 1, 1, 1 );
		this.restoreRestPose();
		this.localBox.setFromObject( c, true );

		for ( const [ object, position, quaternion, scale ] of currentPose ) {

			object.position.copy( position );
			object.quaternion.copy( quaternion );
			object.scale.copy( scale );

		}

		c.position.copy( saved.p );
		c.quaternion.copy( saved.q );
		c.scale.copy( saved.s );
		if ( saved.parent ) saved.parent.add( c );
		c.updateMatrixWorld( true );

	}

	/** Caja del modelo con los ajustes aplicados (exacta para giros de 90°). */
	getWorldBox() {

		this.container.updateMatrixWorld( true );
		return this.localBox.clone().applyMatrix4( this.container.matrixWorld );

	}

	restoreRestPose() {

		for ( const [ object, pose ] of this.restPose ) {

			object.position.copy( pose.position );
			object.quaternion.copy( pose.quaternion );
			object.scale.copy( pose.scale );

		}

		this.container.updateMatrixWorld( true );

	}

	/** Libera la memoria de la tarjeta de video. */
	dispose() {

		const textures = new Set();
		this.container.traverse( ( object ) => {

			if ( object.geometry ) object.geometry.dispose();
			if ( object.skeleton ) object.skeleton.dispose();
			const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
			for ( const material of materials ) {

				if ( ! material ) continue;
				for ( const value of Object.values( material ) ) {

					if ( value && value.isTexture ) textures.add( value );

				}

				material.dispose();

			}

		} );
		for ( const texture of textures ) texture.dispose();

	}

	_uniqueRootName( container ) {

		const base = this.baseName.replace( /[^\w\- ]+/g, '_' ) || 'Modelo';
		let name = base;
		let n = 1;
		// Si un nodo interno se llama igual, las animaciones podrían moverlo a él.
		while ( container.getObjectByName( name ) ) name = `${ base }_${ n ++ }`;
		return name;

	}

}

/** Cambia los atributos cuantizados o intercalados por atributos Float32 simples. */
function useFloatAttributes( geometry ) {

	for ( const [ name, attribute ] of Object.entries( geometry.attributes ) ) {

		const converted = toFloatAttribute( attribute, name );
		if ( converted !== attribute ) geometry.setAttribute( name, converted );

	}

	for ( const [ name, list ] of Object.entries( geometry.morphAttributes ) ) {

		geometry.morphAttributes[ name ] = list.map( ( attribute ) => toFloatAttribute( attribute, name ) );

	}

}

function toFloatAttribute( attribute, name ) {

	const interleaved = attribute.isInterleavedBufferAttribute === true;
	// Los índices de huesos (JOINTS_0) tienen que seguir siendo enteros.
	const keepType = name === 'skinIndex';
	if ( ! interleaved && ( keepType || attribute.array instanceof Float32Array ) ) return attribute;

	const { count, itemSize } = attribute;
	const ArrayType = keepType ? attribute.array.constructor : Float32Array;
	const array = new ArrayType( count * itemSize );
	for ( let i = 0; i < count; i ++ ) {

		// getComponent ya convierte los valores normalizados (ej. 0..65535 -> 0..1).
		for ( let c = 0; c < itemSize; c ++ ) array[ i * itemSize + c ] = attribute.getComponent( i, c );

	}

	const result = new THREE.BufferAttribute( array, itemSize, keepType ? attribute.normalized : false );
	result.name = attribute.name;
	return result;

}
