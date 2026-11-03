# BITÁCORA

Una entrada por ciclo: qué se hizo, cómo se verificó y qué sigue. La más nueva va arriba.

---

## Ciclo 22 — Aviso al exportar con keyframes sin guardar (2026-11-03)

**Auditoría:** punto de partida, el commit del ciclo 21 (`55ac1bc`). Actions: sin ejecuciones.

**Tarea:** F1-23 (Media).

**Qué hice:** Exportar y Guardar proyecto emiten el evento `exporting` justo antes de empezar. El editor de
keyframes lo escucha: si tiene keyframes sin guardar, avisa durante 9 s que «“Mi animación” todavía no está
guardada, así que no va en el archivo» y qué pulsar. Con un evento, el panel de exportar no necesita saber
nada del editor de keyframes (y otras herramientas con trabajo a medias pueden usar el mismo aviso).

**Cómo lo verifiqué**

- Playwright (escritorio y móvil): la prueba “exportar y guardar el proyecto con el editor abierto” ahora
  también exige el aviso después de exportar.
- `npm run check` → código 0: **131/131** Vitest y **56/56** Playwright.

**Qué sigue:** F1-24 (deshacer cada keyframe y autoguardar el borrador) y F1-25.

---

## Ciclo 21 — Un keyframe guarda toda la pose (2026-11-03)

**Auditoría:** punto de partida, el commit del ciclo 20 (`9e22d75`). Actions: sin ejecuciones. El usuario
avisó que quedan pocos créditos: ciclo corto, con pocas llamadas.

**Tarea:** F1-22 (Media), la siguiente del orden sugerido.

**Qué hice**

- El editor anota qué partes se giraron sin keyframe (deslizadores o anillos). “Poner keyframe” se lo pone
  a todas ellas y a la parte elegida, en el orden en que se movieron (`KeyframeAnimation.setPose()`), y
  avisa «Keyframe en 1,00 s para 2 partes: …» cuando son varias.
- Aviso **antes** de perderlos: el estado agrega «Giros sin keyframe: «Brazo izquierdo», «Cabeza». Pulsa
  «Poner keyframe» para guardarlos (si cambias de momento, se pierden)». Si se cambia de momento igual,
  un aviso dice cuáles se descartaron.

**Problema en el camino:** la primera versión listaba primero la parte elegida («Cabeza, Brazo
izquierdo»), al revés que el aviso del estado; la prueba lo detectó y ahora sigue el orden en que se
movieron.

**Cómo lo verifiqué**

- Vitest: 1 prueba nueva (`setPose`: 2 partes en el mismo momento; ponerla otra vez reemplaza sin
  duplicar; el clip es válido).
- Playwright (escritorio y móvil): brazo 60° y cabeza 30° sin keyframe → el estado lo avisa → un solo clic
  → «2 keyframes en total» → un giro sin keyframe se descarta con aviso → el GLB exportado pasa el validador
  y trae el brazo (a 60°) y la cabeza. Captura del aviso en el celular revisada: se lee entero.
- `npm run check` → código 0: **131/131** Vitest y **56/56** Playwright.

**Qué sigue:** F1-23 (avisar al exportar con keyframes sin guardar), F1-24 y F1-25.

---

## Ciclo 20 — El editor de keyframes ya no pierde tu pose (2026-11-03)

**Auditoría:** punto de partida, el commit del ciclo 19 (`c465899`). Actions: sin ejecuciones.

**Tarea:** F1-21 (error, Alta), encontrado en la auditoría del ciclo 19.

**Primero la prueba:** 2 e2e nuevas que fallaban con el código del ciclo 19. Con el brazo a 70° sin
keyframe, después de exportar, “Poner keyframe” guardaba 0° (la pose de reposo); y no había aviso al ver
otra animación.

**Causa:** Exportar, Guardar proyecto y “Agregar animación” llaman a `stop()`, que deja el personaje en
reposo; el autoguardado y “Detectar otra vez” usan `atRestPose()`, que también pasa por el reposo. El editor
no se enteraba: los deslizadores seguían marcando el giro, pero el hueso estaba en reposo.

**Cuidado con el arreglo obvio:** volver a poner la pose del editor apenas termina `stop()` habría hecho que
Exportar guardara el brazo levantado como si fuera la forma normal del personaje (el exportador usa la pose
que tenga el modelo en ese momento). Por eso:

- `AnimationController.setIdlePose( fn )`: la pose que se ve cuando no suena nada. `stop()` y
  `atRestPose()` la vuelven a poner al terminar; `play()`, `playPreview()` y `seek()` parten del reposo
  (si no, las partes que la animación no mueve quedarían como en el editor).
- Exportar y Guardar proyecto trabajan dentro de `atRestPose()`: el archivo sale en reposo y la pose vuelve
  después. Las pruebas leen del GLB y del proyecto que el brazo sale sin girar.
- El editor guarda su **pose de trabajo** (lo que se ve, con o sin keyframe) y la vuelve a poner cuando el
  reproductor se lo pide. Mientras se ve otra animación (el reproductor de arriba o el ▶ Ver de otro
  bloque), el editor espera: anillos escondidos, controles apagados y el aviso «Ahora se ve “Saludar”… Tu
  pose no se pierde» con el botón **Volver a editar** (detiene la otra animación).

**Error viejo encontrado en el camino (F0-17, arreglado):** la prueba unitaria del reproductor mostró que
`atRestPose()` no devolvía una animación en pausa a su cuadro: llamaba a `mixer.update( 0 )`, y el
`PropertyMixer` de three.js solo escribe los valores que cambiaron desde su última cuenta (para él no había
cambiado nada: el reposo lo había puesto el editor). Así, después del autoguardado, una animación en pausa a
mitad de camino se veía en reposo. Ahora el cuadro se vuelve a calcular con `ClipSampler`.

**Cómo lo verifiqué**

- Vitest: `tests/unit/animation.test.js` (nueva): con la pose de un editor, detener, `atRestPose` (en reposo
  mientras dura, la pose vuelve después), reproducir “Saludar” (el brazo izquierdo parte del reposo), pausa
  en 1 s + `atRestPose` (el brazo derecho sigue levantado: fallaba antes del arreglo de F0-17), vista previa
  que termina sola y, sin editor, detener vuelve al reposo.
- Playwright (escritorio y móvil): las 2 pruebas nuevas pasan; capturas revisadas: mientras suena
  “Saludar”, el brazo izquierdo está en reposo, el aviso se lee entero y los controles están apagados.
- `npm run check` → código 0: **130/130** Vitest y **54/54** Playwright.

**Qué sigue:** F1-22 (“Poner keyframe” guarda solo la parte elegida).

---

## Ciclo 19 — Crear animaciones a mano con keyframes (2026-11-03)

**Auditoría:** punto de partida, el commit del ciclo 18 (`af664a1`), recién comprobado. Actions: sin
ejecuciones.

**Tarea:** F1-10 (Alta), la última Alta de la Fase 1 que no depende del usuario.

**Decisiones**

- **Deslizadores en el espacio del personaje**, no en los ejes de cada hueso: *Adelante / atrás* (X),
  *Girar* (Y) y *Hacia los lados* (Z), en grados, con orden de Euler ZXY, convertidos con P⁻¹·D·P·L como el
  resto del editor (`localFromAngles` / `anglesFromLocal` en `skeletonPose.js`). Así “hacia los lados” sube
  el brazo del R15 y también el de un esqueleto tipo Mixamo, cuyos huesos tienen los ejes girados.
- **Anillos de colores** con `TransformControls` de three.js (MIT, ya incluido: no es una dependencia nueva),
  en modo girar y espacio local. Se descargan al abrir el editor (22 KB aparte): dentro del archivo
  principal lo habrían agrandado 33 KB.
- El **borrador** (`KeyframeAnimation`) no entra en el historial ni en el autoguardado hasta pulsar
  “Guardar animación” (eso sí tiene deshacer). “Cancelar” con keyframes pide un segundo toque.
