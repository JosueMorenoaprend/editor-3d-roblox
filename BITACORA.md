# BITÁCORA

Una entrada por ciclo: qué se hizo, cómo se verificó y qué sigue. La más nueva va arriba.

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
