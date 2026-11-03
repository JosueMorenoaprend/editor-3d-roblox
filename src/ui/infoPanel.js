// Panel "Información": triángulos, medidas, huesos, animaciones y aviso del límite de Roblox.
import { METERS_PER_STUD } from '../core/units.js';
import { computeModelInfo } from '../core/info.js';
import { isSimplified } from '../core/simplify.js';
import { $, escapeHtml, formatBytes, formatInt, formatNumber, plural, readNumber } from './dom.js';
import { toast } from './toast.js';

export function initInfoPanel( app ) {

	const body = $( '#info-body' );
	const limitInput = $( '#triangle-limit' );
	limitInput.value = app.settings.triangleLimit;

	limitInput.addEventListener( 'change', () => {

		const value = readNumber( limitInput );
		if ( value === null || value < 100 ) {

			toast( 'El límite de triángulos tiene que ser un número de 100 o más. Dejé el que tenías.', 'error' );
			limitInput.value = app.settings.triangleLimit;
			return;

		}

		app.setSetting( 'triangleLimit', Math.round( value ) );

	} );

	function render() {

		const model = app.model;
		if ( ! model ) {

			body.innerHTML = '<p class="muted">Abre un modelo para ver su información.</p>';
			return;

		}

		const limit = app.settings.triangleLimit;
		const info = computeModelInfo( model, limit );
		const { x, y, z } = info.size;
		const m = ( v ) => formatNumber( v, v < 1 ? 3 : 2 );
		const s = ( v ) => formatNumber( v / METERS_PER_STUD, 1 );

		const alert = info.meshesOverLimit > 0
			? `<div class="alert alert-warn" role="alert"><strong>⚠ ${ plural( info.meshesOverLimit, 'malla pasa', 'mallas pasan' ) } de ${ formatInt( limit ) } triángulos.</strong>
				Roblox no la${ info.meshesOverLimit > 1 ? 's' : '' } aceptará como MeshPart. Redúcela${ info.meshesOverLimit > 1 ? 's' : '' } en <em>Reducir polígonos</em>.</div>`
			: `<div class="alert alert-ok">✓ Todas las mallas están bajo el límite de ${ formatInt( limit ) } triángulos.</div>`;

		const rows = info.meshes.map( ( item ) => `
			<tr>
				<td class="mesh-name">${ escapeHtml( item.name ) }${ item.skinned ? ' <span class="badge badge-info">huesos</span>' : '' }${ isSimplified( item.mesh ) ? ' <span class="badge badge-info">reducida</span>' : '' }</td>
				<td class="num">${ formatInt( item.triangles ) }</td>
				<td class="num">${ item.overLimit ? '<span class="badge badge-warn">pasa el límite</span>' : '<span class="badge badge-ok">OK</span>' }</td>
			</tr>` ).join( '' );

		const animations = info.animations.length > 0
			? `<ul class="anim-list">${ info.animations.map( ( a ) => `<li>${ escapeHtml( a.name ) } <span class="mono">(${ formatNumber( a.duration, 2 ) } s)</span></li>` ).join( '' ) }</ul>`
			: '';

		// ¿Está centrado y con la base en Y = 0? (tolerancia: 1 % del tamaño)
		const tolerance = Math.max( x, y, z ) * 0.01;
		const center = info.box.getCenter( info.box.min.clone() );
		const grounded = info.box.isEmpty() || ( Math.abs( info.box.min.y ) <= tolerance &&
			Math.abs( center.x ) <= tolerance && Math.abs( center.z ) <= tolerance );
		const groundNote = grounded
			? ''
			: '<p class="muted small">El modelo no está centrado o no está apoyado en el suelo (Y = 0). Usa <em>Centrar y apoyar en el suelo</em> en Ajustes.</p>';

		const textureNote = info.largestTexture > 1024
			? `<p class="muted small">Las texturas miden hasta ${ formatInt( info.largestTexture ) } px. Roblox las usa a 1024 px como máximo; al exportar puedes reducirlas.</p>`
			: '';

		body.innerHTML = `
			${ alert }
			<dl class="stats">
				<dt>Archivo</dt><dd>${ escapeHtml( model.fileName ) }${ model.fileSize ? ` <span class="muted">(${ formatBytes( model.fileSize ) })</span>` : '' }</dd>
				<dt>Triángulos</dt><dd><strong>${ formatInt( info.totalTriangles ) }</strong> en ${ plural( info.meshes.length, 'malla' ) }</dd>
				<dt>Ancho (X)</dt><dd>${ m( x ) } m <span class="muted">≈ ${ s( x ) } studs</span></dd>
				<dt>Alto (Y)</dt><dd>${ m( y ) } m <span class="muted">≈ ${ s( y ) } studs</span></dd>
				<dt>Profundo (Z)</dt><dd>${ m( z ) } m <span class="muted">≈ ${ s( z ) } studs</span></dd>
				<dt>Esqueleto</dt><dd>${ info.boneCount > 0 ? `Sí, ${ plural( info.boneCount, 'hueso' ) }` : 'No' }</dd>
				<dt>Animaciones</dt><dd>${ info.animations.length > 0 ? formatInt( info.animations.length ) : 'Ninguna' }</dd>
				<dt>Texturas</dt><dd>${ info.textureCount > 0 ? `${ formatInt( info.textureCount ) } <span class="muted">(la mayor: ${ formatInt( info.largestTexture ) } px)</span>` : 'Ninguna' }</dd>
			</dl>
			${ animations }
			${ groundNote }
			${ textureNote }
			${ info.textureTransform ? '<p class="muted small">Las texturas usan un desplazamiento o escala (KHR_texture_transform), típico de archivos optimizados con gltfpack. Puede que Roblox no lo lea y la textura se vea corrida: si pasa, usa el GLB original de Tripo.</p>' : '' }
			<table class="mesh-table">
				<thead><tr><th>Malla</th><th class="num">Triángulos</th><th class="num">Roblox</th></tr></thead>
				<tbody>${ rows }</tbody>
			</table>
			<p class="muted small">Medidas con los ajustes aplicados. 1 stud ≈ ${ formatNumber( METERS_PER_STUD, 2 ) } m.</p>`;

	}

	app.on( [ 'model', 'geometry', 'transform', 'settings', 'clips' ], render );
	render();

}