- Cada keyframe guarda el giro (cuaternión) de una parte en un momento; three.js completa el movimiento
  entre ellos. Un keyframe a menos de 1 ms de otro lo reemplaza y los tiempos se redondean al milisegundo
  (en float32 nunca quedan dos iguales).

**Qué hice**

- `core/keyframeAnimation.js`: poner, reemplazar, quitar, cambiar la duración (borra los que quedan
  después) y convertir en `AnimationClip` (una pista por hueso).
- `ui/keyframePanel.js` + bloque “Crear a mano con keyframes” en *Animaciones*: nombre, duración, parte del
  cuerpo (según el mapa de huesos), deslizadores, anillos 3D, línea de tiempo con las marcas de la parte
  elegida, ◆ Poner keyframe, Quitar keyframe, ▶ Reproducir (en bucle), Guardar animación y Cancelar.

**Cómo lo verifiqué**

- Vitest: 4 pruebas nuevas (ida y vuelta ángulos → giro → ángulos en todos los huesos del R15 y de un
  Mixamo con ejes girados; “hacia los lados” y “adelante/atrás” apuntan igual en los dos; poner, reemplazar,
  ordenar y quitar keyframes; a la mitad entre 2 keyframes el brazo va por 45°; el GLB exportado es válido).
- Playwright (escritorio y móvil): 2 keyframes del brazo izquierdo (0° a los 0 s, 80° hacia los lados a
  1 s) → a 0,5 s marca 40° → reproducir y detener → guardar → exportar: validador 0 errores, la animación
  tiene 2 cuadros en `LeftUpperArm` y el segundo está girado 80°. Otra prueba: Cancelar con keyframes pide
  confirmar.
- Capturas revisadas (1280×800 y 390×844): el brazo levantado con los anillos alrededor del hombro, las 2
  marcas en la línea de tiempo y el texto “2 keyframes en total”.
- `npm run check` → código 0: **129/129** Vitest y **50/50** Playwright. Archivo principal: 848 KB (era
  836 KB).

**Auditoría del editor nuevo** (anotado en `MEJORAS.md`): **F1-21** (error, Alta): exportar, guardar el
proyecto, el autoguardado o la vista previa de otro bloque devuelven el personaje al reposo mientras el
editor está abierto, y los deslizadores quedan desfasados. F1-22: “Poner keyframe” guarda solo la parte
elegida. F1-23: avisar al exportar con keyframes sin guardar. F1-24: deshacer cada keyframe y autoguardar el
borrador. F1-25: editar con keyframes una animación que ya existe.

**Qué sigue:** F1-21 (error) y F1-22.

---

## Ciclo 18 — Animaciones FBX de Mixamo (2026-11-03)

**Auditoría:** punto de partida, el commit del ciclo 17 (`51adcc8`), recién comprobado (123/123 Vitest,
44/44 Playwright). Actions: sin ejecuciones.

**Tarea:** F1-05 (Alta).

**Investigación:** el `FBXLoader` de three.js (MIT, ya incluido: no es una dependencia nueva) crea huesos
con los `LimbNode` aunque no haya malla, limpia los nombres (`mixamorig:Hips` → `mixamorigHips`), gira las
escenas Z-arriba y solo usa `window` para cámaras FBX, así que también funciona en Node para las pruebas.
No convierte unidades (Mixamo usa centímetros), pero el retarget compara giros y escala la cadera por el
largo de las piernas, así que las unidades no importan.

**Qué hice**

- `loader.js` → `loadAnimationFiles()`: `.glb/.gltf` como siempre; `.fbx` con `FBXLoader`, que se descarga
  solo la primera vez (archivo aparte de 50 KB). Las texturas externas que nombre el FBX se reemplazan por
  una imagen vacía: no se pide nada a internet. FBX dañado o muy viejo → mensaje claro.
- “Agregar animaciones de otro archivo” acepta `.fbx` y lo dice (“Elige un GLB o FBX…”).
- `tests/helpers/fbx.js`: genera un FBX 7.4 en texto con un esqueleto tipo Mixamo (25 huesos, pose T, en
  centímetros) y una animación (con avance opcional de la cadera).

**Problema encontrado en el camino:** el primer FBX generado daba “Unknown format”. `FBXLoader` mira las
letras de las posiciones 0, 1, 3, 6, 10, 15… para descartar archivos binarios, y en la 120 había una “a”
por casualidad. Con la cabecera de guiones de los FBX reales pasa siempre (la parte comprobada es fija).

**Tamaño:** el JS principal pasó de 817 a 836 KB (+5 KB comprimido): son clases de three.js que usa el
lector FBX y que quedan en el archivo principal porque three.js es un solo módulo. El lector en sí va aparte.

**Cómo lo verifiqué**

- Vitest: 2 pruebas nuevas (FBX de Mixamo → R15: a la mitad, el brazo del R15 sube 45° como en el FBX; el
  avance de 300 cm se escala a 1,64 m; FBX dañado → `UserError` claro).
- Playwright (escritorio y móvil): importar el FBX → “esqueleto Mixamo” → agregar → exportar (validador 0
  errores; la animación mueve `LeftUpperArm`, ningún hueso `mixamorig…`) → un FBX dañado avisa y no cambia
  nada.
- `npm run check` → código 0: **125/125** Vitest y **46/46** Playwright.

**Qué sigue:** F1-10 (línea de tiempo de keyframes), la última Alta de la Fase 1.

---

## Ciclo 17 — Elegir qué animaciones exportar (2026-11-03)

**Auditoría:** punto de partida, el commit del ciclo 16 (`b27328a`), recién comprobado (122/122 Vitest,
42/42 Playwright). Actions: sin ejecuciones.

**Tarea:** F1-16 (Alta).

**Qué hice**

- `exportGLB( model, { clips } )`: exporta solo las animaciones de la lista (por defecto, todas). El
  proyecto guarda siempre todas.
- *Exportar*: con 2 o más animaciones, debajo de “Incluir animaciones” aparece “Cuáles van en el archivo”
  con una casilla por animación. Lo desmarcado se recuerda mientras el modelo esté abierto (también si se
  agregan animaciones nuevas, que vienen marcadas); al abrir otro modelo, todo vuelve a estar marcado. Sin
  “Incluir animaciones”, la lista se oculta.

**Cómo lo verifiqué**

- Vitest: exportar 2 de 3 → GLB válido con Saludar y Saltar, y el modelo sigue con las 3.
- Playwright (escritorio y móvil): sacar “Caminar” → exportar (validador 0 errores) → “2 animaciones” →
  el JSON trae Saludar y Saltar → reabrir el archivo: 2 animaciones.
- Captura revisada (celular): la lista con *Caminar* desmarcada.
- `npm run check` → código 0: **123/123** Vitest y **44/44** Playwright.

**Qué sigue:** F1-05 — importar animaciones FBX de Mixamo (con el retarget del ciclo 13).

---

## Ciclo 16 — Dejar en el lugar las animaciones que avanzan (2026-11-03)

**Auditoría:** el punto de partida es el commit del ciclo 15 (`8b2c375`), recién comprobado
(116/116 Vitest, 40/40 Playwright) con la auditoría profunda hecha. Actions: sin ejecuciones.

**Tarea:** F1-14 (Alta), primera del orden sugerido.

**Qué hice**

- `core/inPlace.js`: `rootMotion()` mide cuánto se aleja la cadera en horizontal (evaluando la animación
  con `ClipSampler`, que pasó a `skeletonPose.js`), `noticeableMotion()` (avisar desde el 3 % de la altura
  del modelo) y `makeInPlace()`, que en las pistas de posición de la cadera y de sus huesos padres fija X/Z
  (en el espacio del personaje) en el primer cuadro, sin tocar la altura. Funciona con esqueletos girados y
  en centímetros (como al convertir de FBX) y con pistas “cubic spline” de glTF (también quita el avance de
  sus tangentes).
