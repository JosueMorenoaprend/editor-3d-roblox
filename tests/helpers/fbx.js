// Archivos FBX de prueba generados por código (FBX 7.4 en texto), con un esqueleto como el de Mixamo
// (nombres "mixamorig:…", pose T, en centímetros, sin malla) y una animación. Sin archivos de terceros.

/** Unidades de tiempo de FBX por segundo. */
const TICKS = 46186158000;

// [nombre, padre, posición en el mundo (cm)]. Mira a +Z; su izquierda es +X.
const SKELETON = [
	[ 'Hips', null, [ 0, 100, 0 ] ],
	[ 'Spine', 'Hips', [ 0, 112, 0 ] ],
	[ 'Spine1', 'Spine', [ 0, 124, 0 ] ],
	[ 'Spine2', 'Spine1', [ 0, 136, 0 ] ],
	[ 'Neck', 'Spine2', [ 0, 150, 0 ] ],
	[ 'Head', 'Neck', [ 0, 160, 0 ] ],
	[ 'HeadTop_End', 'Head', [ 0, 180, 0 ] ],
	...[ [ 'Left', 1 ], [ 'Right', - 1 ] ].flatMap( ( [ side, x ] ) => [
		[ `${ side }Shoulder`, 'Spine2', [ 5 * x, 145, 0 ] ],
		[ `${ side }Arm`, `${ side }Shoulder`, [ 15 * x, 145, 0 ] ],
		[ `${ side }ForeArm`, `${ side }Arm`, [ 40 * x, 145, 0 ] ],
		[ `${ side }Hand`, `${ side }ForeArm`, [ 65 * x, 145, 0 ] ],
		[ `${ side }HandIndex1`, `${ side }Hand`, [ 72 * x, 145, 1 ] ],
		[ `${ side }UpLeg`, 'Hips', [ 10 * x, 95, 0 ] ],
		[ `${ side }Leg`, `${ side }UpLeg`, [ 10 * x, 50, 0 ] ],
		[ `${ side }Foot`, `${ side }Leg`, [ 10 * x, 8, 0 ] ],
		[ `${ side }ToeBase`, `${ side }Foot`, [ 10 * x, 2, 12 ] ],
	] ),
];

/** Saludo: el brazo izquierdo sube 45° (gira en Z, como en Mixamo) y vuelve. */
export const WAVE_KEYS = {
	LeftArm: [ [ 0, [ 0, 0, 0 ] ], [ 0.5, [ 0, 0, 45 ] ], [ 1, [ 0, 0, 0 ] ] ],
};

/**
 * FBX en texto con el esqueleto tipo Mixamo y una animación.
 * @param {{ name?: string, duration?: number, keys?: Record<string, [number, number[]][]>, forward?: number }} [options]
 *   keys: por hueso (sin "mixamorig:"), cuadros [segundos, [x, y, z] en grados] de su "Lcl Rotation"
 *   forward: centímetros que avanza la cadera en toda la animación (como Mixamo sin "In Place")
 * @returns {string}
 */
