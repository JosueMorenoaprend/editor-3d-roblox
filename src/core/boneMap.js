// Mapa de huesos humanoide estándar.
//
// Cada personaje nombra sus huesos a su manera ("mixamorig:LeftArm", "LeftUpperArm", "upperarm_l"…).
// El mapa estándar dice qué hueso del personaje cumple cada papel (cadera, brazo izquierdo…).
// Con eso se pueden pasar animaciones de un personaje a otro, generar animaciones y que una IA
// escriba "sube el brazo izquierdo" sin conocer los nombres de MI personaje.
//
// Un mapa es un objeto simple: { hips: 'Hips', leftUpperArm: 'LeftArm', … } (clave estándar → nombre
// del hueso en el modelo). Las claves son en inglés (como en VRM), así las IA ya las conocen.

/**
 * Huesos del mapa estándar, de la cadera hacia afuera.
 * required: sin ese hueso no se pueden pasar animaciones ni generarlas bien.
 * (El R15 de Roblox no tiene columna ni cuello separados: por eso son opcionales.)
 */
export const HUMANOID_BONES = [
	{ key: 'hips', label: 'Cadera', parent: null, required: true },
	{ key: 'spine', label: 'Columna', parent: 'hips', required: false },
	{ key: 'chest', label: 'Pecho', parent: 'spine', required: true },
	{ key: 'neck', label: 'Cuello', parent: 'chest', required: false },
	{ key: 'head', label: 'Cabeza', parent: 'neck', required: true },
	...side( 'left', 'izquierdo', 'izquierda' ),
	...side( 'right', 'derecho', 'derecha' ),
];

function side( prefix, masculine, feminine ) {

	const key = ( name ) => prefix + name;
	return [
		{ key: key( 'Shoulder' ), label: `Hombro ${ masculine }`, parent: 'chest', side: prefix, required: false },
		{ key: key( 'UpperArm' ), label: `Brazo ${ masculine }`, parent: key( 'Shoulder' ), side: prefix, required: true },
		{ key: key( 'LowerArm' ), label: `Antebrazo ${ masculine }`, parent: key( 'UpperArm' ), side: prefix, required: true },
		{ key: key( 'Hand' ), label: `Mano ${ feminine }`, parent: key( 'LowerArm' ), side: prefix, required: true },
		{ key: key( 'UpperLeg' ), label: `Muslo ${ masculine }`, parent: 'hips', side: prefix, required: true },
		{ key: key( 'LowerLeg' ), label: `Pierna ${ feminine }`, parent: key( 'UpperLeg' ), side: prefix, required: true },
		{ key: key( 'Foot' ), label: `Pie ${ masculine }`, parent: key( 'LowerLeg' ), side: prefix, required: true },
		{ key: key( 'Toes' ), label: `Dedos del pie ${ masculine }`, parent: key( 'Foot' ), side: prefix, required: false },
	];

}

const BY_KEY = new Map( HUMANOID_BONES.map( ( bone ) => [ bone.key, bone ] ) );

/** Claves obligatorias del mapa. */
export const REQUIRED_BONES = HUMANOID_BONES.filter( ( bone ) => bone.required ).map( ( bone ) => bone.key );

/** Información de una clave estándar (o undefined). */
export function humanoidBone( key ) {

	return BY_KEY.get( key );

}

/** Nombre en español de una clave ("leftUpperArm" → "Brazo izquierdo"). */
export function boneLabel( key ) {

	return BY_KEY.get( key )?.label ?? key;

}

/** La clave del otro lado del cuerpo ("leftHand" ↔ "rightHand"); las del centro quedan igual. */
export function mirrorKey( key ) {

	if ( key.startsWith( 'left' ) ) return 'right' + key.slice( 4 );
	if ( key.startsWith( 'right' ) ) return 'left' + key.slice( 5 );
	return key;

}

/**
 * Antepasado estándar más cercano que SÍ está en el mapa (los opcionales se saltan).
 * Por ejemplo, sin columna, el padre del pecho es la cadera.
 */
export function mappedParentKey( boneMap, key ) {

	let parent = BY_KEY.get( key )?.parent;
	while ( parent && ! boneMap[ parent ] ) parent = BY_KEY.get( parent )?.parent;
	return parent ?? null;

}

/**
 * Revisa un mapa contra el esqueleto del modelo. Los mensajes están en español y dicen qué hacer.
 * @param {Record<string, string>} boneMap clave estándar → nombre del hueso
 * @param {import('three').Object3D} root el modelo (se buscan los huesos por nombre)
 * @returns {{ ok: boolean, missing: string[], problems: string[] }}
 *   ok: se puede usar para animar (no falta ningún obligatorio y no hay errores)
 */
export function validateBoneMap( boneMap, root ) {

	const problems = [];
	const missing = REQUIRED_BONES.filter( ( key ) => ! boneMap[ key ] );
	for ( const key of missing ) problems.push( `Falta elegir qué hueso es «${ boneLabel( key ) }».` );

	const bones = new Map();
	root.traverse( ( object ) => {

		if ( object.isBone || object.type === 'Bone' ) bones.set( object.name, object );

	} );

	// Cada hueso existe y se usa una sola vez.
	const used = new Map();
	for ( const [ key, name ] of Object.entries( boneMap ) ) {

		if ( ! name ) continue;
		if ( ! BY_KEY.has( key ) ) {

			problems.push( `"${ key }" no es un hueso del mapa estándar.` );
			continue;

		}

		if ( ! bones.has( name ) ) {

			problems.push( `El modelo no tiene un hueso llamado "${ name }" (elegido como «${ boneLabel( key ) }»).` );
			continue;

		}

		if ( used.has( name ) ) {

			problems.push( `El hueso "${ name }" está elegido dos veces: como «${ boneLabel( used.get( name ) ) }» y como «${ boneLabel( key ) }». Cada papel necesita su propio hueso.` );

		}

		used.set( name, key );

	}

	// El orden tiene sentido: el antebrazo cuelga del brazo, el pie de la pierna, etc.
	for ( const [ key, name ] of Object.entries( boneMap ) ) {

		const bone = bones.get( name );
		const parentKey = mappedParentKey( boneMap, key );
		const parent = parentKey ? bones.get( boneMap[ parentKey ] ) : null;
		if ( ! bone || ! parent || bone === parent ) continue;
		if ( ! isDescendant( bone, parent ) ) {

			problems.push( `«${ boneLabel( key ) }» ("${ name }") debería estar dentro de «${ boneLabel( parentKey ) }» ("${ parent.name }"). Revisa si están cambiados.` );

		}

	}

	return { ok: problems.length === 0, missing, problems };

}

function isDescendant( object, ancestor ) {

	for ( let node = object.parent; node; node = node.parent ) if ( node === ancestor ) return true;
	return false;

}