- `AnimationController.replaceClip()`: cambia una animación por otra en el mismo lugar de la lista.
- *Animaciones*: si la elegida avanza, aviso (“hace avanzar al personaje 1,6 m…”) y botón **Dejar en el
  lugar** (con deshacer).
- *Agregar animaciones de otro archivo*: etiqueta “avanza 1,6 m” y casilla **Dejar en el lugar las que
  avanzan** marcada; ▶ Ver y Agregar usan la versión en el lugar.

**Error encontrado y arreglado** (lo encontró el validador oficial en la prueba e2e nueva)

- Al pasar una animación de un archivo GLB, la duración llega en float32 (1,6 → 1,6000000238). Los cuadros
  se tomaban “cada 1/30 s y el último en la duración”, así que los dos últimos quedaban a 0,00000002 s y,
  guardados en float32, **iguales**: `ACCESSOR_ANIMATION_INPUT_NON_INCREASING`. Ahora los cuadros se reparten
  parejos de 0 a la duración. Primero una prueba que lo reproducía (índice 49, igual que el validador).

**Cómo lo verifiqué**

- Vitest: 6 pruebas nuevas (avance de cadera y raíz del R15; esqueleto acostado en centímetros; cubic
  spline; los generadores ya están en el lugar; `replaceClip`; tiempos crecientes en float32). Comprobé que
  fallan si no se fija la X.
- Playwright: flujo nuevo (escritorio y móvil): importar una carrera de Mixamo que avanza 3 m (1,6 m en el
  R15) → casilla marcada → agregar → sin aviso; importar otra vez desmarcando → aviso → **Dejar en el
  lugar** → deshacer/rehacer → exportar y leer del GLB que en las dos la cadera no avanza.
- Captura revisada: la etiqueta “avanza 1,6 m” y la casilla.
- `npm run check` → código 0: **122/122** Vitest y **42/42** Playwright.

**Qué sigue:** F1-16 — elegir qué animaciones exportar.

---

## Ciclo 15 — Auditoría profunda + Saltar, Caer y Agacharse (2026-11-03)

**Auditoría profunda (cada 5 ciclos; la del ciclo 10 no se había hecho)**

- **Rendimiento:** pasar una animación de 60 s (1.801 cuadros, 15 huesos) a otro personaje tarda 45 ms y
  generar “Caminar”, menos de 1 ms: no hace falta un Web Worker. Sigue pendiente F5-10 (el visor dibuja 60
  veces por segundo aunque nada se mueva).
- **Tamaño:** el JS principal pesa 817 KB (218 KB comprimido), 40 KB más que en el ciclo 6 por la Fase 1.
  El decodificador Draco (720 KB) y el worker de reducir (166 KB) se cargan solo cuando hacen falta.
- **Seguridad:** todo texto que viene del modelo (nombres de huesos, animaciones, archivos) pasa por
  `escapeHtml` antes de `innerHTML`; los avisos usan `textContent`; nada sale a internet; sin dependencias
  nuevas.
- **Código repetido:** el chequeo “¿la vista previa es la mía?” estaba copiado en 3 paneles →
  `AnimationController.isPreviewing( clip )`; el panel de huesos tenía su propia búsqueda de huesos →
  `findBones()`. El ayudante `poseAt` de las pruebas está en 3 archivos (F5-15, Baja).
- **Interfaz con ojos nuevos** (capturas de página completa con el muñeco): el panel es muy largo (más de
  3.000 px en el celular) porque todas las secciones arrancan abiertas → **F5-14** (Media). En el celular,
  además, la vista 3D queda fuera de la pantalla al usar el panel (F5-13).
- **`MEJORAS.md` reordenado:** nueva sección “Orden sugerido para los próximos ciclos”.

**Tarea:** F1-07 (Alta).

**Qué hice**

- `generators.js`: **Saltar** (se agacha, despega, arriba, toca el piso, amortigua; deslizadores: altura,
  agacharse antes, velocidad; con altura 0 % la cadera no sube, para usarlo como salto del jugador en
  Roblox, y la descripción lo explica), **Caer** (en bucle: brazos arriba y afuera, piernas sueltas) y
  **Agacharse** (baja, se queda y sube).
- `plantedLegs()`: con la cadera más baja, el muslo y la rodilla se doblan justo lo necesario (ley de los
  cosenos con el largo del muslo y de la pierna) para que el tobillo siga debajo de la cadera y el pie,
  plano: **los pies no se hunden ni se mueven**. `curve()`: valores por fases con transiciones suaves.
- Los 6 botones de *Crear una animación* van en una grilla de 3 columnas.

**Cómo lo verifiqué**

- Vitest: 12 pruebas más de los generadores (las comprobaciones generales cubren los 6 con el R15 y con
  Mixamo; agacharse: los pies quedan a menos de 1 cm de su lugar en todo el ciclo, la cadera baja el 45 %
  del largo de las piernas y las rodillas se doblan más de 60°; saltar: pies apoyados al agacharse, arriba
  en el aire con los brazos arriba, y con altura 0 la cadera nunca sube; caer: manos arriba todo el ciclo).
  Comprobé que fallan si el muslo se dobla a la mitad de lo necesario.
- Playwright: flujo nuevo (escritorio y móvil): 6 generadores, Agacharse, Saltar con altura 0 → agregar
  “Saltar (2)” → exportar → leer del GLB que la cadera nunca sube y que sí se agacha antes.
- Captura revisada: la grilla de botones y el muñeco con los brazos arriba en el aire (sin subir).
- `npm run check` → código 0: **116/116** Vitest y **40/40** Playwright.

**Qué sigue:** F1-14 (dejar en el lugar las animaciones importadas) y F1-16 (elegir qué animaciones
exportar), según el orden sugerido.

---

## Ciclo 14 — Crear animaciones: caminar, correr y respirar (2026-11-03)

**Auditoría:** el punto de partida es el commit del ciclo 13 (`4367b89`), que acababa de pasar
`npm run check` (93/93 Vitest, 34/34 Playwright) con sus capturas revisadas. Actions: 0 ejecuciones
después de ese push.

**Tarea:** F1-06 (Alta). La elegí antes que F1-05 (FBX) porque crea animaciones sin necesitar archivos ni
cuentas de afuera, y es lo que el usuario más pidió (“crear y ajustar animaciones: correr, saltar…”).

**Qué hice**

- `core/generators.js`: **Caminar**, **Correr** y **Respirar**. Cada uno describe la pose en cada momento
  del ciclo con giros relativos al padre de cada hueso en reposo (`P⁻¹·D·P·L`, ahora `localRotation()` en
  `skeletonPose.js`), así funcionan con R15, Mixamo o Tripo. Si los brazos están en pose T (o A), primero
  bajan a los costados. Piernas alternadas (la rodilla se dobla mientras la pierna avanza y el pie
  compensa para no clavar la punta), brazos al revés que las piernas, cadera que gira y rebota dos veces
  por ciclo, pecho que contragira y cabeza estable. Correr: rodillas más dobladas, codos a ~80° y el
  cuerpo inclinado. Respirar: pecho, hombros y brazos con movimientos pequeños.
- **En el lugar** (la cadera solo se mueve en Y) y **bucle sin saltos** (`Rig.bake()` repite exactamente
  el primer cuadro al final), como lo usa Roblox.
- `playPreview( clip, { loop, time } )`: vista previa en bucle que, al mover un deslizador, sigue en el
  mismo punto del ciclo (no “salta” al principio).
- `ui/animationCreate.js`: en *Animaciones*, **Crear una animación** → 3 botones → deslizadores (con su
  valor: “×0,75”, “90 %”) → vista previa en bucle → **Agregar «Caminar» a mi personaje** (con deshacer;
  si ya existe, “Caminar (2)”). Si se corrige el mapa de huesos con el generador abierto, se actualiza.
- `ui/clipHistory.js`: agregar animaciones con deshacer, compartido con “Agregar de otro archivo”;
  `uniqueClipName()` en `animation.js`.
