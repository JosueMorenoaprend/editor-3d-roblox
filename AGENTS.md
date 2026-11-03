# AGENTS.md — Editor 3D para Roblox

Guía para cualquier IA (Claude, Codex, Antigravity…) que trabaje en este repositorio.
**Antes de hacer nada, lee este archivo, `MEJORAS.md` y las últimas entradas de `BITACORA.md`.**
Son la memoria del proyecto entre turnos y entre sesiones.

---

## 1. Quién es el usuario y qué quiere

- Es **principiante en programación**. Háblale siempre en **español sencillo**.
- Crea juegos en **Roblox**. Genera modelos 3D con **Tripo AI** (GLB), los arregla y anima en este
  editor, y los importa en **Roblox Studio**.
- Usa este editor en vez de Blender porque Blender es difícil y la IA todavía anima y edita mal ahí.
- Quiere: cortar y editar modelos, crear y ajustar animaciones (correr, saltar, atacar…), trabajar
  personajes con huesos y exportar GLB listo para Roblox.
- Quiere que la IA (Claude, ChatGPT, Antigravity) le ayude dentro del editor, y que Claude pueda
  intervenir en tiempo real: ver la pantalla, mover huesos, crear y corregir animaciones.

## 2. Visión

> **"El Blender fácil para creadores de Roblox, con IA integrada."**

- Modo simple por defecto y modo avanzado opcional.
- Todo funciona en el navegador; **ningún modelo se sube a un servidor**.
- Siempre se puede **deshacer** y **nunca se pierde trabajo** (autoguardado).
- Cada error dice **qué pasó y cómo arreglarlo**, en español claro.
- Funciona en laptop y tablet, con mouse, teclado o pantalla táctil.
- Cada función se entiende **sin leer un manual**.

## 3. Reglas que no se rompen

1. **Cada commit pasa `npm run check`**: la rama nunca queda rota.
2. **No hagas merge a `main` ni borres ramas.** El usuario decide cuándo fusionar.
3. **Ninguna clave ni secreto en el repo.** Nada se envía a un servidor sin que el usuario lo active.
4. **Dependencias:** solo licencias MIT, BSD, Apache o CC0, con **versión exacta** (sin `^`).
   Justifica cada dependencia nueva en `BITACORA.md`.
5. **No subas modelos ni animaciones de terceros** (Mixamo, Tripo, Khronos…). Los modelos de prueba
   se generan por código (`src/samples/`).
6. **No publiques nada** (npm, tiendas, dominios), no crees cuentas y no gastes dinero.
7. **Interfaz y textos en español.** Código: identificadores en inglés, comentarios en español.
8. **No puedes abrir Roblox Studio ni Blender.** Nunca digas que algo funciona en Roblox sin probarlo:
   anótalo en `PRUEBAS_ROBLOX.md` con pasos exactos.
9. Cada función nueva se usa **sin manual**. Si complica la interfaz, va en el **modo avanzado**.
10. **Prohibido** marcar tareas como hechas sin verificarlas, borrarlas o bajarles la prioridad para
    “cumplir” la meta.

## 4. Meta (`/goal`) y cuándo está terminado

El editor queda terminado cuando, **en el mismo turno**:

1. `MEJORAS.md` no tiene ninguna tarea pendiente de prioridad **Alta** o **Media**;
2. `npm run check` termina con código 0;
3. un GLB exportado por las pruebas pasa `gltf-validator` con **0 errores**;
4. `git status` está limpio y el push está hecho.

**En cada turno:** completa al menos un ciclo del protocolo (sección 5) y **termina el turno mostrando
la salida de `npm run check` y la lista de tareas Alta y Media que siguen pendientes**.
Cada auditoría agrega a `MEJORAS.md` los errores y mejoras nuevas que encuentre.

## 5. Protocolo de cada ciclo

1. **Sincroniza** (`git pull`) y lee `MEJORAS.md` y `BITACORA.md`.
2. **Audita:** `npm run check`; abre la app en Chromium sin ventana; recorre los flujos como un
   principiante; toma capturas (1280×800 y 390×844) y **míralas**; revisa la consola; exporta un GLB y
   valídalo. Anota en `MEJORAS.md` cada error o mejora nueva.
3. **Elige UNA tarea:** primero los errores; después, la de mayor impacto para el usuario en la fase
   más baja sin terminar.
