// Información del modelo: triángulos, medidas, huesos, animaciones y texturas.

/** Triángulos que dibuja una geometría. */
export function countTriangles( geometry ) {

	if ( ! geometry ) return 0;
	const index = geometry.index;
	const position = geometry.attributes.position;
	const count = index ? index.count : position ? position.count : 0;
	return Math.floor( count / 3 );

}

const TEXTURE_SLOTS = [
	'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap',
	'alphaMap', 'bumpMap', 'specularMap', 'clearcoatMap', 'sheenColorMap', 'transmissionMap',
];

/**
 * @param {import('./model.js').LoadedModel} model
 * @param {number} triangleLimit límite de triángulos por malla (Roblox: ~20.000)
 */
export function computeModelInfo( model, triangleLimit ) {

	const meshes = [];
	const bones = new Set();
	const textures = new Map();

	model.container.traverse( ( object ) => {

		if ( object.isBone ) bones.add( object );

		if ( ! object.isMesh ) return;

		const instances = object.isInstancedMesh ? object.count : 1;
		const triangles = countTriangles( object.geometry ) * instances;
		meshes.push( {
			mesh: object,
			name: object.name || '(sin nombre)',
			triangles,
			skinned: object.isSkinnedMesh === true,
			overLimit: triangles > triangleLimit,
		} );

		if ( object.isSkinnedMesh ) for ( const bone of object.skeleton.bones ) bones.add( bone );

		const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
		for ( const material of materials ) {

			if ( ! material ) continue;
			for ( const slot of TEXTURE_SLOTS ) {

				const texture = material[ slot ];
				const image = texture && texture.image;
				if ( image && ! textures.has( texture ) ) {

					const transformed = texture.offset.x !== 0 || texture.offset.y !== 0 ||
						texture.repeat.x !== 1 || texture.repeat.y !== 1 || texture.rotation !== 0;
					textures.set( texture, { width: image.width || 0, height: image.height || 0, transformed } );

				}

			}

		}

	} );

	const box = model.getWorldBox();
	const size = box.isEmpty() ? { x: 0, y: 0, z: 0 } : {
		x: box.max.x - box.min.x,
		y: box.max.y - box.min.y,
		z: box.max.z - box.min.z,
	};

	const textureList = [ ...textures.values() ];
	const largestTexture = textureList.reduce( ( max, t ) => Math.max( max, t.width, t.height ), 0 );

	return {
		meshes,
		totalTriangles: meshes.reduce( ( sum, m ) => sum + m.triangles, 0 ),
		meshesOverLimit: meshes.filter( ( m ) => m.overLimit ).length,
		size,
		box,
		boneCount: bones.size,
		animations: model.clips.map( ( clip ) => ( { name: clip.name || '(sin nombre)', duration: clip.duration } ) ),
		textureCount: textureList.length,
		textureTransform: textureList.some( ( t ) => t.transformed ),
		largestTexture,
	};

}