- `tests/helpers/gltf.js`: `readGLBAccessor()` para leer en las pruebas los números de un GLB.

**Cómo lo verifiqué**

- Vitest: 11 pruebas nuevas. Los 3 generadores con el R15 y con un esqueleto tipo Mixamo (ejes girados):
  válidos, último cuadro = primero, la cadera no avanza ni se va al costado; caminar con pies y brazos
  alternados y las manos de la pose T bajadas; deslizadores (paso más largo, velocidad ×2 = la mitad del
  ciclo, sin brazos); correr dobla más las rodillas y se inclina; respirar gira menos de 10°; mismas
  posiciones con ejes girados o derechos. Comprobé que fallan si se invierte el balanceo de un brazo o
  si no se bajan los brazos.
- Playwright: 2 flujos nuevos (escritorio y móvil): crear “Caminar” con deslizadores → vista previa en
  bucle → agregar “Caminar (2)” → deshacer/rehacer → exportar y **leer del GLB** que la cadera sube y baja
  pero no avanza, y que el último cuadro es igual al primero; y Correr/Respirar/Cerrar.
- Capturas revisadas: el panel con los deslizadores y el muñeco caminando (escritorio y celular).
- `npm run check` → código 0: **104/104** Vitest y **38/38** Playwright.

**Qué sigue:** F1-07 (saltar, caer y agacharse) con el mismo sistema, y F1-05 (importar FBX de Mixamo).

---

## Ciclo 13 — Agregar animaciones de otro archivo (retarget) (2026-11-03)