4. **Impleméntala** en pasos pequeños, con su prueba.
5. **Verifica:** `npm run check` en verde, capturas revisadas, GLB válido y consola sin errores.
6. **Commit** (mensaje en español: qué y por qué) y **push**. Actualiza `MEJORAS.md`, `BITACORA.md` y
   `CHANGELOG.md`.
7. Escribe al usuario un **resumen de 2 a 4 líneas**: qué mejoró, cómo se comprobó y qué sigue.
8. **Empieza el siguiente ciclo** sin pedir permiso.

- **Cada 5 ciclos:** auditoría profunda (rendimiento, tamaño del paquete, seguridad, código repetido,
  la interfaz con ojos nuevos) y reordena `MEJORAS.md`.
- **Si una tarea falla 3 veces:** revierte, márcala “🔒 bloqueada” con la causa y pasa a otra.
- **Si algo necesita una decisión del usuario:** pregúntale una vez, márcala “⏳ espera respuesta” y
  sigue con otra tarea.
- Puedes usar subagentes para investigar o revisar, pero **tú integras y verificas**.
- Actualiza la descripción del PR “Mejoras continuas” cada pocos ciclos.

## 6. Ramas y PR

- Rama de trabajo: **`mejoras-continuas`** (sale de `claude/admiring-dijkstra-cfuoyl`, la v1 del PR #1).
- PR en borrador **“Mejoras continuas”** de `mejoras-continuas` hacia `main`.
- Push al final de cada ciclo, para no perder nada si la sesión se corta.

## 7. Comandos

| Comando | Qué hace |
| --- | --- |
| `npm ci` | Instala las dependencias exactas del `package-lock.json`. |
| `npm run dev` | Editor en http://localhost:5173/ con recarga al instante. |
| `npm run build` | Compila en `dist/`. |
| `npm test` | Pruebas del núcleo (Vitest, en Node). |
| `npm run test:e2e` | Pruebas de punta a punta (Playwright + Chromium sin ventana). |
| `npm run check` | Compilación + todas las pruebas. **Tiene que terminar en verde antes de cada commit.** |

### Notas prácticas para IA

- **Agregar dependencias:** el `npm` 10 que trae Node 22 se cae con `Cannot read properties of null
  (reading 'edgesOut')` al agregar Vitest (dependencias “peer” circulares entre vite y vitest).
  Usa `npx -y npm@11.6.2 install -D --save-exact paquete@x.y.z`. Después, `npm ci` y `npm install` con
  npm 10 funcionan bien.
- **Playwright** está fijado en **1.63.0** porque es la versión de Chromium que viene instalada en las
  sesiones de Claude en la nube (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). No ejecutes
  `playwright install` ahí. En GitHub Actions sí: `npx playwright install --with-deps chromium`.
- **WebGL sin ventana:** Chromium con `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- **Validador:** `gltf-validator` (Khronos). Los ayudantes de prueba están en `tests/helpers/`.
  Las pruebas exigen 0 errores y 0 avisos, salvo los de `ALLOWED_WARNINGS` (cada uno con su motivo).
- **Vitest en Node:** `tests/unit/setup.js` agrega un `FileReader` mínimo para `GLTFExporter`. En Node
  no hay `<canvas>`: las texturas se exportan en las pruebas del navegador (`tests/e2e`).
- **Playwright:** `tests/e2e/fixtures.js` falla si hay errores en la consola; `E2E_CONSOLE=1` imprime
  toda la consola del navegador. Las capturas quedan en `test-results/capturas/` (míralas).
  Al subir archivos con `setInputFiles`, pasa `{ name, mimeType, buffer }` y **no rutas**: Chromium no
  recibe archivos cuya ruta tiene letras como “ñ” (los títulos de las pruebas van a la ruta).
- **Errores para el usuario:** lanza `UserError` (`src/core/errors.js`) con un mensaje que diga qué pasó
  y cómo arreglarlo; `app.run()` lo muestra sin registrarlo como fallo del programa.
- **No uses `pkill -f "<texto>"`** con un texto que aparezca en tu propio comando: se mata la shell.

## 8. Arquitectura

Vite + JavaScript (módulos ES, sin framework) + three.js. Versiones fijas en `package.json`.

```
index.html              la página y el panel lateral
src/main.js             arranca el editor y conecta los paneles
src/app.js              estado compartido (App): modelo abierto, preferencias, eventos, run()
src/style.css           estilos (también para pantallas chicas)
src/core/               lógica 3D sin interfaz (se prueba con Vitest en Node)
  loader.js             abrir .glb/.gltf (GLTFLoader + Draco + Meshopt)
  viewer.js             vista 3D: cámara, OrbitControls, luces, piso, cuadrícula
  model.js              LoadedModel: el modelo dentro de un "contenedor" con los ajustes
  info.js               triángulos, medidas, huesos, animaciones, texturas
  transform.js          escala, altura, giros de 90°, centrar y apoyar en el suelo
  simplify.js           reducir polígonos: plan, original de cada malla, simplifyMeshesAsync (worker)
  simplifyGeometry.js   el algoritmo (meshoptimizer), sin estado
  simplify.worker.js    Web Worker que reduce sin congelar la página
  simplifySync.js       versión en el mismo hilo (pruebas en Node)
  geometryTransfer.js   empaquetar geometrías para enviarlas a un worker
  animation.js          reproducir animaciones (AnimationMixer)
  exporter.js           exportar .glb (GLTFExporter) y comprobar el resultado
  keyframes.js          pistas de animación con giros en grados
  units.js              METERS_PER_STUD (metros ↔ studs)
  errors.js             UserError: errores con mensaje claro para el usuario
  history.js            deshacer/rehacer (app.history): comandos { label, undo, redo }
src/samples/            modelos de prueba generados por código (sin licencias de terceros)
  r15Dummy.js           muñeco R15: 16 huesos, 3 animaciones (Saludar, Caminar, Saltar)
  heavyMesh.js          malla pesada: 120.000 triángulos con textura
  multiPart.js          carrito: 8 piezas, varios materiales, geometría compartida
  index.js              SAMPLES y createSample( id )
src/ui/                 un archivo por panel de la interfaz (samples.js: botones de ejemplo)
tests/unit/             pruebas Vitest del núcleo (Node)
tests/e2e/              pruebas Playwright (flujos reales en el navegador; playwright.config.js)
tests/helpers/          ayudantes compartidos (validar GLB, etc.)
bridge/                 (futuro) puente MCP "Claude en vivo"
```

**Ideas clave**

- `LoadedModel` envuelve los nodos del archivo en un **contenedor** (Group). Los ajustes (escala, giro,
  posición) van en el contenedor, así nunca chocan con las animaciones, que mueven los nodos de adentro.
- `App` es un `EventTarget`. Eventos: `model` (se abrió o cerró un modelo), `geometry` (cambiaron las
  mallas), `transform` (cambió escala/giro/posición), `settings` (cambió una preferencia).
- `app.run( mensaje, tarea, prefijoDeError )` muestra “Trabajando…” y convierte los errores en avisos
  en español.
- **Tareas largas:** `app.run( mensaje, ( { progress, signal } ) => …, error, { cancellable: true } )`
  muestra barra de avance y botón Cancelar. Lo pesado va en un **Web Worker** (ver
  `simplify.worker.js`) para que la página nunca se congele.
- **Toda acción que cambie el modelo se guarda en `app.history`** con `push( { label, undo, redo } )`
  (la acción ya está hecha al guardarla). Ejemplos: `adjust()` en `adjustPanel.js` y
  `pushGeometryChange()` en `simplifyPanel.js`. El historial se vacía al abrir otro modelo.
- `src/core/` no toca el DOM: así se prueba en Node. La interfaz vive en `src/ui/`.
- Exportar: `GLTFExporter` binario, en la pose de reposo; texturas WebP → PNG; vértices cuantizados →
  Float32 (para no depender de extensiones que Roblox podría no leer).
- **Proyecto** (`exportProject` / `LoadedModel.project`): un GLB normal con
  `scenes[0].extras.editor3dRoblox = { kind: 'proyecto', format, baseName… }` y el nodo raíz marcado
  `{ type: 'contenedor' }` (su TRS = ajustes del editor). Texturas PNG a tamaño completo. Si agregas
  estado nuevo que deba sobrevivir (mapa de huesos, guiones…), guárdalo ahí y sube `PROJECT_FORMAT`.

**Estilo de código:** el de three.js (tabulaciones, espacios dentro de los paréntesis:
`fn( a, b )`, líneas en blanco al abrir y cerrar bloques). Identificadores en inglés, comentarios y
textos de la interfaz en español.

## 9. Decisiones pendientes del usuario

Ver la sección “⏳ Espera respuesta” de `MEJORAS.md`.
