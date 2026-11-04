# Editor 3D para Roblox

Editor web hecho con [three.js](https://threejs.org/) para revisar y ajustar modelos 3D
(sobre todo los que genera **Tripo AI**) y dejarlos listos para importarlos en **Roblox Studio**,
sin tener que aprender Blender.

👉 **Dónde usarlo:** se puede publicar gratis en **Vercel** (mira [Publicar en Vercel](#publicar-en-vercel))
y también en **GitHub Pages**: https://josuemorenoaprend.github.io/editor-3d-roblox/
(mira [Publicar en GitHub Pages](#publicar-en-github-pages)). Puedes usar uno de los dos o ambos.

Todo se procesa en tu navegador: tus modelos **no se suben a ningún servidor**.

---

## Qué hace (versión 1)

| Función | Detalle |
| --- | --- |
| **Abrir** | Archivos `.glb` o `.gltf`, con el botón *Abrir modelo* o arrastrándolos a la ventana. También abre modelos comprimidos con Draco o Meshopt. |
| **Ver** | Gira, acerca y mueve la cámara. Piso con cuadrícula, botón *Encuadrar*, ver la malla (triángulos) y el esqueleto. |
| **Información** | Triángulos por malla y en total, medidas (ancho, alto, profundo) en metros y en studs, huesos, animaciones y texturas. **Avisa si una malla pasa de 20.000 triángulos** (límite aproximado de Roblox por MeshPart; puedes cambiarlo). |
| **Ajustes** | Escala, altura deseada (en metros o studs), giros de 90° en X/Y/Z y *Centrar y apoyar en el suelo*. |
| **Reducir polígonos** | Baja cada malla a un número de triángulos conservando la textura, las normales y los pesos del esqueleto. |
| **Animaciones** | Elige una animación del modelo, reprodúcela, páusala, detenla o muévete por la línea de tiempo. |
| **Exportar** | Descarga un `.glb` con todos los ajustes, el esqueleto y las animaciones. Después lo vuelve a abrir solo para comprobar que quedó bien. |

---

## Cómo se usa

1. **Abre tu modelo**: pulsa **Abrir modelo** o arrastra el archivo `.glb` a la ventana.
   - Si tienes un `.gltf` con archivos aparte (`.bin`, imágenes), elígelos **todos juntos**.
   - ¿No tienes un modelo a mano? En la pantalla inicial hay botones para abrir **ejemplos**
     (un muñeco R15 con animaciones, una malla pesada y un carrito de piezas).
2. **Mira el panel *Información***. Si sale el aviso amarillo, alguna malla tiene demasiados
   triángulos para Roblox.
3. **Ajusta el tamaño y la posición** en *Ajustes*:
   - *Altura deseada*: escribe cuánto quieres que mida (por ejemplo `5` studs, más o menos lo que mide
     un personaje de Roblox) y pulsa **Aplicar**.
   - *Girar 90°*: si el modelo aparece acostado o de espaldas, gíralo en el eje que haga falta.
   - **Centrar y apoyar en el suelo**: pone el modelo en el centro y con los pies en el piso.
     Con la casilla marcada, esto se hace solo después de cada ajuste.
   - **Quitar ajustes** vuelve al modelo tal como venía.
4. **Reduce los polígonos** si hace falta:
   - Escribe los *Triángulos objetivo (por malla)* (por defecto, el límite de 20.000).
   - Se marcan solas las mallas que pasan del objetivo. Pulsa **Reducir**.
   - Mira el resultado con el botón **Malla** de la vista 3D. Si no te gusta, pulsa **Volver al original**.
   - Si no llega al objetivo, activa el **modo agresivo** (permite cruzar las costuras de la textura;
     puede manchar un poco los bordes) y vuelve a reducir.
5. **Prueba las animaciones** (si el modelo trae): elige una y pulsa **Reproducir**.
6. **Exporta**: en *Exportar* elige el nombre y el tamaño de las texturas (1024 px es el máximo que usa
   Roblox) y pulsa **Descargar .glb**. Abajo verás la comprobación del archivo descargado.

> **Truco:** el editor recuerda el límite de triángulos y otras preferencias en tu navegador.

---

## Flujo completo: Tripo AI → editor → Roblox Studio

### 1. En Tripo AI
- Genera tu modelo y descárgalo en formato **GLB**.
- Si después lo vas a animar, pide la versión con **esqueleto (rig)**.

### 2. En este editor
1. Abre el `.glb` de Tripo.
2. Revisa los **triángulos**: los modelos de Tripo suelen tener muchos. Redúcelos a menos de
   **20.000 por malla**.
3. Ajusta la **altura** (en studs) y usa **Centrar y apoyar en el suelo**.
4. Si viene acostado o mirando hacia otro lado, usa **Girar 90°**.
5. Exporta con texturas de **1024 px**.

### 3. En Roblox Studio
1. Abre tu juego y busca el botón **Importar 3D** (*Import 3D*). Según tu versión de Studio está en
   la pestaña *Inicio* (*Home*) o en el menú *Archivo* (*File*).
2. Elige el `.glb` que descargaste del editor.
3. En la ventana del importador revisa la vista previa y los avisos. Si el tamaño no es el esperado,
   revisa la opción de **unidades/escala** del archivo.
4. Pulsa **Importar**. El modelo aparece en el *Workspace*.

**Sobre las unidades:** un `.glb` mide en **metros**. El editor muestra también los **studs**
aproximados (**1 stud ≈ 0,28 m**) para que te hagas una idea del tamaño en Roblox.

**Sobre las animaciones:** el `.glb` exportado incluye las animaciones, pero hay errores reportados al
importar animaciones GLB en Roblox Studio. Si no funcionan allí, el plan para la **versión 2** es
trabajar las animaciones (Mixamo o Tripo) aparte y adaptarlas al personaje.

---

## Publicar en Vercel

El repositorio ya trae la configuración para Vercel (`vercel.json`). Solo hay que conectarlo **una vez**:

1. Asegúrate de que el código esté en la rama `main` (es decir, que el pull request con el editor
   ya esté aceptado). Vercel publica lo que hay en `main`.
2. Entra a https://vercel.com y crea una cuenta gratis con **Continue with GitHub**.
3. Pulsa **Add New… → Project**.
4. Busca el repositorio `editor-3d-roblox` y pulsa **Import**.
   Si no aparece en la lista, usa la opción para darle a Vercel acceso a ese repositorio de GitHub.
5. Vercel reconoce el proyecto como **Vite**. No cambies nada y pulsa **Deploy**.
6. En un minuto más o menos te da la dirección de tu editor, del tipo `https://editor-3d-roblox….vercel.app`
   (el nombre exacto lo elige Vercel; lo puedes cambiar en *Settings → Domains*).

Desde ahí, **cada vez que se suban cambios a `main` se vuelve a publicar solo**, y cada pull request
recibe su propia dirección de prueba (*Preview*) para revisarlo antes de aceptarlo.

> En Vercel la página vive en la raíz del dominio (`/`) y en GitHub Pages en `/editor-3d-roblox/`.
> `vite.config.js` elige la ruta correcta solo: Vercel define la variable `VERCEL=1` al compilar.

---

## Publicar en GitHub Pages

El repositorio ya trae un flujo de **GitHub Actions** (`.github/workflows/deploy.yml`) que compila
el editor y lo publica. Solo hay que activarlo **una vez**:

1. En GitHub, entra al repositorio → **Settings** (Configuración).
2. En el menú de la izquierda, entra a **Pages**.
3. En **Build and deployment → Source**, elige **GitHub Actions**.
4. Listo. Cada vez que se suban cambios a la rama `main` (por ejemplo, al aceptar un pull request),
   el editor se vuelve a publicar solo. También puedes publicarlo a mano en la pestaña **Actions** →
   *Publicar en GitHub Pages* → **Run workflow**.

La dirección será: **https://josuemorenoaprend.github.io/editor-3d-roblox/**

Si Pages **no** está activado (por ejemplo, si decides usar **solo Vercel**), el flujo no publica
nada y termina en verde con un aviso. No hace falta borrarlo: empieza a publicar solo el día que
actives Pages.

---

## Comprobación automática de cada cambio (GitHub Actions)

El flujo **Comprobar** (`.github/workflows/ci.yml`) se ejecuta en cada `push`: compila el editor y
ejecuta todas las pruebas (`npm run check`). En cada pull request verás el resultado (✓ o ✗).
Las capturas de pantalla de las pruebas quedan en la ejecución, en **Artifacts →
capturas-y-resultados**.

**Si en la pestaña *Actions* no aparece ninguna ejecución**, GitHub Actions está desactivado en el
repositorio. Para activarlo:

1. Entra al repositorio → **Settings** → **Actions** → **General**.
2. En **Actions permissions** elige **Allow all actions and reusable workflows**.
3. Pulsa **Save**.
4. En la pestaña **Actions**, si aparece un botón para habilitar los flujos, púlsalo.
5. Sube cualquier cambio (o usa **Actions → Comprobar → Run workflow**) para que corra.

---

## Trabajar en tu computadora (para programar)

Necesitas [Node.js](https://nodejs.org/) 20.19 o más nuevo (recomendado: 22).

```bash
npm install
```

```bash
npm run dev
```

Abre la dirección que aparece (normalmente http://localhost:5173/). Los cambios en el código se ven
al instante.

```bash
npm run build
```

Compila la versión final en la carpeta `dist/`.

```bash
npm run preview
```

Sirve la versión compilada para probarla (en http://localhost:4173/editor-3d-roblox/).

### Pruebas automáticas

```bash
npm test
```

Pruebas rápidas del núcleo (Vitest, unos segundos).

```bash
npm run test:e2e
```

Usa el editor en un navegador Chromium sin ventana, como lo harías tú, en tamaño de computadora y de
celular. Las capturas quedan en `test-results/capturas/`. La primera vez en tu computadora quizás
tengas que instalar Chromium con `npx playwright install chromium`.

```bash
npm run check
```

Compila y ejecuta **todas** las pruebas. Es lo que revisa GitHub en cada cambio.

### Cómo está organizado el código

```
index.html            la página y el panel lateral
src/main.js           arranca el editor y conecta los paneles
src/app.js            estado compartido (modelo abierto, preferencias, avisos de cambio)
src/style.css         estilos (también para pantallas chicas)
src/core/             la lógica 3D, sin interfaz
  loader.js           abrir .glb/.gltf (GLTFLoader + DRACOLoader + MeshoptDecoder)
  viewer.js           vista 3D: cámara, OrbitControls, luces, piso y cuadrícula
  model.js            el modelo abierto, dentro de un "contenedor" donde se aplican los ajustes
  info.js             triángulos, medidas, huesos, animaciones, texturas
  transform.js        escala, altura, giros de 90°, centrar y apoyar en el suelo
  simplify.js         reducir polígonos (simplificador de meshoptimizer)
  animation.js        reproducir animaciones (AnimationMixer)
  exporter.js         exportar .glb (GLTFExporter) y comprobar el resultado
  keyframes.js        pistas de animación con giros en grados
  errors.js           errores con un mensaje claro para el usuario
src/samples/          modelos de ejemplo hechos por código (muñeco R15, malla pesada, carrito)
src/ui/               un archivo por panel de la interfaz
tests/unit/           pruebas del núcleo (Vitest)
tests/e2e/            pruebas en el navegador (Playwright)
```

Las reglas y el plan del proyecto (para cualquier persona o IA que trabaje en él) están en
`AGENTS.md`, la lista de tareas en `MEJORAS.md` y el diario de trabajo en `BITACORA.md`.

**Versiones fijas:** `three` 0.186.1, `meshoptimizer` 1.3.0 y `vite` 8.3.4 (en `package.json`
sin `^`, para que una actualización no rompa nada sin avisar).

### Detalles técnicos

- **Reducir polígonos:** se usa `simplifyWithAttributes` de meshoptimizer. Elige qué triángulos quitar
  y reutiliza solo vértices que ya existían, así que las coordenadas de textura (UV), normales,
  colores y pesos de huesos (`skinIndex`/`skinWeight`) de los vértices que quedan **no cambian**.
  Siempre se reduce desde la malla original (no se acumula pérdida al reducir varias veces).
  Nunca borra piezas sueltas del modelo: si no puede llegar al objetivo, lo avisa.
- **Ajustes:** se guardan en un nodo raíz que envuelve el modelo. Así no chocan con las animaciones,
  que mueven los nodos de adentro.
- **Exportar:** `GLTFExporter` con `binary: true`, en la pose de reposo (si había una animación
  sonando, se detiene). Las texturas WebP se guardan como PNG y los vértices cuantizados se pasan a
  números normales, para no depender de extensiones que Roblox podría no leer.

### Para la versión 2 (todavía no está hecha)

- Cargar animaciones de Mixamo y pasarlas al esqueleto del personaje con
  `SkeletonUtils.retargetClip`. El punto de entrada será un módulo nuevo (por ejemplo
  `src/core/retarget.js`) que entregue las animaciones adaptadas a `AnimationController.addClips()`.

---

## Limitaciones conocidas

- No exporta FBX (three.js no lo permite). Si alguna vez hace falta, se convierte aparte con Blender.
- No abre texturas KTX2/Basis.
- Las medidas en studs son aproximadas.
- El editor se probó con modelos de muestra de Khronos (no incluidos en este repositorio), no
  directamente dentro de Roblox Studio.
