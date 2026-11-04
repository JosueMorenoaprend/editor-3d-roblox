// Generadores de animación: caminar, correr, respirar, saltar, caer y agacharse, ajustables con deslizadores.
//
// Cada generador describe la pose en cada momento del ciclo (fase de 0 a 1) con giros en el espacio del
// personaje (mira a +Z, su izquierda es +X y arriba es +Y), relativos al padre de cada hueso en reposo:
// P⁻¹·D·P·L (ver skeletonPose.js). Así funcionan con cualquier esqueleto que tenga su mapa de huesos:
// R15, Mixamo, Tripo… Si el personaje tiene los brazos en pose T, primero se bajan a los costados.
// Las animaciones quedan "en el lugar" (la cadera sube y baja, pero no avanza), como las usa Roblox, y se
// repiten sin saltos (el último cuadro es igual al primero). Al agacharse o caer, las piernas se doblan con
// un cálculo de 2 huesos (ley de los cosenos) para que los pies no se hundan ni floten.
import { AnimationClip, MathUtils, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three';
import { validateBoneMap } from './boneMap.js';
import { UserError } from './errors.js';
import { RestPose, boneDirection, findBones, legLength, localRotation } from './skeletonPose.js';

/** Cuadros por segundo de las animaciones generadas. */
export const GENERATOR_FPS = 30;

const TAU = Math.PI * 2;
const X = new Vector3( 1, 0, 0 );
const Y = new Vector3( 0, 1, 0 );
const Z = new Vector3( 0, 0, 1 );
const DOWN = new Vector3( 0, - 1, 0 );
const FORWARD = new Vector3( 0, 0, 1 );
const UP = new Vector3( 0, 1, 0 );

const speed = { id: 'speed', label: 'Velocidad', min: 0.5, max: 2, step: 0.05, value: 1, format: 'times' };
const percent = ( id, label, value ) => ( { id, label, min: 0, max: 1, step: 0.05, value, format: 'percent' } );

/**
 * Generadores disponibles, con sus deslizadores.
 * format: cómo mostrar el valor ('times' → "×1,5"; 'percent' → "60 %").
 */
export const GENERATORS = [
	{
		id: 'caminar',
		name: 'Caminar',
		description: 'Camina en el lugar, con los brazos alternados.',
		params: [ speed, percent( 'stride', 'Largo del paso', 0.5 ), percent( 'arms', 'Balanceo de brazos', 0.5 ) ],
	},
	{
		id: 'correr',
		name: 'Correr',
		description: 'Corre en el lugar, inclinado hacia adelante y con los codos doblados.',
		params: [ speed, percent( 'stride', 'Largo de la zancada', 0.5 ), percent( 'arms', 'Balanceo de brazos', 0.6 ), percent( 'lean', 'Inclinación hacia adelante', 0.4 ) ],
	},
	{
		id: 'respirar',
		name: 'Respirar',
		description: 'Quieto, respirando (para cuando el personaje no hace nada).',
		params: [ speed, percent( 'depth', 'Intensidad', 0.5 ) ],
	},
	{
		id: 'saltar',
		name: 'Saltar',
		description: 'Se agacha, salta y cae amortiguando. La altura es para verlo aquí: si es el salto del ' +
			'jugador en Roblox, ponla en 0 % (el salto de verdad lo hace el juego).',
		params: [ speed, percent( 'height', 'Altura del salto', 0.4 ), percent( 'crouch', 'Agacharse antes de saltar', 0.5 ) ],
	},
	{
		id: 'caer',
		name: 'Caer',
		description: 'Cayendo, con los brazos arriba y las piernas sueltas (se repite mientras cae).',
		params: [ speed, percent( 'flail', 'Agitar brazos y piernas', 0.5 ) ],
	},
	{
		id: 'agacharse',
		name: 'Agacharse',
		description: 'Baja, se queda agachado un momento y vuelve a subir, sin despegar los pies del piso.',
		params: [ speed, percent( 'depth', 'Cuánto baja', 0.6 ) ],
	},
	{
		id: 'saludar',
		name: 'Saludar',
		description: 'Levanta el brazo derecho, saluda con la mano tres veces y lo baja.',
		params: [ speed, percent( 'raise', 'Altura del brazo', 0.6 ), percent( 'energy', 'Energía del saludo', 0.5 ) ],
	},
	{
		id: 'atacar',
		name: 'Atacar',
		description: 'Desde la guardia, se prepara y da un golpe con la mano derecha (sirve también con una espada ' +
			'o una herramienta en la mano).',
		params: [ speed, percent( 'power', 'Fuerza del golpe', 0.6 ) ],
	},
	{
		id: 'bailar',
		name: 'Bailar',
		description: 'Un baile simple: rebota y sube un brazo y después el otro, al ritmo.',
		params: [ speed, percent( 'energy', 'Energía', 0.6 ) ],
	},
];

/** Valores de los deslizadores por defecto de un generador. */
export function defaultParams( id ) {

	const generator = GENERATORS.find( ( item ) => item.id === id );
	return Object.fromEntries( generator.params.map( ( param ) => [ param.id, param.value ] ) );

}

/**
 * Crea la animación.
 * @param {import('./model.js').LoadedModel} model el personaje (con su mapa de huesos completo)
 * @param {string} id 'caminar' | 'correr' | 'respirar' | 'saltar' | 'caer' | 'agacharse'
 * @param {Record<string, number>} [params] valores de los deslizadores (los que falten, por defecto)
 * @param {{ name?: string }} [options]
 * @returns {AnimationClip}
 */
export function generateAnimation( model, id, params = {}, { name } = {} ) {

	const generator = GENERATORS.find( ( item ) => item.id === id );
	if ( ! generator ) throw new Error( `No existe el generador "${ id }".` );
	if ( ! validateBoneMap( model.boneMap, model.container ).ok ) {

		throw new UserError( 'Primero completa el mapa de huesos de tu personaje (sección «Mapa de huesos»): ' +
			'sin eso no sé qué hueso mover para cada parte del cuerpo.' );

	}

	const values = { ...defaultParams( id ), ...params };
	const rig = new Rig( model );
	const { cycle, pose } = MOTIONS[ id ]( values, rig );
	return rig.bake( name || generator.name, cycle, pose );

}

/** El personaje preparado para generar: huesos, pose de reposo, brazos bajados y tamaño. */
class Rig {

	constructor( model ) {

		this.map = model.boneMap;
		this.rest = new RestPose( model.container, model.restPose );
		this.bones = findBones( model.container );
		this.legs = legLength( this.map, this.rest, this.bones ) || 0.5;
		// Muslo (cadera → rodilla) y pierna (rodilla → tobillo), para doblar las piernas con los pies apoyados.
		this.thigh = this.segment( 'UpperLeg', 'LowerLeg' ) || this.legs / 2;
		this.shin = this.segment( 'LowerLeg', 'Foot' ) || this.legs / 2;
		// Brazos a los costados: si están en pose T (o A), se bajan; si ya cuelgan (R15), se dejan.
		this.armsDown = {};
		for ( const side of [ 'left', 'right' ] ) {

			const key = side + 'UpperArm';
			const direction = this.bone( key ) ? boneDirection( key, this.map, this.rest, this.bones ) : null;
			const relaxed = new Vector3( side === 'left' ? 0.2 : - 0.2, - 1, 0 ).normalize();
			this.armsDown[ side ] = direction && direction.angleTo( DOWN ) > MathUtils.degToRad( 30 )
				? new Quaternion().setFromUnitVectors( direction, relaxed )
				: new Quaternion();

		}

	}

	bone( key ) {

		return this.map[ key ] ? this.bones.get( this.map[ key ] ) : undefined;

	}

	/** Largo promedio (de los dos lados) entre dos articulaciones de las piernas, o null. */
	segment( from, to ) {

		const lengths = [ 'left', 'right' ].map( ( side ) => {

			const a = this.bone( side + from );
			const b = this.bone( side + to );
			return a && b ? this.rest.position( a ).distanceTo( this.rest.position( b ) ) : 0;

		} ).filter( ( length ) => length > 1e-6 );
		return lengths.length ? lengths.reduce( ( sum, value ) => sum + value, 0 ) / lengths.length : null;

	}

	/**
	 * Eje para doblar una parte hacia una dirección (por ejemplo, el codo hacia adelante), según hacia
	 * dónde apunta en reposo. Si ya apunta hacia ahí, usa el eje X.
	 */
	bendAxis( key, toward ) {

		const direction = boneDirection( key, this.map, this.rest, this.bones ) || DOWN;
		const axis = new Vector3().crossVectors( direction, toward );
		return axis.length() > 0.25 ? axis.normalize() : X.clone();

	}

	/**
	 * Arma la animación muestreando la pose en todo el ciclo.
	 * @param {( phase: number ) => { rotations: Record<string, Quaternion>, hips?: Vector3 }} pose
	 */
	bake( name, cycle, pose ) {

		const frames = Math.max( 2, Math.round( cycle * GENERATOR_FPS ) );
		const times = Array.from( { length: frames + 1 }, ( _, i ) => ( i / frames ) * cycle );
		const tracks = new Map(); // hueso → valores
		const hips = this.bone( 'hips' );
		const hipsParent = hips ? this.rest.matrix( hips.parent ).invert() : null;
		const hipsRest = hips ? this.rest.position( hips ) : null;
		const hipsValues = [];

		for ( let i = 0; i < frames; i ++ ) {

			const { rotations, hips: offset } = pose( i / frames );
			for ( const [ key, delta ] of Object.entries( rotations ) ) {

				const bone = this.bone( key );
				if ( ! bone ) continue;
				if ( ! tracks.has( bone ) ) tracks.set( bone, [] );
				tracks.get( bone ).push( ...localRotation( this.rest, bone, delta ).toArray() );

			}

			if ( hips ) hipsValues.push( ...hipsRest.clone().add( offset || new Vector3() ).applyMatrix4( hipsParent ).toArray() );

		}

		// El último cuadro es exactamente el primero: la animación se repite sin saltos.
		const loop = ( values, size ) => values.concat( values.slice( 0, size ) );
		const result = [ ...tracks ].map( ( [ bone, values ] ) => new QuaternionKeyframeTrack( `${ bone.name }.quaternion`, times, loop( values, 4 ) ) );
		if ( hips ) result.push( new VectorKeyframeTrack( `${ hips.name }.position`, times, loop( hipsValues, 3 ) ) );
		return new AnimationClip( name, cycle, result );

	}

}

/** Giro de `degrees` grados alrededor de un eje. */
const turn = ( axis, degrees ) => new Quaternion().setFromAxisAngle( axis, MathUtils.degToRad( degrees ) );

/**
 * Cada generador: a partir de los deslizadores devuelve la duración de un ciclo y la pose en cada fase.
 * Convenciones (en el espacio del personaje): girar el muslo en X con ángulo negativo lo lleva hacia
 * adelante; girar la pierna en X con ángulo positivo dobla la rodilla hacia atrás.
 */
const MOTIONS = {

	caminar( { speed: rate, stride, arms }, rig ) {

		const step = 12 + 26 * stride; // grados que va el muslo hacia adelante y hacia atrás
		const knee = 22 + 33 * stride; // rodilla de la pierna que avanza
		const swing = 32 * arms; // brazos
		const twist = 3 + 4 * stride; // cadera
		const bob = ( 0.01 + 0.015 * stride ) * rig.legs; // rebote de la cadera
		const elbows = { left: rig.bendAxis( 'leftLowerArm', FORWARD ), right: rig.bendAxis( 'rightLowerArm', FORWARD ) };
		return {
			cycle: 1.1 / rate,
			pose( phase ) {

				const s = Math.sin( TAU * phase );
				const c = Math.cos( TAU * phase );
				const legs = leg( step, knee, s, c );
				return {
					rotations: {
						...legs,
						hips: turn( Y, - twist * s ),
						spine: turn( X, 2 ),
						chest: turn( Y, twist * 1.4 * s ),
						head: turn( Y, - twist * 0.4 * s ),
						leftUpperArm: turn( X, swing * s ).multiply( rig.armsDown.left ),
						rightUpperArm: turn( X, - swing * s ).multiply( rig.armsDown.right ),
						leftLowerArm: new Quaternion().setFromAxisAngle( elbows.left, MathUtils.degToRad( 12 + 18 * Math.max( 0, - s ) * arms ) ),
						rightLowerArm: new Quaternion().setFromAxisAngle( elbows.right, MathUtils.degToRad( 12 + 18 * Math.max( 0, s ) * arms ) ),
					},
					// Más alta cuando las piernas se cruzan, más baja al apoyar el pie (dos veces por ciclo).
					hips: new Vector3( 0, bob * Math.cos( 2 * TAU * phase ), 0 ),
				};

			},
		};

	},

	correr( { speed: rate, stride, arms, lean }, rig ) {

		const step = 24 + 26 * stride;
		const knee = 55 + 45 * stride;
		const swing = 20 + 35 * arms;
		const tilt = 4 + 16 * lean;
		const bob = ( 0.03 + 0.03 * stride ) * rig.legs;
		const elbows = { left: rig.bendAxis( 'leftLowerArm', FORWARD ), right: rig.bendAxis( 'rightLowerArm', FORWARD ) };
		return {
			cycle: 0.7 / rate,
			pose( phase ) {

				const s = Math.sin( TAU * phase );
				const c = Math.cos( TAU * phase );
				return {
					rotations: {
						...leg( step, knee, s, c, 18 ),
						hips: turn( Y, - 7 * s ),
						spine: turn( X, tilt * 0.6 ),
						chest: turn( X, tilt * 0.4 ).multiply( turn( Y, 9 * s ) ),
						head: turn( X, - tilt * 0.8 ),
						leftUpperArm: turn( X, swing * s ).multiply( rig.armsDown.left ),
						rightUpperArm: turn( X, - swing * s ).multiply( rig.armsDown.right ),
						// Codos doblados, un poco más cuando el brazo va adelante.
						leftLowerArm: new Quaternion().setFromAxisAngle( elbows.left, MathUtils.degToRad( 75 + 15 * Math.max( 0, - s ) ) ),
						rightLowerArm: new Quaternion().setFromAxisAngle( elbows.right, MathUtils.degToRad( 75 + 15 * Math.max( 0, s ) ) ),
					},
					hips: new Vector3( 0, bob * Math.cos( 2 * TAU * phase ), 0 ),
				};

			},
		};

	},

	respirar( { speed: rate, depth }, rig ) {

		const amount = 0.4 + 1.2 * depth;
		const shoulders = { left: rig.bendAxis( 'leftShoulder', UP ), right: rig.bendAxis( 'rightShoulder', UP ) };
		const elbows = { left: rig.bendAxis( 'leftLowerArm', FORWARD ), right: rig.bendAxis( 'rightLowerArm', FORWARD ) };
		return {
			cycle: 4 / rate,
			pose( phase ) {

				// 0 → 1 → 0: toma aire y lo suelta.
				const breath = ( 1 - Math.cos( TAU * phase ) ) / 2;
				const out = 1.5 * amount * breath;
				return {
					rotations: {
						spine: turn( X, - 1 * amount * breath ),
						chest: turn( X, - 2 * amount * breath ),
						neck: turn( X, 1.2 * amount * breath ),
						head: turn( X, 1.5 * amount * breath ),
						leftShoulder: new Quaternion().setFromAxisAngle( shoulders.left, MathUtils.degToRad( 2.5 * amount * breath ) ),
						rightShoulder: new Quaternion().setFromAxisAngle( shoulders.right, MathUtils.degToRad( 2.5 * amount * breath ) ),
						leftUpperArm: turn( Z, out ).multiply( rig.armsDown.left ),
						rightUpperArm: turn( Z, - out ).multiply( rig.armsDown.right ),
						leftLowerArm: new Quaternion().setFromAxisAngle( elbows.left, MathUtils.degToRad( 8 ) ),
						rightLowerArm: new Quaternion().setFromAxisAngle( elbows.right, MathUtils.degToRad( 8 ) ),
					},
					hips: new Vector3( 0, - 0.004 * rig.legs * breath, 0 ),
				};

			},
		};

	},

	saltar( { speed: rate, height, crouch }, rig ) {

		const squat = ( 0.08 + 0.22 * crouch ) * rig.legs; // cuánto baja la cadera antes de saltar
		const rise = 0.6 * height * rig.legs; // cuánto sube en el aire
		// 0 parado → 0,25 agachado → 0,38 despega → 0,52 arriba → 0,66 toca el piso → 0,78 amortigua → 1 parado.
		const hipsY = [ [ 0, 0 ], [ 0.25, - squat ], [ 0.38, rise * 0.35 ], [ 0.52, rise ], [ 0.66, 0 ], [ 0.78, - squat * 0.8 ], [ 1, 0 ] ];
		const tuckCurve = [ [ 0.38, 0 ], [ 0.52, 15 + 30 * height ], [ 0.64, 0 ] ];
		const leanCurve = [ [ 0, 0 ], [ 0.25, 8 + 14 * crouch ], [ 0.38, 0 ], [ 0.66, 0 ], [ 0.78, 6 + 10 * crouch ], [ 1, 0 ] ];
		// Brazos: atrás al agacharse, arriba al despegar, adelante al caer (grados; negativo = hacia adelante).
		const armCurve = [ [ 0, 0 ], [ 0.25, 35 ], [ 0.38, - 110 ], [ 0.52, - 150 ], [ 0.68, - 60 ], [ 0.8, - 25 ], [ 1, 0 ] ];
		return {
			cycle: 1.3 / rate,
			pose( phase ) {

				const y = curve( hipsY, phase );
				const lean = curve( leanCurve, phase );
				const arm = curve( armCurve, phase );
				const tuck = curve( tuckCurve, phase );
				// Con la cadera abajo, los pies quedan apoyados; arriba, las piernas se recogen un poco.
				const legs = y < 0 ? plantedLegs( rig, - y ) : tuckedLegs( tuck );
				return {
					rotations: {
						...legs,
						spine: turn( X, lean * 0.6 ),
						chest: turn( X, lean * 0.4 ),
						head: turn( X, - lean * 0.6 ),
						leftUpperArm: turn( X, arm ).multiply( rig.armsDown.left ),
						rightUpperArm: turn( X, arm ).multiply( rig.armsDown.right ),
					},
					hips: new Vector3( 0, y, 0 ),
				};

			},
		};

	},

	caer( { speed: rate, flail }, rig ) {

		const wave = 4 + 16 * flail;
		return {
			cycle: 0.9 / rate,
			pose( phase ) {

				const s = Math.sin( TAU * phase );
				const c = Math.cos( TAU * phase );
				const raise = 125 + wave * s; // brazos arriba y afuera
				return {
					rotations: {
						...tuckedLegs( 18, wave * 0.6 * s ),
						spine: turn( X, - 6 ),
						head: turn( X, 12 ),
						leftUpperArm: turn( X, wave * 0.5 * c ).multiply( turn( Z, raise ) ).multiply( rig.armsDown.left ),
						rightUpperArm: turn( X, - wave * 0.5 * c ).multiply( turn( Z, - raise ) ).multiply( rig.armsDown.right ),
					},
					hips: new Vector3(),
				};

			},
		};

	},

	agacharse( { speed: rate, depth }, rig ) {

		const drop = ( 0.15 + 0.3 * depth ) * rig.legs;
		const elbows = { left: rig.bendAxis( 'leftLowerArm', FORWARD ), right: rig.bendAxis( 'rightLowerArm', FORWARD ) };
		return {
			cycle: 2.4 / rate,
			pose( phase ) {

				// Baja, se queda abajo un momento y vuelve a subir.
				const low = curve( [ [ 0, 0 ], [ 0.3, 1 ], [ 0.7, 1 ], [ 1, 0 ] ], phase );
				return {
					rotations: {
						...plantedLegs( rig, drop * low ),
						spine: turn( X, 18 * low ),
						chest: turn( X, 6 * low ),
						head: turn( X, - 16 * low ),
						// Los brazos van un poco adelante para mantener el equilibrio.
						leftUpperArm: turn( X, - 30 * low ).multiply( rig.armsDown.left ),
						rightUpperArm: turn( X, - 30 * low ).multiply( rig.armsDown.right ),
						leftLowerArm: new Quaternion().setFromAxisAngle( elbows.left, MathUtils.degToRad( 25 * low ) ),
						rightLowerArm: new Quaternion().setFromAxisAngle( elbows.right, MathUtils.degToRad( 25 * low ) ),
					},
					hips: new Vector3( 0, - drop * low, 0 ),
				};

			},
		};

	},

	saludar( { speed: rate, raise, energy }, rig ) {

		const lift = 110 + 50 * raise; // grados que sube el brazo derecho por el costado
		const swing = 10 + 22 * energy; // vaivén de la mano
		return {
			cycle: 2.4 / rate,
			pose( phase ) {

				// Sube el brazo, saluda tres veces (con el codo doblado hacia la cabeza) y lo baja.
				const up = curve( [ [ 0, 0 ], [ 0.18, 1 ], [ 0.82, 1 ], [ 1, 0 ] ], phase );
				const hand = up * swing * Math.sin( 3 * TAU * phase );
				return {
					rotations: {
						rightUpperArm: turn( Z, - lift * up ).multiply( rig.armsDown.right ),
						rightLowerArm: turn( Z, - 25 * up + hand ),
						leftUpperArm: rig.armsDown.left,
						chest: turn( Z, 3 * up ),
						head: turn( Z, - 4 * up ),
					},
					hips: new Vector3(),
				};

			},
		};

	},

	atacar( { speed: rate, power }, rig ) {

		const reach = 60 + 30 * power; // cuánto sube el brazo hacia adelante al golpear
		const twist = 12 + 18 * power; // giro del pecho (el hombro derecho va atrás y después adelante)
		const elbows = { left: rig.bendAxis( 'leftLowerArm', FORWARD ), right: rig.bendAxis( 'rightLowerArm', FORWARD ) };
		const bend = ( side, degrees ) => new Quaternion().setFromAxisAngle( elbows[ side ], MathUtils.degToRad( degrees ) );
		return {
			cycle: 1.1 / rate,
			pose( phase ) {

				// Guardia → se prepara (brazo atrás) → golpea → vuelve a la guardia.
				const back = curve( [ [ 0, 0 ], [ 0.3, 1 ], [ 0.42, 0 ], [ 1, 0 ] ], phase );
				const hit = curve( [ [ 0, 0 ], [ 0.3, 0 ], [ 0.42, 1 ], [ 0.6, 1 ], [ 0.9, 0 ], [ 1, 0 ] ], phase );
				return {
					rotations: {
						spine: turn( X, 4 + 6 * hit ),
						chest: turn( Y, - twist * 0.7 * back + twist * hit ),
						head: turn( Y, twist * 0.5 * back - twist * 0.6 * hit ),
						rightUpperArm: turn( X, - 15 + 30 * back - ( reach - 15 ) * hit ).multiply( rig.armsDown.right ),
						rightLowerArm: bend( 'right', 100 + 15 * back - 95 * hit ),
						leftUpperArm: turn( X, - 35 + 10 * hit ).multiply( rig.armsDown.left ),
						leftLowerArm: bend( 'left', 105 ),
					},
					hips: new Vector3(),
				};

			},
		};

	},

	bailar( { speed: rate, energy }, rig ) {

		const arms = 40 + 80 * energy; // cuánto suben los brazos
		const sway = 3 + 7 * energy; // vaivén del cuerpo
		const drop = ( 0.02 + 0.05 * energy ) * rig.legs; // rebote, con los pies en el piso
		const elbows = { left: rig.bendAxis( 'leftLowerArm', FORWARD ), right: rig.bendAxis( 'rightLowerArm', FORWARD ) };
		const bend = ( side, degrees ) => new Quaternion().setFromAxisAngle( elbows[ side ], MathUtils.degToRad( degrees ) );
		return {
			cycle: 1.6 / rate,
			pose( phase ) {

				const s = Math.sin( TAU * phase );
				const low = ( 1 - Math.cos( 2 * TAU * phase ) ) / 2; // baja y sube dos veces por ciclo
				// Un brazo sube mientras el otro baja, por turnos.
				const left = ( 1 + s ) / 2;
				const right = ( 1 - s ) / 2;
				return {
					rotations: {
						...plantedLegs( rig, drop * low ),
						spine: turn( Z, sway * s ),
						chest: turn( Z, sway * 0.6 * s ).multiply( turn( Y, sway * s ) ),
						head: turn( Z, - sway * 1.2 * s ),
						leftUpperArm: turn( Z, 25 + arms * left ).multiply( turn( X, - 20 ) ).multiply( rig.armsDown.left ),
						rightUpperArm: turn( Z, - 25 - arms * right ).multiply( turn( X, - 20 ) ).multiply( rig.armsDown.right ),
						leftLowerArm: bend( 'left', 30 + 40 * ( 1 - left ) ),
						rightLowerArm: bend( 'right', 30 + 40 * ( 1 - right ) ),
					},
					hips: new Vector3( 0, - drop * low, 0 ),
				};

			},
		};

	},

};

/**
 * Valor de una curva definida por puntos [fase, valor] (en orden), con transiciones suaves entre ellos
 * (sin cambios bruscos de velocidad). Antes del primer punto y después del último, queda fija.
 */
function curve( points, phase ) {

	if ( phase <= points[ 0 ][ 0 ] ) return points[ 0 ][ 1 ];
	for ( let i = 1; i < points.length; i ++ ) {

		const [ end, to ] = points[ i ];
		if ( phase <= end ) {

			const [ start, from ] = points[ i - 1 ];
			const u = ( phase - start ) / ( end - start || 1 );
			return from + ( to - from ) * u * u * ( 3 - 2 * u );

		}

	}

	return points[ points.length - 1 ][ 1 ];

}

/**
 * Piernas con los pies apoyados: la cadera baja `drop` metros y el muslo y la rodilla se doblan justo lo
 * necesario (ley de los cosenos) para que el tobillo siga debajo de la cadera; el pie queda plano.
 */
function plantedLegs( rig, drop ) {

	const a = rig.thigh;
	const b = rig.shin;
	const reach = Math.max( a + b - Math.max( drop, 0 ), Math.abs( a - b ) + 1e-3 );
	const clamp = ( value ) => Math.min( 1, Math.max( - 1, value ) );
	const knee = MathUtils.radToDeg( Math.PI - Math.acos( clamp( ( a * a + b * b - reach * reach ) / ( 2 * a * b ) ) ) );
	const hip = MathUtils.radToDeg( Math.acos( clamp( ( a * a + reach * reach - b * b ) / ( 2 * a * reach ) ) ) );
	const rotations = {};
	for ( const side of [ 'left', 'right' ] ) {

		rotations[ side + 'UpperLeg' ] = turn( X, - hip );
		rotations[ side + 'LowerLeg' ] = turn( X, knee );
		rotations[ side + 'Foot' ] = turn( X, hip - knee );

	}

	return rotations;

}

/** Piernas recogidas (en el aire): rodillas dobladas `knee` grados; `kick` alterna un poco las piernas. */
function tuckedLegs( knee, kick = 0 ) {

	const rotations = {};
	for ( const [ side, sign ] of [ [ 'left', 1 ], [ 'right', - 1 ] ] ) {

		const thigh = knee * 0.6 + kick * sign;
		rotations[ side + 'UpperLeg' ] = turn( X, - thigh );
		rotations[ side + 'LowerLeg' ] = turn( X, knee );
		rotations[ side + 'Foot' ] = turn( X, thigh - knee );

	}

	return rotations;

}

/**
 * Piernas alternadas. s = sen(2π·fase), c = cos(2π·fase). La izquierda va adelante cuando s > 0; cada
 * rodilla se dobla mientras su pierna avanza; el pie se mantiene casi plano.
 */
function leg( step, knee, s, c, stance = 5 ) {

	const rotations = {};
	for ( const [ side, sign ] of [ [ 'left', 1 ], [ 'right', - 1 ] ] ) {

		const thigh = step * s * sign; // + adelante
		const bend = knee * Math.max( 0, c * sign ) + stance; // + rodilla doblada
		rotations[ side + 'UpperLeg' ] = turn( X, - thigh );
		rotations[ side + 'LowerLeg' ] = turn( X, bend );
		// El pie compensa (en parte) el giro del muslo y de la rodilla para no clavar la punta.
		rotations[ side + 'Foot' ] = turn( X, 0.6 * ( thigh - bend ) );

	}

	return rotations;

}