export function createMixamoFBX( { name = 'Saludo', duration = 1, keys = WAVE_KEYS, forward = 0 } = {} ) {

	let lastId = 1000;
	const nextId = () => ++ lastId;
	const objects = [];
	const connections = [];
	const models = new Map();

	for ( const [ bone, parent, position ] of SKELETON ) {

		const id = nextId();
		const attribute = nextId();
		const origin = parent ? SKELETON.find( ( item ) => item[ 0 ] === parent )[ 2 ] : [ 0, 0, 0 ];
		const local = position.map( ( value, i ) => value - origin[ i ] );
		models.set( bone, { id, local } );
		objects.push( [
			`\tModel: ${ id }, "Model::mixamorig:${ bone }", "LimbNode" {`,
			'\t\tVersion: 232',
			'\t\tProperties70:  {',
			`\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",${ local.join( ',' ) }`,
			'\t\t}',
			'\t}',
			`\tNodeAttribute: ${ attribute }, "NodeAttribute::", "LimbNode" {`,
			'\t\tTypeFlags: "Skeleton"',
			'\t}',
		].join( '\n' ) );
		connections.push( `\tC: "OO",${ attribute },${ id }`, `\tC: "OO",${ id },${ parent ? models.get( parent ).id : 0 }` );

	}

	const stack = nextId();
	const layer = nextId();
	objects.push( [
		`\tAnimationStack: ${ stack }, "AnimStack::${ name }", "" {`,
		'\t\tProperties70:  {',
		`\t\t\tP: "LocalStop", "KTime", "Time", "",${ Math.round( duration * TICKS ) }`,
		`\t\t\tP: "ReferenceStop", "KTime", "Time", "",${ Math.round( duration * TICKS ) }`,
		'\t\t}',
		'\t}',
		`\tAnimationLayer: ${ layer }, "AnimLayer::BaseLayer", "" {`,
		'\t}',
	].join( '\n' ) );
	connections.push( `\tC: "OO",${ layer },${ stack }` );

	/** Una propiedad animada de un hueso: un nodo de curvas con una curva por eje. */
	const animate = ( bone, property, short, frames ) => {

		const node = nextId();
		objects.push( [
			`\tAnimationCurveNode: ${ node }, "AnimCurveNode::${ short }", "" {`,
			'\t\tProperties70:  {',
			...[ 'X', 'Y', 'Z' ].map( ( axis, i ) => `\t\t\tP: "d|${ axis }", "Number", "", "A",${ frames[ 0 ][ 1 ][ i ] }` ),
			'\t\t}',
			'\t}',
		].join( '\n' ) );
		connections.push( `\tC: "OO",${ node },${ layer }`, `\tC: "OP",${ node },${ models.get( bone ).id }, "${ property }"` );
		[ 'X', 'Y', 'Z' ].forEach( ( axis, i ) => {

			const curve = nextId();
			const times = frames.map( ( [ time ] ) => Math.round( time * TICKS ) );
			const values = frames.map( ( [ , value ] ) => value[ i ] );
			objects.push( [
				`\tAnimationCurve: ${ curve }, "AnimCurve::", "" {`,
				`\t\tDefault: ${ values[ 0 ] }`,
				'\t\tKeyVer: 4008',
				`\t\tKeyTime: *${ times.length } {`,
				`\t\t\ta: ${ times.join( ',' ) }`,
				'\t\t}',
				`\t\tKeyValueFloat: *${ values.length } {`,
				`\t\t\ta: ${ values.join( ',' ) }`,
				'\t\t}',
				'\t}',
			].join( '\n' ) );
			connections.push( `\tC: "OP",${ curve },${ node }, "d|${ axis }"` );

		} );

	};

	for ( const [ bone, frames ] of Object.entries( keys ) ) animate( bone, 'Lcl Rotation', 'R', frames );
	if ( forward ) {

		const start = models.get( 'Hips' ).local;
		animate( 'Hips', 'Lcl Translation', 'T', [ [ 0, start ], [ duration, [ start[ 0 ], start[ 1 ], start[ 2 ] + forward ] ] ] );

	}

	// Cabecera como la de los FBX reales. Ojo: FBXLoader descarta el texto si ciertas posiciones (0, 1, 3,
	// 6, 10, 15…) tienen las letras de la cabecera binaria; con esta cabecera fija, nunca pasa.
	return [
		'; FBX 7.4.0 project file',
		'; ----------------------------------------------------',
		'',
		'FBXHeaderExtension:  {',
		'\tFBXHeaderVersion: 1003',
		'\tFBXVersion: 7400',
		'\tCreator: "Editor 3D para Roblox (pruebas)"',
		'}',
		'GlobalSettings:  {',
		'\tVersion: 1000',
		'\tProperties70:  {',
		'\t\tP: "UpAxis", "int", "Integer", "",1',
		'\t\tP: "UpAxisSign", "int", "Integer", "",1',
		'\t\tP: "FrontAxis", "int", "Integer", "",2',
		'\t\tP: "FrontAxisSign", "int", "Integer", "",1',
		'\t\tP: "CoordAxis", "int", "Integer", "",0',
		'\t\tP: "CoordAxisSign", "int", "Integer", "",1',
		'\t\tP: "UnitScaleFactor", "double", "Number", "",1',
		'\t}',
		'}',
		'Objects:  {',
		...objects,
		'}',
		'Connections:  {',
		...connections,
		'}',
		'',
	].join( '\n' );

}