**Auditoría:** el código de partida es el commit del ciclo 12 (`e4a6731`), que acababa de pasar
`npm run check` (82/82 Vitest, 30/30 Playwright) con sus capturas revisadas. Actions: sigue en 0 ejecuciones
después de ese push (pasos para el usuario en el PR #2 y en `MEJORAS.md`).

**Tarea:** F1-04 (Alta).

**Investigación:** `SkeletonUtils.retargetClip` de three.js 0.186 copia las matrices globales del hueso
de origen al de destino (con `localOffsets` para corregir a mano). Solo funciona si los dos esqueletos
tienen la misma pose de reposo y los mismos ejes en cada hueso, y eso casi nunca pasa entre Mixamo, Tripo
y el R15. Por eso escribí un retarget propio con el mapa de huesos.

**Qué hice**

- `core/skeletonPose.js`: lo que comparten la prueba del mapa y el retarget: `RestPose` (pose de reposo
  en el espacio del modelo, sin tocar la escena), `boneDirection()` (hacia dónde apunta cada hueso),
  `findBones()` y `nextBoneKey()`.
- `core/retarget.js` → `retargetClip( origen, destino, clip )`. En cada cuadro (30 por segundo) y para
  cada parte: D = giro actual del origen · su reposo⁻¹ (en el espacio del personaje); A = giro que lleva
  la dirección de reposo del destino a la del origen (pose T ↔ brazos abajo); el hueso del destino queda
  con D · A · su reposo, pasado a local con el giro de su padre de ese cuadro. Si no se sabe hacia dónde
  apunta un hueso (la mano del R15 no tiene dedos), usa la A de la parte de la que cuelga. La cadera se
  desplaza escalada al largo de las piernas. Lee la animación evaluando cada pista (sin `AnimationMixer`)
  y deja al origen como estaba.
- `core/animationImport.js` → `importAnimations( gltf, nombre, miPersonaje )`: exige el mapa completo de
  mi personaje, que el archivo traiga animaciones y que su esqueleto tenga cadera; los archivos **sin
  cuerpo** (solo animación) no tienen huesos para three.js, así que se toma como esqueleto todo el árbol de
  los nodos animados. No repite nombres (“Saludar (2)”) y avisa qué partes no tiene el archivo.
- `AnimationController.removeClips()` (para deshacer) y evento nuevo `clips`: *Animaciones*,
  *Información* y la casilla “Incluir animaciones” se actualizan al agregar o quitar.
- `ui/animationImport.js`: en *Animaciones*, **Agregar animaciones de otro archivo…** (solo si el modelo
  tiene esqueleto) → lista de lo encontrado con **▶ Ver** (vista previa en mi personaje) y casillas →
  **Agregar** (con deshacer). Un personaje con esqueleto y sin animaciones ahora dice “todavía no tiene
  animaciones: agrégalas desde otro archivo”.

**Errores encontrados y arreglados en el ciclo** (los dos se vieron en las capturas, no en las pruebas)

- Con un archivo sin cuerpo que mueve solo algunas partes, solo los nodos animados se tomaban como
  huesos: faltaba saber hacia dónde apuntaban los demás, el R15 no se alineaba con la pose T del origen
  (un brazo quedaba colgando) y salía una lista falsa de “partes que el archivo no mueve”.
- Las manos del R15 (sin dedos) quedaban dobladas 90° respecto del antebrazo.
- Para cada uno, primero una prueba que fallaba (1,5708 rad = 90° en la mano) y después el arreglo.

**Cómo lo verifiqué**

- Vitest: 11 pruebas nuevas (retarget y animaciones de otro archivo). En cada cuadro, cada tramo de
  brazos y piernas del destino apunta igual que en el origen (< 0,5°), de Mixamo con ejes girados al R15 y
  al revés (con sus 3 animaciones). Comprobé que esas pruebas **fallan** si se quita la alineación de las
  poses de reposo.
- Playwright: 2 flujos nuevos (escritorio y móvil): personaje sin animaciones + GLB de Mixamo sin cuerpo →
  ▶ Ver → Agregar → reproducir → deshacer/rehacer → exportar (GLB válido; la animación mueve los huesos
  del personaje, ninguno `mixamorig…`); y los errores (mapa incompleto, archivo sin animaciones, modelo
  sin esqueleto).
- Capturas revisadas: lo encontrado (escritorio y celular) y la vista previa (R15 en pose T levantando el
  brazo izquierdo, con las manos derechas).
- `npm run check` → código 0: **93/93** Vitest y **34/34** Playwright.

**Nuevas tareas:** F1-19 (pasar también los dedos, Baja) y F1-20 (probar el retarget con animaciones
reales de Tripo y Mixamo, Media; pasos en T-02 de `PRUEBAS_ROBLOX.md`).

**Qué sigue:** F1-05 (importar animaciones FBX de Mixamo) o F1-06 (generadores de caminar, correr y
respirar), que ya pueden usar el mapa y `skeletonPose.js`.

---

## Ciclo 12 — Editor visual del mapa de huesos (2026-11-03)

**Auditoría:** `npm run check` en verde al empezar (68/68 Vitest, 26/26 Playwright). Capturas revisadas
(muñeco animando, carrito en el celular). Hallazgos nuevos en `MEJORAS.md`: F0-16 (el ⛔ rojo de
“Es muy pequeña” en *Reducir polígonos* asusta sin motivo), F1-17 (elegir un hueso tocándolo en la
vista 3D), F1-18 (saber hacia dónde mira el personaje en vez de suponer +Z) y F5-13 (en el celular, la
vista 3D debería quedar a la vista al bajar por el panel). La medida “tarea más larga mientras reducía”
dio 259 ms en una corrida (antes 0–89 ms): varía con la carga de la máquina; el límite de la prueba es
800 ms.

**GitHub Actions:** sigue en 0 flujos, 0 ejecuciones y 0 checks (repositorio público, no es un fork;
`main` solo tiene `README.md`, lo que no impide que corra `ci.yml` con `push` en esta rama).

**Tarea:** F1-03 (Alta).

**Qué hice**

- `boneMap.js`: `validateBoneMap()` también dice el problema de **cada parte** (`issues`, para marcar su
  fila); `listBones()` (huesos en orden de árbol, con profundidad); `cleanBoneMap()` (limpia un mapa
  guardado: solo claves estándar y huesos que existen); `sameBoneMap()`.
- `LoadedModel.boneMap`: al abrir, el mapa del proyecto o, si no hay, el que se detecta solo.
- Proyecto **formato 2**: guarda `boneMap` en `extras`. Los proyectos de formato 1 se siguen abriendo
  (el mapa se detecta solo).
- `boneTest.js`: **animación de prueba** que mueve cada parte por turnos (la cabeza gira, el brazo sube,
  el antebrazo va hacia adelante, la rodilla se dobla…). Los giros se piensan en el espacio del
  personaje y se pasan a cada hueso con `P⁻¹·D·P·L` (P: giro de reposo del padre; L: giro de reposo
  del hueso), así se ve igual en esqueletos con los ejes de cada hueso girados (Mixamo). Es la base de
  los generadores (F1-06) y del guion para IA (F2-02).
- `AnimationController.playPreview()`: reproduce una vez un clip que no es del modelo (no se exporta).
  Al terminar, el modelo vuelve al reposo y queda elegida la animación de antes. Se detiene justo
  *después* de actualizar el mezclador (no dentro de su aviso `finished`). El panel *Animaciones*
  muestra la vista previa mientras suena.
- Sección **Mapa de huesos** (`ui/boneMapPanel.js`): estado (“✓ Mapa completo” o qué falta), tipo de
  esqueleto, partes encontradas, **Probar el mapa** (con “Ahora se mueve: «Brazo izquierdo»
  (LeftUpperArm)”), **Detectar otra vez**, y la lista “Ver y corregir cada hueso” (se abre sola si
  falta algo) con un selector por parte, ▶ para mover solo ese hueso y una explicación de qué está
  mal en cada fila. Todo cambio va al historial (deshacer/rehacer) y, por eso, al autoguardado.
- `ui/boneHighlight.js`: el hueso elegido se marca en **rosa** en la vista 3D (bolita en la
  articulación y línea hacia el hueso siguiente), visible a través de la malla y siguiendo la
  animación. La fila elegida se marca del mismo color.
- Pruebas: el `FileReader` para Node pasó a `tests/helpers/fileReader.js` (lo usan Vitest y e2e);
  `tests/helpers/oddRig.js` genera un personaje con huesos de nombres raros (`Bone_07`, `Bone_12`);
  `captureScrolledTo()` para capturar una sección del panel.

**Errores encontrados y arreglados en el ciclo**

- Al empezar una prueba, `playPreview()` primero detiene lo anterior, y ese aviso hacía creer al panel
  que la prueba *nueva* ya había terminado (decía “Probado” al instante). Lo descubrió la prueba e2e;
  ahora la prueba se anota después de arrancar.
- Capturar con `locator.screenshot()` una sección más alta que la pantalla, dentro del panel con
  scroll, daba una imagen rota (no era un error de la interfaz): ahora se baja hasta la sección y se
  captura la pantalla.

**Cómo lo verifiqué**

- Vitest: 14 pruebas nuevas (8 de la animación de prueba y la vista previa, 3 del mapa, 3 de
  proyectos). Comprobé que la prueba de “ejes girados” **falla** si se quita `P⁻¹·…·P` de la fórmula.
- Playwright: 2 flujos nuevos (escritorio y móvil): corregir a mano → ▶ → deshacer/rehacer → probar
  todo → guardar proyecto → recargar → el mapa vuelve → GLB válido; y el muñeco R15 (mapa completo,
  “Detectar otra vez”, la prueba en *Animaciones*, exportar en medio de la prueba).
- Capturas revisadas: faltan huesos (escritorio), lista en el celular (dos renglones por parte), el
  brazo izquierdo levantándose con la marca rosa (escritorio y celular) y el R15 completo.
- `npm run check` → código 0: **82/82** Vitest y **30/30** Playwright.

**Qué sigue:** F1-04 — importar animaciones GLB y pasarlas a mi personaje (retarget) usando este mapa.

---

## Traspaso a una sesión nueva (2026-11-03)

- El usuario pidió seguir en otra sesión en la nube “con todo al máximo”: **Opus 5.5, esfuerzo max y
  ultracode**. La sesión anterior que mencionó no aparecía en ninguna lista accesible, así que esta
  sesión **creó una nueva** en el entorno “Default”, sobre la rama `mejoras-continuas`, con el `/goal`
  del usuario como primer mensaje y el contexto del traspaso en sus instrucciones.
- `.claude/settings.json`: `CLAUDE_CODE_EFFORT_LEVEL=max` (en `env`), `effortLevel: "xhigh"` de
  respaldo (el ajuste no acepta `max`) y `ultracode: true`. Fuente: documentación oficial de Claude
  Code (model-config, settings-reference y env-vars).
- Desde aquí, la sesión anterior **deja de trabajar en la rama**.

---

## Ciclo 11 — Detección automática del mapa de huesos (2026-11-03)

**Tarea:** F1-02.

**Investigación:** la documentación oficial de Tripo
(https://developers.tripo3d.com/en/docs/animations-rig.md, leída con `curl` porque WebFetch no resuelve
ese dominio en esta sesión) dice que el autorig usa por defecto la convención `tripo` y también ofrece
`mixamo`, `actorcore`, `unity`, `unreal` y `vrm` (esta última con la versión `v3.0-20260909`). **No
publica los nombres de la convención `tripo`.** Por eso el detector no usa listas fijas.

**Qué hice**

- `src/core/boneDetect.js`:
  - `tokenize()`: separa cada nombre en palabras y quita prefijos de cada programa (`mixamorig`,
    `J_Bip_`, `CC_Base_`, `DEF-`, `Bip01`…). Tiene en cuenta que three.js limpia los nombres al abrir
    (`mixamorig:Hips` → `mixamorigHips`).
  - `classifyBoneName()`: papel y lado de cada hueso; ignora dedos, extremos (`_End`), giros (`twist`)
    y ayudantes.
  - `detectBoneMap()`: elige entre candidatos el más cercano a la raíz; el **pecho** es el hueso del
    que cuelgan los hombros; la **columna**, el primer hueso del tronco por debajo del pecho; si un
    nombre no dice el lado, decide la **posición** (izquierda = +X); sin cadera por nombre, usa el
    padre de las piernas. Al final valida con `validateBoneMap()`.
  - `guessSkeletonKind()`: “Mixamo”, “Roblox R15”, “Unreal”… (para mostrarlo en la interfaz).
- `PRUEBAS_ROBLOX.md`: paso T-01 para probar con un GLB real de Tripo.

**Cómo lo verifiqué**

- 12 pruebas nuevas de Vitest con esqueletos generados en 6 convenciones (con dedos, extremos y
  huesos de giro de distracción), el muñeco R15 y un esqueleto sin lados en los nombres.
- `npm run check` → código 0: **68/68** Vitest y **26/26** Playwright.

**Cambio de sesión:** a pedido del usuario, el trabajo sigue en otra sesión en la nube (que tiene
WebFetch). Esta sesión le envió el contexto y deja de trabajar en la rama para no pisarse.

**Qué sigue:** F1-03 — editor visual del mapa de huesos (mostrar el mapa detectado y corregirlo), y
guardar el mapa en el proyecto (subir `PROJECT_FORMAT`).

---

## Ciclo 10 — Fase 1: mapa de huesos humanoide estándar (2026-11-03)

**Tarea:** F1-01 (empieza la Fase 1, la más importante para el usuario).

**Qué hice**

- `src/core/boneMap.js`: los 21 huesos del mapa estándar (cadera, columna, pecho, cuello, cabeza y,
  a cada lado, hombro, brazo, antebrazo, mano, muslo, pierna, pie y dedos), con:
  - claves en inglés como en VRM (`hips`, `leftUpperArm`…), que las IA ya conocen (servirá para el
    guion de animación de la Fase 2), y nombres en español para la interfaz (“Brazo izquierdo”);
  - 15 obligatorios; columna, cuello, hombros y dedos son opcionales porque el R15 de Roblox no los
    tiene separados;
  - `mirrorKey()` (izquierda ↔ derecha), `mappedParentKey()` (salta opcionales que faltan) y
    `validateBoneMap()`, que dice en español qué falta, qué hueso no existe, cuál se eligió dos veces
    y cuál está fuera de su lugar (“«Antebrazo izquierdo» debería estar dentro de «Brazo izquierdo»”).

**Cómo lo verifiqué**

- 6 pruebas nuevas de Vitest (con el muñeco R15 de ejemplo).
- `npm run check` → código 0.

**Actions:** después de otro push, GitHub sigue sin registrar ejecuciones (ver ⏳ en `MEJORAS.md`).

**Qué sigue:** F1-02 — detectar el mapa solo, para esqueletos de Tripo, Mixamo y R15.

---

## Ciclo 9 — Actions activado y mensajes de error claros en todo el editor (2026-11-03)

**GitHub Actions:** el usuario avisó que lo activó. Para poder comprobar F0-08 sin tocar `main`, el
flujo de Pages ahora también corre en los PR, pero **solo** el paso “¿Está activado GitHub Pages?”
(nunca publica desde un PR). Después del push, GitHub **todavía no registra ninguna ejecución** (ni
de “Comprobar” ni de Pages, y el PR no tiene checks). Pages tampoco está activado (`has_pages: false`).
F0-07 y F0-08 siguen ⏳ hasta ver una ejecución real.

**Tarea:** F0-15 (Media).

**Qué hice**

- `describeError()` en `src/core/errors.js`: todos los errores salen como **qué pasó + cómo
  arreglarlo + (si no era esperado) el detalle técnico al final**, para poder pedir ayuda.
- Consejos concretos por acción: abrir (descargar el archivo de nuevo), reducir (objetivo mayor o
  modo agresivo; el modelo quedó igual), exportar (texturas de 1024 px o reducir antes), guardar
  proyecto (tu trabajo sigue autoguardado).
- Texturas que faltan en un `.gltf`: ahora dice cómo arreglarlo (elegir todos los archivos juntos o
  usar el `.glb`).
- Valores inválidos que antes se corregían en silencio (límite de triángulos < 100, objetivo < 50)
  ahora avisan qué escribir.
- Fallos inesperados en cualquier parte (`error` y `unhandledrejection`): aviso amable, sin repetir el
  mismo varias veces, ignorando el aviso inofensivo “ResizeObserver loop” del navegador.
- Pruebas e2e: opción `allowedConsoleErrors` (una expresión regular) para pruebas que provocan un
  error de consola a propósito.

**Cómo lo verifiqué**

- 3 pruebas de Vitest y 2 flujos e2e nuevos (escritorio y móvil).
- `npm run check` → código 0: **50/50** Vitest y **26/26** Playwright.

**Qué sigue:** volver a revisar Actions después de este push; empezar la **Fase 1** (F1-01: mapa de
huesos humanoide estándar).

---

## Ciclo 8 — Autoguardado y “¿Seguimos donde lo dejaste?” (2026-11-03)

**Tarea:** F0-10.

**Qué hice**

- `src/core/autosave.js`: guarda, lee y borra el último trabajo en **IndexedDB** (la base de datos del
  navegador; nada sale a internet). Si el navegador no lo permite (modo privado, sin espacio), lo
  dice con un mensaje claro y recomienda “Guardar proyecto”.
- `src/ui/autosave.js`: 1,5 s después de cada cambio (o deshacer/rehacer) guarda el proyecto (el
  mismo formato del ciclo 7). Espera si se está reduciendo/exportando o si suena una animación.
  **Abrir un modelo sin cambiarlo no borra lo guardado antes.** En *Proyecto* se ve
  “✓ Guardado automático hoy a las 10:32 (26 KB)”.
- Al abrir el editor, si hay trabajo guardado: tarjeta **“¿Seguimos donde lo dejaste?”** con
  “Recuperar mi trabajo” y “Descartar”.
- Arreglo encontrado al diseñarlo: exportar sacaba el modelo de la escena un instante (con el
  autoguardado habría **parpadeado**). Ahora se exporta sin moverlo, como hace three.js por dentro.
- `animation.atRestPose()`: guarda en la pose de reposo y luego vuelve a la pose en pausa.
- Al recargar, la página empieza arriba (en el celular, la tarjeta quedaba fuera de la vista porque el
  navegador recordaba el scroll).

**Cómo lo verifiqué**

- 2 flujos e2e nuevos (escritorio y móvil): cambiar → esperar el autoguardado → **recargar** →
  recuperar (con los ajustes, que se pueden quitar); y abrir otro modelo sin cambios → recargar → lo
  guardado sigue → “Descartar” → recargar → ya no está.
- Capturas de la tarjeta en escritorio y móvil revisadas.
- `npm run check` → código 0: **47/47** Vitest y **22/22** Playwright.

**Qué sigue:** quedan de la Fase 0 F0-07/F0-08 (⏳ esperan que actives Actions), F0-14 (Baja) y
F0-15 (Media, mensajes de error). Después, **Fase 1: animación** (mapa de huesos, F1-01).

---

## Ciclo 7 — Guardar y abrir proyectos (2026-11-03)

**Tarea:** F0-11 (lo hice antes que el autoguardado F0-10 porque el autoguardado usará este mismo
formato).

**Qué hice**

- **Formato de proyecto:** un GLB normal (cualquier visor lo abre) con datos extra del editor:
  - la escena dice `extras.editor3dRoblox = { kind: 'proyecto', format: 1, baseName, … }`;
  - el nodo raíz es el contenedor del editor, marcado `{ type: 'contenedor' }`: su escala, giro y
    posición son **los ajustes**, que al abrir vuelven a ser ajustes (se pueden quitar);
  - todas las animaciones y las texturas a tamaño completo en PNG (sin pérdida: guardar y abrir
    muchas veces no las va gastando, como pasaría con JPEG).
- `exporter.js`: `exportProject()`; `exportGLB()` y `exportProject()` comparten `writeGLB()`.
  Después de exportar, el modelo vuelve exactamente a su lugar en la escena.
- `model.js`: `LoadedModel` reconoce un proyecto, desenvuelve el contenedor y recupera ajustes y
  nombre. La marca no se copia al contenedor nuevo (así no se cuela en el GLB para Roblox).
- Panel nuevo **Proyecto** con “Guardar proyecto” (descarga `nombre.proyecto.glb`) y “Abrir proyecto”.
  Al abrir se avisa “Proyecto abierto: … (con tus ajustes y animaciones)”.
- `vite.config.js`: la versión del editor (`__APP_VERSION__`) se guarda en el proyecto.

**Cómo lo verifiqué**

- 4 pruebas nuevas de Vitest y 1 flujo e2e (escritorio y móvil): ajustar, guardar, validar el GLB,
  **recargar la página**, abrir el proyecto, comprobar los 10 studs y el nombre, y “Quitar ajustes”.
- `npm run check` → código 0: **47/47** Vitest y **18/18** Playwright.

**Qué sigue:** ciclo 8 — autoguardado en IndexedDB y “Recuperar tu trabajo” (F0-10).

---

## Ciclo 6 — Reducir polígonos sin congelar la página (2026-11-03)

**Tarea:** F0-12.

**Medida antes:** con la API de *tareas largas* del navegador, la reducción de la malla de 120.000
triángulos bloqueaba la página todo el tiempo que duraba (aquí 1–1,5 s; en la PC del usuario, ~10 s).

**Qué hice**

- `src/core/simplifyGeometry.js`: el algoritmo (meshoptimizer), sin estado y con `onStage` para
  avisar el avance.
- `src/core/simplify.worker.js`: Web Worker que recibe la geometría, la reduce y la devuelve.
- `src/core/geometryTransfer.js`: empaqueta geometrías como listas de números para enviarlas al
  worker (copia la original, así nunca se daña) y las vuelve a armar.
- `src/core/simplify.js`: plan (qué mallas se reducen; las que comparten geometría, una sola vez),
  aplicación del resultado y `simplifyMeshesAsync()` con avance y cancelación. **Nada cambia hasta que
  termina todo**: si se cancela, el modelo queda igual. Si el navegador no puede iniciar el worker,
  reduce en la página (plan B).
- `src/core/simplifySync.js`: la versión en el mismo hilo, para las pruebas en Node.
- `app.run()` ahora acepta tareas con **barra de avance** y **botón Cancelar** (servirá también para
  exportar, autoguardar, etc.).
- En el celular, el aviso “Trabajando…” queda fijo abajo (siempre a la vista) y los avisos flotantes
  van justo encima, sin tapar los botones de arriba.
- `vite.config.js`: workers como módulos ES. **El paquete principal bajó de 828 KB a 777 KB**, porque
  meshoptimizer ahora solo lo carga el worker (166 KB, cuando hace falta).

**Cómo lo verifiqué**

- Vitest: 4 pruebas nuevas (empaquetado de ida y vuelta, copias que no dañan el original, atributos
  intercalados, y que la versión asíncrona da el **mismo resultado** que la anterior, avisa el avance
  en orden y al cancelar no cambia nada).
- Playwright: nueva prueba que cancela (el modelo queda igual) y luego reduce midiendo las tareas
  largas: **la más larga dura 0–89 ms** (antes, toda la reducción). Resultado 120.000 → 20.000.
- Revisé la barra de avance en escritorio y móvil (captura forzada, porque aquí la reducción termina
  antes de que alcance a salir la foto).
- `npm run check` → código 0: **43/43** Vitest y **16/16** Playwright.

**Qué sigue:** ciclo 7 — autoguardado en IndexedDB (F0-10) y luego proyectos (F0-11).

---

## Ciclo 5 — Deshacer y rehacer + auditoría profunda (2026-11-03)

**Auditoría profunda (cada 5 ciclos)**

- **Seguridad y privacidad:** sin claves ni secretos; el decodificador Draco va incluido (no se pide
  nada a internet; en `dist/` no hay direcciones externas que se usen); todo texto que viene del modelo
  (nombres de mallas, animaciones, archivo) pasa por `escapeHtml` antes de `innerHTML`.
- **Tamaño:** el JS principal pesa 828 KB (222 KB comprimido), casi todo three.js. La carga diferida
  (F5-07) puede bajar el arranque; prioridad baja por ahora.
- **Rendimiento:** el visor dibuja 60 cuadros por segundo aunque nada cambie → gasta batería en
  laptop y tablet. Nueva tarea **F5-10** (Media).
- **Código repetido:** recorrer materiales y texturas está hecho 4 veces. Nueva tarea **F5-11** (Baja).
- **Interfaz con ojos nuevos:** con un modelo abierto ya no se puede abrir un ejemplo (anotado en
  F5-09); la etiqueta “v1” quedó vieja (**F5-12**, Baja). El orden de `MEJORAS.md` sigue siendo el
  correcto: terminar la Fase 0 y pasar a la Fase 1 (animación).

**Tarea:** F0-09 (deshacer y rehacer).

**Qué hice**

- `src/core/history.js`: historial con `push / undo / redo / clear`, límite de 50 pasos, nombres de
  cada acción y evento `change`. Al abrir otro modelo se vacía.
- `transform.js`: `getTransformState / setTransformState` (escala, giro y posición).
  `simplify.js`: `captureGeometryState / applyGeometryState` (qué geometría usa cada malla y su
  original). Las geometrías no se copian: deshacer es instantáneo, también con 120.000 triángulos.
- Paneles: cada ajuste (escala, ×½, ×2, altura, giros, apoyar, quitar ajustes), “Reducir” y
  “Volver al original” quedan en el historial con un nombre claro (“Girar 90° (eje Y)”).
- Barra superior: botones ↶ **Deshacer** y ↷ **Rehacer** (con el nombre de la acción al pasar el
  mouse) y atajos **Ctrl+Z**, **Ctrl+Y** y **Ctrl+Shift+Z** (Cmd en Mac). Dentro de una caja de texto,
  Ctrl+Z deshace el texto, como en cualquier programa. Aviso “Deshecho: …” al usarlo.
- En el celular la barra muestra solo los íconos y “Abrir” / “Exportar” para que todo quepa.

**Cómo lo verifiqué**

- 7 pruebas nuevas de Vitest (historial y estados) y 2 flujos e2e (teclado y botones; ajustes,
  reducir, “Volver al original”) en escritorio y móvil.
- `npm run check` → código 0: **39/39** Vitest y **14/14** Playwright.
- Capturas de la barra superior en escritorio y móvil revisadas.

**Qué sigue:** ciclo 6 — reducir polígonos en un Web Worker con barra de progreso (F0-12).

---

## Ciclo 4 — Fondo del panel cortado en móvil (2026-11-03)

**Tarea:** F0-13 (error: primero los errores).

**Qué hice**

- Primero una prueba e2e que lo detecta: en móvil, el contenido del panel no puede salirse de su caja.
  Con el código anterior fallaba: **1002 px** de contenido fuera de la caja (por eso el fondo se
  cortaba a la altura de la pantalla).
- Causa: en pantallas chicas `body` medía exactamente el alto de la pantalla y el contenedor del panel
  no podía crecer. Arreglo en `src/style.css`: en móvil, `html, body { height: auto }` y el contenedor
  crece con su contenido (`flex: 1 0 auto`).

**Cómo lo verifiqué**

- La prueba nueva pasa; captura de página completa en móvil sin la franja.
- `npm run check` en verde.

**Qué sigue:** ciclo 5 — deshacer y rehacer (F0-09).

---

## Ciclo 3 — GitHub Actions y publicación que no falla (2026-11-03)

**Tarea:** F0-07 (Actions con `npm run check`) y F0-08 (que Pages no rompa nada).

**Qué hice**

- `.github/workflows/ci.yml` (“Comprobar”): en cada push a cualquier rama instala todo, instala
  Chromium y ejecuta `npm run check`. Guarda las capturas como *artifact* (14 días). Se puede lanzar a
  mano. Solo usa `push` (no `pull_request`) para no correr dos veces por cada commit de un PR.
- `.github/workflows/deploy.yml`: ahora primero pregunta a la API de GitHub si Pages está activado con
  “GitHub Actions”. Si no, **termina en verde con un aviso** y no publica. Ya no corre en los PR.
- README: cómo activar Actions, qué hace “Comprobar”, cómo ejecutar las pruebas y los ejemplos.

**Por qué no corrió nada en el PR #1:** después de abrir el PR #2 y subir 3 commits, GitHub sigue con
**0 flujos registrados y 0 ejecuciones**. Si Actions estuviera activo, el `pull_request` del flujo
antiguo y el `push` del nuevo habrían creado ejecuciones. Conclusión: **Actions está desactivado** en
la configuración del repositorio (no lo puedo cambiar desde aquí). Pasos para activarlo en el README.

**Cómo lo verifiqué**

- YAML de los dos flujos leído con PyYAML; el script de bash revisado con `bash -n`; las versiones de
  las acciones existen (`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `configure-pages@v6`,
  `upload-pages-artifact@v5`, `deploy-pages@v5`).
- `npm run check` en verde.
- **Falta** ver una ejecución real: F0-07 y F0-08 quedan pendientes (⏳) hasta que Actions esté activo.

**Qué sigue:** ciclo 4 — arreglar el fondo cortado en móvil (F0-13) y empezar deshacer/rehacer (F0-09).

---

## Ciclo 2 — Ejemplos con un clic y pruebas de punta a punta (2026-11-03)

**Tarea:** F0-04 (Playwright), con F0-05 (botones de ejemplo, necesarios para las pruebas), la parte
de Playwright de F0-03 y F0-06 (`npm run check` completo).

**Qué hice**

- Pantalla inicial: **“¿No tienes un modelo a mano? Prueba con un ejemplo”** con 3 botones (muñeco
  R15, malla pesada, carrito). `app.openSample( id )` en `src/app.js`, botones en `src/ui/samples.js`.
- `src/core/errors.js`: `UserError` para errores que el usuario puede arreglar. Abrir un archivo que no
  es GLB o está dañado ahora dice **qué pasó y qué hacer** (“descárgalo otra vez desde Tripo…”) y no
  ensucia la consola como si fuera un fallo del programa.
- Playwright (`playwright.config.js`, `tests/e2e/`): compila y sirve el editor, y recorre 5 flujos en
  escritorio (1280×800) y móvil (390×844): pantalla inicial; muñeco (animar, exportar, validar y
  reabrir); malla pesada (aviso, reducir, ver la malla, exportar con textura); carrito (girar, altura
  en studs, exportar); archivos equivocados. Falla si hay **cualquier error en la consola**.
- Cada GLB descargado pasa `gltf-validator` (0 errores) y se revisa su contenido (piel, nombres de
  animaciones, textura PNG).
- `npm run check` = compilación + Vitest + Playwright.

**Problemas encontrados y arreglados en el ciclo**

- En móvil, la tarjeta de la pantalla inicial tapaba los botones de la vista (la agregué yo en este
  ciclo): ahora va debajo de ellos, más compacta, y sin el párrafo largo sobre .gltf.
- Volver a abrir el GLB exportado fallaba solo en la prueba: Chromium **no recibe archivos cuya ruta
  lleva “ñ”** (la carpeta de resultados se llamaba “…muñeco…”). La prueba ahora entrega el contenido
  del archivo en vez de la ruta. No afecta a los usuarios (ellos eligen el archivo a mano).

**Nuevas tareas:** F0-14 (la comprobación cuenta 13 mallas en el carrito de 8 piezas, porque glTF
guarda una parte por material) y F0-15 (revisar el resto de mensajes de error).

**Cómo lo verifiqué**

- `npm run check` → código 0: compilación OK, **32/32** pruebas de Vitest y **10/10** de Playwright
  (unos 2 minutos).
- Miré las capturas de escritorio y móvil: pantalla inicial, muñeco saludando, malla pesada reducida
  con la malla visible, carrito ajustado a 10 studs y la página completa en móvil.

**Qué sigue:** ciclo 3 — GitHub Actions con `npm run check` (F0-07) y que Pages no rompa nada (F0-08).

---

## Ciclo 1 — Pruebas del núcleo y modelos de prueba (2026-11-03)

**Tarea:** F0-01 (Vitest) y F0-02 (modelos de prueba por código), más el primer paso de F0-03.

**Qué hice**

- `src/samples/`: 3 modelos generados por código, sin archivos de terceros:
  - **Muñeco R15**: 16 huesos con los nombres de Roblox (HumanoidRootPart + 15 partes), una malla
    con esqueleto, ojos para saber hacia dónde mira, 5,2 studs de alto y 3 animaciones
    (Saludar, Caminar en el lugar, Saltar).
  - **Malla pesada**: nudo de 120.000 triángulos con UV y una textura de cuadros de colores.
  - **Carrito de piezas**: 8 mallas, grupos anidados, 5 materiales, una malla con varios materiales
    y 4 ruedas que comparten la misma geometría.
- `src/core/keyframes.js`: crear pistas de animación con giros en **grados** (se reutilizará en los
  generadores de animación y en el guion para IA).
- `src/core/units.js`: `METERS_PER_STUD` sale de `app.js` para poder usarlo sin la interfaz.
- Vitest: 32 pruebas en `tests/unit/` (ejemplos, info, modelo, ajustes, reducir y exportar).
- `tests/helpers/gltf.js`: valida cada GLB con `gltf-validator`; las pruebas exigen **0 errores** y
  0 avisos (salvo uno aceptado y explicado, ver abajo).
- Scripts: `npm test` y `npm run check` (= compilación + Vitest; Playwright llega en el ciclo 2).

**Hallazgo:** el validador avisa `NODE_SKINNED_MESH_NON_ROOT` en el muñeco exportado: la malla con
esqueleto cuelga del contenedor donde el editor guarda la escala y el giro. glTF y three.js la dibujan
bien (la mueven los huesos) y Blender/Tripo exportan igual, así que no es un error. Pero los huesos de
Roblox no tienen escala, y eso puede dar problemas al importar: nueva tarea **F4-07** (aplicar escala y
giro al exportar). Mientras tanto, ese aviso está en una lista de permitidos con su motivo.

**Cómo lo verifiqué**

- `npm run check`: compilación OK y **32/32 pruebas** en verde.
- Los 3 ejemplos exportados pasan el validador con **0 errores** (y al reabrirlos tienen los mismos
  triángulos, huesos y animaciones).
- Repetí la auditoría en Chromium con la app compilada: consola sin errores, GLB exportado válido.

**Qué sigue:** ciclo 2 — botones “Probar con un ejemplo” y pruebas de punta a punta con Playwright
(capturas de escritorio y móvil, consola sin errores, GLB con texturas validado).

---

## Ciclo 0 — Arranque (2026-11-03)

**Qué hice**

- Creé la rama `mejoras-continuas` desde `claude/admiring-dijkstra-cfuoyl` (la v1 del PR #1), porque
  `main` todavía no tiene `package.json`.
- Leí todo el código y el README. `npm ci` y `npm run build` terminan sin errores.
- Creé los documentos de memoria: `AGENTS.md`, `CLAUDE.md`, `MEJORAS.md` (62 tareas en 6 fases),
  `BITACORA.md`, `CHANGELOG.md` y `PRUEBAS_ROBLOX.md`.

**Auditoría de la v1** (Chromium sin ventana, WebGL por SwiftShader)

- Pantalla inicial a 1280×800 y 390×844: se ve bien, sin errores en la consola.
- Abrí un nudo de **120.000 triángulos** generado por código: sale el aviso del límite.
- **Reducir** lo bajó a 20.000, pero la página quedó **congelada unos 2 s** (en la PC del usuario,
  con texturas, unos 10 s). Ya está en la lista (F0-12).
- **Exporté** el GLB: el validador de Khronos da **0 errores y 0 avisos**.
- Móvil: no hay scroll horizontal, pero al bajar por el panel **el fondo cambia de color** a la
  altura de la pantalla (nueva tarea F0-13).

**Por qué no corrieron las GitHub Actions en el PR #1**

- GitHub informa **0 flujos registrados y 0 ejecuciones** en el repositorio.
- Descarté las causas que se pueden ver desde aquí: las versiones de las acciones existen
  (`checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`,
  `deploy-pages@v5`), el repositorio es público, no es un fork y el PR no tiene conflictos.
- Causa más probable: **GitHub Actions está desactivado en la configuración del repositorio**
  (*Settings → Actions → General*). Esa configuración no se puede ver con los permisos de esta sesión.
  Se confirmará al subir la rama con el flujo nuevo de CI (F0-07).

**Dependencias nuevas** (todas con versión exacta, solo para desarrollo y pruebas)

- `vitest` 5.0.5 (MIT): pruebas del núcleo. Elegí 5.0.5 y no 5.1.0 porque 5.1.0 salió ayer.
- `@playwright/test` 1.63.0 (Apache-2.0): pruebas en el navegador. Es la misma versión del Chromium
  que viene instalado en la nube, así no hay que descargar navegadores aquí.
- `gltf-validator` 2.0.0-dev.3.10 (Apache-2.0): el validador oficial de Khronos para revisar cada GLB
  exportado.
- Nota: `npm install` de npm 10 se cae al agregar Vitest (error `edgesOut`). Lo instalé con npm 11.6.2;
  después `npm ci` y `npm install` con npm 10 funcionan bien (anotado en `AGENTS.md`).

**Qué sigue:** ciclo 1 — pruebas del núcleo con Vitest, modelos de prueba generados por código y
validación de cada GLB exportado.
