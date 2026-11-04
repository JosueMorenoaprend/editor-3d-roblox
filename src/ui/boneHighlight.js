// Marca un hueso en la vista 3D: una bolita en su articulación y una línea hacia donde apunta.
// Se ve siempre, aunque el hueso esté dentro de la malla. La usa el panel "Mapa de huesos".
import {
	BufferGeometry, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, SphereGeometry, Vector3,
} from 'three';

/** Mismo color que la fila elegida en el panel (--bone en style.css). */
export const BONE_COLOR = 0xff4fb4;

export class BoneHighlight {

	/** @param {import('../core/viewer.js').Viewer} viewer */
	constructor( viewer ) {

		const common = { color: BONE_COLOR, depthTest: false, depthWrite: false, transparent: true, toneMapped: false };
		this.ball = new Mesh( new SphereGeometry( 1, 20, 14 ), new MeshBasicMaterial( { ...common, opacity: 0.9 } ) );
		this.line = new Line( new BufferGeometry().setFromPoints( [ new Vector3(), new Vector3() ] ), new LineBasicMaterial( common ) );
		for ( const object of [ this.ball, this.line ] ) {

			// Encima de todo y sin recortes de cámara (la línea cambia en cada cuadro).
			object.renderOrder = 1000;
			object.frustumCulled = false;

		}

		this.group = new Group();
		this.group.name = 'Resaltado del hueso';
		this.group.add( this.ball, this.line );
		this.group.visible = false;
		viewer.helpers.add( this.group );

		this.bone = null;
		this.end = null;
		this._end = new Vector3();
		// Sigue al hueso aunque una animación lo mueva.
		viewer.onUpdate( () => this.update() );

	}

	/**
	 * @param {import('three').Object3D|null} bone hueso que se marca (null: ninguno)
	 * @param {import('three').Object3D|null} [end] hacia dónde apunta (otro hueso)
	 * @param {number} [radius] tamaño de la bolita, en metros del mundo
	 */
	show( bone, end = null, radius = 0.02 ) {

		this.bone = bone;
		this.end = end;
		this.ball.scale.setScalar( radius );
		this.group.visible = !! bone;
		this.update();

	}

	update() {

		if ( ! this.bone ) return;
		const from = this.bone.getWorldPosition( this.ball.position );
		const to = this.end ? this.end.getWorldPosition( this._end ) : from;
		const positions = this.line.geometry.attributes.position;
		positions.setXYZ( 0, from.x, from.y, from.z );
		positions.setXYZ( 1, to.x, to.y, to.z );
		positions.needsUpdate = true;
		this.line.visible = !! this.end;

	}

}
