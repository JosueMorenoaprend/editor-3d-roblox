# BITÁCORA

Una entrada por ciclo: qué se hizo, cómo se verificó y qué sigue. La más nueva va arriba.

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
