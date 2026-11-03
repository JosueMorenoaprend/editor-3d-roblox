# MEJORAS — lista de tareas

Cómo leer esta lista:

- `[ ]` pendiente · `[x]` hecha y verificada (con el ciclo en que se hizo).
- **Prioridad:** Alta / Media / Baja. **Fase:** 0 a 5.
- “Comprobación” dice cómo se verifica que está terminada. Ninguna tarea se marca como hecha sin eso.
- 🔒 = bloqueada (con la causa) · ⏳ = espera una respuesta del usuario.
- Orden de trabajo: primero los errores; después, la tarea de mayor impacto en la fase más baja sin
  terminar.

---

## ⏳ Espera respuesta

- **¿Dónde publicar el editor? ¿Vercel, GitHub Pages o los dos?** (pregunta hecha en el ciclo 0).
  Mientras tanto, el paso de Pages ya no rompe nada: si Pages está desactivado, se salta (ciclo 3).
- **Activar GitHub Actions** en el repositorio (*Settings → Actions → General → Allow all actions
  and reusable workflows → Save*). Sin eso no corre ninguna comprobación automática (F0-07, F0-08).
  El usuario dijo que ya lo activó (ciclo 9), pero después de varios pushes (el último revisado,
  `e4a6731` del ciclo 12) GitHub sigue con 0 flujos, 0 ejecuciones y 0 checks. En el ciclo 12 se le
  pidió (también en el PR #2) copiar el mensaje de <https://github.com/JosueMorenoaprend/editor-3d-roblox/actions>
  y revisar *Settings → Actions → General → Actions permissions*; si el mensaje habla de la cuenta, es
  cosa del soporte de GitHub.
- **Accesibilidad con axe:** `axe-core` tiene licencia **MPL-2.0**, que no está en la lista permitida
  (MIT, BSD, Apache, CC0). ¿Se permite solo para las pruebas? Se preguntará al llegar a F5-06.

## Orden sugerido para los próximos ciclos (auditoría profunda del ciclo 15)

1. ~~**F1-14**~~ y ~~**F1-16**~~ (hechas en los ciclos 16 y 17).
2. ~~**F1-05**~~ (hecha en el ciclo 18).
3. ~~**F1-10**~~ (hecha en el ciclo 19). Antes de seguir: el error **F1-21** (la pose del editor de
   keyframes se pierde) y **F1-22**; después las Media de la Fase 1 (F1-23, F1-24, F1-25, F1-08, F1-15,
   F1-11…).
4. **F5-14** y **F5-13** (Media): el panel ya es muy largo, sobre todo en el celular.
5. Fase 2 (conexión con IA): el guion de animación usa el mapa y los giros “en el espacio del personaje”
   que ya existen (F2-01, F2-02).

---

## Fase 0 — Base sólida

- [x] **F0-01** · Alta · Pruebas del núcleo con **Vitest** (`npm test`). *(ciclo 1)*
  - Comprobación: `npm test` en verde, con pruebas de `info`, `transform`, `simplify`, `model`,
    `exporter` y los ejemplos. ✔ 32 pruebas en 6 archivos.
- [x] **F0-02** · Alta · **Modelos de prueba generados por código**: muñeco humanoide tipo R15 con
  huesos y animaciones, malla pesada (~120.000 triángulos) con textura y modelo de varias piezas. *(ciclo 1)*
  - Comprobación: pruebas que verifican los 16 huesos con nombres R15, los triángulos y las piezas.
    ✔ `tests/unit/samples.test.js`.
- [x] **F0-03** · Alta · Cada GLB exportado en las pruebas pasa **gltf-validator con 0 errores**. *(ciclos 1 y 2)*
  - Comprobación: pruebas (Vitest y Playwright) que fallan si el validador da algún error.
    ✔ Vitest (3 ejemplos) y Playwright (muñeco, malla pesada con textura y carrito).
- [x] **F0-04** · Alta · Pruebas de punta a punta con **Playwright** y Chromium sin ventana (WebGL por
  SwiftShader): abrir ejemplo, abrir archivo, ajustar, reducir, animar, exportar y reabrir. Capturas a
  1280×800 y 390×844. Fallan si hay errores en la consola. Script `npm run test:e2e`. *(ciclo 2)*
  - Comprobación: `npm run test:e2e` en verde y capturas en `test-results/capturas/`.
    ✔ 5 flujos × 2 pantallas = 10 pruebas.
- [x] **F0-05** · Alta · Botones **“Probar con un ejemplo”** en la pantalla inicial (para probar sin
  tener modelos; también los usan las pruebas). *(ciclo 2)*
  - Comprobación: e2e abre cada ejemplo con un clic y muestra su información. ✔
- [x] **F0-06** · Alta · `npm run check` = compilación + Vitest + Playwright. *(ciclo 2)*
  - Comprobación: termina con código 0. ✔ (unos 2 minutos)
- [ ] **F0-07** · Alta · **GitHub Actions** ejecuta `npm run check` en cada push y en cada PR.
  Averiguar por qué no corrió nada en el PR #1.
  - Comprobación: aparece una ejecución verde en la pestaña *Actions* de la rama.
  - Avance (ciclo 3): flujo `ci.yml` (“Comprobar”) listo y YAML revisado. Causa encontrada: el repo
    tiene 0 flujos y 0 ejecuciones, ni siquiera al abrir el PR #2 → **Actions está desactivado**.
    ⏳ Espera que el usuario lo active para ver la primera ejecución verde.
- [ ] **F0-08** · Alta · El paso de publicar en **GitHub Pages** no rompe nada si Pages no está
  activado (⏳ la decisión Vercel/Pages/los dos sigue pendiente).
  - Comprobación: el flujo se salta la publicación cuando Pages está desactivado y no sale en rojo.
  - Avance (ciclo 3): `deploy.yml` revisa primero si Pages está activado con “GitHub Actions”; si no,
    termina en verde con un aviso. Ya no corre en los PR (eso lo hace “Comprobar”).
    ⏳ Se verá funcionando cuando Actions esté activado y llegue un cambio a `main`.
- [x] **F0-09** · Alta · **Deshacer y rehacer** (Ctrl+Z / Ctrl+Y, Ctrl+Shift+Z y botones) para todas
  las acciones. *(ciclo 5)*
  - Comprobación: pruebas del historial + e2e: ajustar, reducir, deshacer y rehacer. ✔ 7 pruebas
    unitarias + 2 flujos e2e (teclado y botones; ajustes, reducir y “Volver al original”).
  - Regla para lo que venga: **toda acción nueva que cambie el modelo se guarda en `app.history`**.
- [x] **F0-10** · Alta · **Autoguardado** en IndexedDB y “Recuperar tu trabajo” al volver a abrir. *(ciclo 8)*
  - Comprobación: e2e cambia el modelo, recarga la página y lo recupera con sus cambios. ✔ 2 flujos
    e2e (recuperar con los ajustes; abrir otro modelo sin cambios no borra lo guardado; “Descartar”).
- [x] **F0-11** · Alta · **Guardar proyecto / Abrir proyecto** (un archivo que conserva el modelo,
  sus ajustes y sus animaciones). *(ciclo 7)*
  - Comprobación: e2e guarda, vuelve a abrir y compara triángulos, medidas, huesos y animaciones.
    ✔ 4 pruebas de Vitest (ajustes que se pueden quitar, 16 huesos y 3 animaciones, GLB válido, un
    GLB para Roblox no se confunde con un proyecto) + e2e que guarda, recarga la página y sigue.
  - Límite conocido: al abrir un proyecto, “Volver al original” vuelve a la malla tal como se guardó
    (las mallas originales antes de reducir no se guardan, para no duplicar el tamaño).
- [x] **F0-12** · Alta · **Reducir polígonos en un Web Worker** con barra de progreso, sin congelar
  la página (hoy la congela de 2 a 10 s con 120.000 triángulos). *(ciclo 6)*
  - Comprobación: e2e mide que la página sigue respondiendo durante la reducción y que el resultado
    es igual al de antes. ✔ Tarea más larga mientras reduce: 0–89 ms (antes, bloqueada toda la
    reducción); mismo resultado (120.000 → 20.000) que la versión anterior; Cancelar deja el modelo igual.
- [x] **F0-13** · Media · Error visual en móvil: al bajar por el panel, el fondo cambia de color a la
  altura de la pantalla (el panel no crece con su contenido). *(ciclo 4)*
  - Comprobación: captura móvil de página completa sin la franja. ✔ + prueba e2e que mide que el
    contenido del panel no se sale de su caja (antes: 1002 px fuera).
- [ ] **F0-14** · Baja · Después de exportar, la comprobación dice “13 mallas” para el carrito de 8
  piezas: las mallas con varios materiales se guardan en una parte por material (así funciona glTF).
  Contar piezas o explicarlo para no confundir. También pasa al abrir un proyecto: la cabina vuelve
  como 6 mallas. *(encontrado en el ciclo 2)*
  - Comprobación: e2e del carrito: el resultado dice 8 piezas (o lo explica).
- [x] **F0-15** · Media · Los errores al abrir archivos dañados ya son claros; revisar el resto de
  mensajes de error (exportar, reducir, WebGL) para que todos digan **qué pasó y cómo arreglarlo**.
  *(encontrado en el ciclo 2; hecho en el ciclo 9)*
  - Comprobación: prueba por cada mensaje de error con su texto en español claro. ✔ 3 pruebas de
    Vitest (`describeError`) + 2 flujos e2e (valores inválidos; `.gltf` al que le falta la textura).
- [ ] **F0-16** · Baja · En *Reducir polígonos*, las mallas de menos de 50 triángulos salen con un ⛔ rojo
  y “Es muy pequeña”: asusta sin motivo. Decir “No hace falta reducirla”. *(auditoría del ciclo 12)*
  - Comprobación: e2e del carrito sin ⛔ y con el texto nuevo.

## Fase 1 — Animación (lo más importante para el usuario)

- [x] **F1-01** · Alta · **Mapa de huesos humanoide estándar**: cadera, columna, pecho, cuello, cabeza,
  brazos, antebrazos, manos, muslos, piernas y pies (izquierda y derecha). *(ciclo 10)*
  - Comprobación: pruebas unitarias del mapa. ✔ 6 pruebas (`tests/unit/boneMap.test.js`): huesos,
    nombres en español, opcionales, reflejo izquierda↔derecha y validación con mensajes claros.
- [x] **F1-02** · Alta · **Detección automática** del mapa para esqueletos de Tripo, Mixamo y R15. *(ciclo 11)*
  - Comprobación: pruebas con esqueletos generados con los nombres de cada uno. ✔ 12 pruebas
    (`tests/unit/boneDetect.test.js`): Mixamo, Unreal, Unity/VRM, VRoid, ActorCore, 3ds Max, el muñeco
    R15, lados por posición y mensajes cuando no se reconoce.
  - Pendiente fuera de aquí: Tripo no publica los nombres de su convención `tripo` (la que usa por
    defecto); el detector lee palabras dentro de los nombres, pero falta probarlo con un GLB real de
    Tripo (paso T-01 en `PRUEBAS_ROBLOX.md`). Si falla, ya se puede corregir a mano (F1-03).
- [x] **F1-03** · Alta · **Editor visual** para ver y corregir el mapa de huesos. *(ciclo 12)*
  - Comprobación: e2e cambia una asignación y se usa al aplicar animaciones. ✔ Sección *Mapa de huesos*:
    estado (“Mapa completo” o qué falta), tipo de esqueleto, una lista por parte del cuerpo para elegir
    cada hueso (con deshacer), ▶ para mover un hueso, **Probar el mapa** (cada parte por turnos) y
    “Detectar otra vez”. El hueso elegido se marca en rosa en la vista 3D. El mapa se guarda en el
    proyecto (formato 2) y en el autoguardado. e2e (escritorio y móvil): personaje con 2 huesos de
    nombres raros → elegirlos a mano → ▶ mueve el hueso elegido (`Bone_07`) → deshacer/rehacer → guardar
    el proyecto → recargar → el mapa vuelve con las correcciones → GLB para Roblox válido. La primera
    animación hecha con el mapa es la de prueba (8 pruebas de Vitest: giros iguales en esqueletos con
    los ejes girados, como Mixamo); F1-04 y F1-06 usarán el mismo mapa y la misma forma de girar.
- [x] **F1-04** · Alta · **Importar animaciones GLB** (Tripo, Mixamo convertidas) y pasarlas a mi
  personaje con `SkeletonUtils.retargetClip`, con vista previa. *(ciclo 13)*
  - Comprobación: prueba unitaria de retarget entre dos esqueletos distintos + e2e. ✔ En vez de
    `SkeletonUtils.retargetClip` (copia matrices globales: solo sirve si los dos esqueletos tienen la misma
    pose de reposo y los mismos ejes), `core/retarget.js` pasa cada parte con el mapa de huesos: giros en
    el espacio del personaje, poses de reposo alineadas (pose T ↔ brazos abajo) y cadera escalada al largo
    de las piernas. 11 pruebas de Vitest (en cada cuadro, cada tramo de brazos y piernas apunta igual en
    los dos personajes, < 0,5°; Mixamo con ejes girados → R15 y al revés; saltar; archivos sin cuerpo;
    nombres repetidos; errores) + e2e (escritorio y móvil): personaje sin animaciones → elegir un GLB de
    Mixamo sin cuerpo → ▶ Ver → Agregar → reproducir → deshacer/rehacer → exportar: GLB válido y la
    animación mueve los huesos del personaje. En *Animaciones*: “Agregar animaciones de otro archivo…”.
- [x] **F1-05** · Alta · **Importar animaciones FBX** (Mixamo) y pasarlas a mi personaje. *(ciclo 18)*
  - Comprobación: prueba con un FBX generado por código + e2e. ✔ “Agregar animaciones de otro archivo”
    acepta `.fbx` (con el `FBXLoader` de three.js, que se descarga solo al usarlo: 50 KB; las texturas
    externas que nombre el FBX no se piden a internet). `tests/helpers/fbx.js` genera un FBX 7.4 en texto
    con un esqueleto tipo Mixamo (en centímetros). 2 pruebas de Vitest (el brazo del R15 sube 45° como en
    el FBX; el avance se escala bien aunque el FBX esté en centímetros; FBX dañado → mensaje claro) + e2e
    (escritorio y móvil): importar el FBX, agregar, exportar GLB válido moviendo los huesos del R15.
- [x] **F1-06** · Alta · **Generadores de animación con deslizadores**: caminar, correr y respirar en
  reposo (velocidad, largo del paso, balanceo de brazos). *(ciclo 14)*
  - Comprobación: pruebas (clips válidos, en el lugar, loop sin saltos) + e2e + GLB válido. ✔ En
    *Animaciones* → “Crear una animación”: Caminar (velocidad, largo del paso, balanceo de brazos),
    Correr (+ inclinación) y Respirar (velocidad, intensidad), con vista previa en bucle mientras se
    mueven los deslizadores y “Agregar” con deshacer. Si el personaje está en pose T, los brazos bajan a
    los costados. 11 pruebas de Vitest (los 3 generadores con el R15 y con un esqueleto tipo Mixamo:
    válidos, último cuadro = primero, la cadera no avanza; pies y brazos alternados; deslizadores; igual
    con ejes girados) + e2e (escritorio y móvil) que exporta y lee del GLB que la cadera de “Caminar (2)”
    sube y baja pero no avanza.
- [x] **F1-07** · Alta · Generadores: **saltar, caer y agacharse** (altura del salto, etc.). *(ciclo 15)*
  - Comprobación: igual que F1-06. ✔ Saltar (altura, agacharse antes; con altura 0 % la cadera no sube:
    para el salto del jugador en Roblox), Caer (en bucle, brazos arriba) y Agacharse (baja, se queda y
    sube). Las piernas se doblan con un cálculo de 2 huesos (ley de los cosenos) para que los pies no se
    muevan del piso. 12 pruebas más de Vitest (válidas, en bucle, en el lugar, con el R15 y con Mixamo;
    pies quietos ±1 cm al agacharse y antes de saltar; altura; brazos arriba al caer) + e2e (escritorio y
    móvil) que lee del GLB que con altura 0 la cadera nunca sube.
- [ ] **F1-08** · Media · Generadores: **saludar, atacar y baile simple**.
  - Comprobación: igual que F1-06.
- [ ] **F1-09** · Media · **Estilos** para los generadores (enérgico, cansado, …).
  - Comprobación: pruebas que comparan amplitud/velocidad entre estilos.
- [x] **F1-10** · Alta · **Línea de tiempo de keyframes**: elegir un hueso, girarlo con
  `TransformControls`, poner y quitar keyframes. *(ciclo 19)*
  - Comprobación: e2e crea una animación de 2 keyframes, la reproduce y la exporta válida. ✔ En
    *Animaciones* → “Crear a mano con keyframes”: nombre, duración, parte del cuerpo (con el mapa de
    huesos), 3 deslizadores en el espacio del personaje (*Adelante / atrás*, *Hacia los lados*, *Girar*:
    significan lo mismo en el R15 y en un esqueleto tipo Mixamo con los ejes girados), anillos de colores
    en la vista 3D (`TransformControls`, se descargan solo al abrir: 22 KB), línea de tiempo con las
    marcas de la parte elegida, ◆ Poner keyframe, Quitar keyframe, ▶ Reproducir en bucle, Guardar
    animación (con deshacer) y Cancelar (pide confirmar si hay keyframes). `core/keyframeAnimation.js` +
    ángulos ↔ giro en `skeletonPose.js`. 4 pruebas de Vitest (ida y vuelta de los ángulos en todos los
    huesos del R15 y de Mixamo; “hacia los lados” sube el brazo en los dos; poner, reemplazar y quitar
    keyframes; a la mitad entre 2 keyframes el brazo va por 45°; GLB válido) + e2e (escritorio y móvil):
    2 keyframes del brazo (0 y 80° a 1 s) → a 0,5 s marca 40° → reproducir y detener → guardar → exportar:
    GLB válido con 2 cuadros en `LeftUpperArm` y el segundo girado 80°.
- [ ] **F1-11** · Media · **Copiar y pegar poses** y **reflejar** izquierda↔derecha.
  - Comprobación: pruebas unitarias del reflejo + e2e.
- [ ] **F1-12** · Media · **Suavizado de curvas** y **fantasmas** de los fotogramas vecinos.
  - Comprobación: pruebas + captura con fantasmas visibles.
- [ ] **F1-13** · Media · **IK de pies y manos** (`CCDIKSolver`): los pies no atraviesan el piso.
  - Comprobación: prueba que mide la altura de los pies en cada fotograma.
- [x] **F1-14** · Alta · Animación **“en el lugar”** (sin avance de la raíz, como la usa Roblox). *(ciclo 16)*
  - Comprobación: prueba que la raíz no avanza en X/Z. ✔ `core/inPlace.js`: mide cuánto avanza la cadera
    (en el espacio del personaje) y fija X/Z de la cadera y de sus huesos padres en el primer cuadro; la
    altura (rebote, salto) no cambia; sirve con esqueletos girados y en centímetros, y con pistas “cubic
    spline”. Al importar, las que avanzan llevan la etiqueta “avanza 1,6 m” y la casilla “Dejar en el
    lugar” marcada; en *Animaciones*, aviso y botón **Dejar en el lugar** (con deshacer). 6 pruebas de
    Vitest + e2e (escritorio y móvil) que lee del GLB que la cadera de las dos animaciones no avanza.
    Los generadores ya salen en el lugar.
- [ ] **F1-15** · Media · **Loop sin saltos, recortar, cambiar velocidad y combinar** animaciones.
  - Comprobación: pruebas unitarias de cada operación.
- [x] **F1-16** · Alta · **Exportar una o varias animaciones** (elegir cuáles) dentro del GLB. *(ciclo 17)*
  - Comprobación: e2e exporta 2 de 3 animaciones, reabre y el validador da 0 errores. ✔ En *Exportar*,
    debajo de “Incluir animaciones”, “Cuáles van en el archivo” con una casilla por animación (se recuerda
    mientras el modelo está abierto). `exportGLB( model, { clips } )`. Prueba de Vitest (2 de 3, GLB válido,
    el modelo sigue con las 3) + e2e (escritorio y móvil): saca “Caminar”, exporta (validador 0 errores),
    el resultado dice “2 animaciones”, el JSON trae Saludar y Saltar, y al reabrir hay 2.
- [ ] **F1-17** · Media · **Elegir un hueso tocándolo en la vista 3D** (“¿Cuál es la mano izquierda?” →
  clic cerca de la mano): con nombres sin sentido (`Bone_23`), elegir de una lista es difícil.
  *(auditoría del ciclo 12)*
  - Comprobación: e2e asigna un hueso haciendo clic en la vista 3D.
- [ ] **F1-18** · Media · **Saber hacia dónde mira el personaje** (con el esqueleto: de la pierna derecha a
  la izquierda y de la cadera a la cabeza) en vez de suponer que mira a +Z. Hoy, si un modelo mira a
  otro lado, los lados sin nombre y los movimientos generados salen cambiados. *(auditoría del ciclo 12)*
  - Comprobación: pruebas con un esqueleto que mira a −Z y a +X: mismo mapa y mismos movimientos.
- [ ] **F1-19** · Baja · **Pasar también los dedos** al importar animaciones: el mapa estándar no tiene
  dedos, así que hoy las manos de una animación de Mixamo o Tripo quedan quietas (el R15 de Roblox no
  tiene dedos, pero un personaje de Tripo sí). *(ciclo 13)*
  - Comprobación: prueba con dos esqueletos con dedos: los dedos del destino siguen a los del origen.
- [ ] **F1-20** · Media · Probar el retarget con **animaciones reales** de Tripo y de Mixamo (paso T-02 de
  `PRUEBAS_ROBLOX.md`): giro de los antebrazos (“twist”), pies que se hunden o flotan, personajes en pose
  A. Corregir lo que se vea mal. *(ciclo 13)*
  - Comprobación: el usuario (o Claude local) anota el resultado de T-02 y las correcciones tienen prueba.
- [ ] **F1-21** · Alta · **Error:** con el editor de keyframes abierto, lo que devuelve el personaje a la
  pose de reposo (Exportar, Guardar proyecto, el autoguardado, “Detectar otra vez”, agregar una animación,
  el ▶ Ver de otro bloque o el reproductor de arriba) borra la pose que se está armando: el brazo vuelve
  al reposo pero los deslizadores siguen marcando el giro, y “Poner keyframe” guardaría la pose de reposo.
  *(auditoría del ciclo 19)*
  - Comprobación: e2e con el editor abierto: girar una parte, exportar y ver otra animación → la parte
    sigue girada, los deslizadores coinciden y el keyframe guarda ese giro.
- [ ] **F1-22** · Media · “Poner keyframe” guarda **solo la parte elegida**: si se mueven varias partes y
  se pulsa una vez, las demás no quedan guardadas, y al mover el tiempo se pierden sin aviso. Que guarde
  la pose que se ve (todas las partes que se movieron) y avise antes de descartar cambios sin keyframe.
  *(auditoría del ciclo 19)*
  - Comprobación: prueba + e2e: mover 2 partes, un solo “Poner keyframe” → las 2 tienen keyframe.
- [ ] **F1-23** · Media · Si se exporta con keyframes **sin guardar**, avisar que esa animación todavía no
  va en el archivo (hay que pulsar “Guardar animación”). *(auditoría del ciclo 19)*
  - Comprobación: e2e exporta con el editor abierto y ve el aviso.
- [ ] **F1-24** · Media · **Deshacer cada keyframe** (Ctrl+Z dentro del editor; hoy deshace la última
  acción del modelo) y **autoguardar el borrador** de keyframes (hoy, si se cierra la página antes de
  guardar, se pierde). *(auditoría del ciclo 19)*
  - Comprobación: e2e: 2 keyframes → Ctrl+Z quita el último; recargar la página → el borrador vuelve.
- [ ] **F1-25** · Media · **Editar con keyframes una animación que ya existe** (generada, importada o hecha
  a mano): hoy, una vez guardada, no se puede volver a abrir para ajustarla. *(auditoría del ciclo 19)*
  - Comprobación: e2e abre “Saludar” del R15 en el editor, cambia un keyframe y la exportación lo trae.

## Fase 2 — Conexión con IA

- [ ] **F2-01** · Alta · Formato **“guion de animación”** en JSON (versión, nombre, duración, loop y
  pistas por hueso del mapa estándar, keyframes en grados), con **esquema JSON** y validación que
  explique los errores en español.
  - Comprobación: pruebas con guiones válidos e inválidos.
- [ ] **F2-02** · Alta · **Aplicar un guion** a mi personaje con vista previa.
  - Comprobación: prueba guion → clip + e2e.
- [ ] **F2-03** · Alta · Botón **“Pedir a una IA”**: prompt listo para copiar con los huesos de mi
  personaje, las reglas y el esquema; pegar la respuesta, ver la vista previa y aplicarla.
  - Comprobación: e2e copia el prompt, pega un guion y lo aplica.
- [ ] **F2-04** · Alta · **API de control del editor** (comandos con nombre) que usan el puente MCP y
  las pruebas.
  - Comprobación: pruebas de cada comando.
- [ ] **F2-05** · Alta · **Puente MCP “Claude en vivo”** (`bridge/`, Node + `@modelcontextprotocol/sdk`
  + WebSocket), que también sirve el editor en `http://localhost`.
  - Comprobación: prueba automática con un cliente MCP.
- [ ] **F2-06** · Alta · Herramientas MCP: `estado_escena`, `listar_huesos`, `cargar_modelo`,
  `aplicar_guion_animacion`, `poner_pose`, `reproducir`, `captura`, `reducir_poligonos` y
  `exportar_glb`.
  - Comprobación: la prueba del cliente MCP usa todas.
- [ ] **F2-07** · Media · Instrucciones del puente en el README (`claude mcp add …`, Claude Desktop,
  Antigravity, Codex).
  - Comprobación: los pasos se siguen tal cual en una prueba.
- [ ] **F2-08** · Baja · **Chat de Claude** dentro de la app: opcional y apagado por defecto, con la
  clave API del usuario guardada solo en su navegador y aviso de que la API cobra aparte.
  - Comprobación: prueba con la API simulada; sin clave no se envía nada.

## Fase 3 — Edición de modelos

- [ ] **F3-01** · Media · **Cortar con un plano.** — Comprobación: prueba de triángulos a cada lado + GLB válido.
- [ ] **F3-02** · Media · **Cortar con una caja** (`three-bvh-csg`). — Comprobación: prueba + GLB válido.
- [ ] **F3-03** · Media · **Separar piezas sueltas** en mallas distintas. — Comprobación: prueba con el modelo de varias piezas unido.
- [ ] **F3-04** · Media · **Borrar triángulos** seleccionados con pincel o lazo. — Comprobación: e2e.
- [ ] **F3-05** · Media · **Reflejar** (espejo). — Comprobación: prueba de normales y caras correctas.
- [ ] **F3-06** · Media · **Mover el punto de pivote.** — Comprobación: prueba + e2e.
- [ ] **F3-07** · Baja · **Juntar modelos.** — Comprobación: e2e abre dos modelos y exporta uno.
- [ ] **F3-08** · Media · **Cambiar colores y materiales.** — Comprobación: e2e + GLB válido.
- [ ] **F3-09** · Media · **Reemplazar o reducir texturas.** — Comprobación: e2e + GLB válido.
- [ ] **F3-10** · Media · **Dividir una malla grande** en partes bajo el límite de Roblox. — Comprobación: prueba con la malla pesada.

## Fase 4 — Roblox

- [ ] **F4-01** · Alta · Verificar en la **documentación oficial de Roblox** los límites actuales
  (triángulos, texturas, huesos) y anotarlos con su fuente.
  - Comprobación: tabla con enlaces en el README y valores usados en el código.
- [ ] **F4-02** · Alta · **Plantillas de exportación**: “Pieza (MeshPart)”, “Accesorio” y
  “Personaje R15”.
  - Comprobación: e2e exporta con cada plantilla y el validador da 0 errores.
- [ ] **F4-03** · Alta · **Personaje R15**: ajustar el esqueleto a las 15 partes de Roblox y a la escala
  de un avatar.
  - Comprobación: prueba con el muñeco + pasos en `PRUEBAS_ROBLOX.md`.
- [ ] **F4-04** · Alta · Revisión **“¿Listo para Roblox?”**: triángulos por malla, texturas, nombres,
  huesos, animaciones en el lugar y escala en studs, con explicación y botón “Arreglar”.
  - Comprobación: e2e con un modelo con problemas: cada “Arreglar” los resuelve.
- [ ] **F4-05** · Media · **Guía paso a paso** dentro de la app para Roblox Studio (3D Importer, Avatar
  Importer, Animation Editor) con fragmentos de Luau listos para copiar.
  - Comprobación: e2e abre la guía y copia un fragmento.
- [ ] **F4-06** · Media · Investigar en el **DevForum de Roblox** los errores actuales al importar
  animaciones GLB; agregar opciones de exportación que los eviten y documentarlo.
  - Comprobación: notas con fuentes + opción de exportación con prueba.
- [ ] **F4-07** · Alta · **Aplicar escala y giro al exportar** (como *Apply transforms* de Blender):
  hoy los ajustes quedan como escala/giro en un nodo padre de los huesos, y los huesos de Roblox no
  tienen escala. Hornear el ajuste en la malla, los huesos y las animaciones, y dejar la malla con
  esqueleto en la raíz (quita el aviso `NODE_SKINNED_MESH_NON_ROOT`). Verificar antes en la
  documentación de Roblox. *(encontrado en el ciclo 1)*
  - Comprobación: prueba que ningún nodo del GLB tiene escala distinta de 1, el validador no da ese
    aviso, el modelo mide lo mismo y las animaciones se ven igual + paso en `PRUEBAS_ROBLOX.md`.

## Fase 5 — Experiencia

- [ ] **F5-01** · Media · **Modo simple** por defecto y **modo avanzado** opcional. — Comprobación: e2e cambia de modo y aparecen/desaparecen las opciones avanzadas.
- [ ] **F5-02** · Media · **Tutorial interactivo** la primera vez. — Comprobación: e2e recorre el tutorial.
- [ ] **F5-03** · Media · **Ayuda contextual** con “?”. — Comprobación: e2e abre la ayuda de cada panel.
- [ ] **F5-04** · Media · **Panel de atajos de teclado.** — Comprobación: e2e lo abre con “?” o un botón.
- [ ] **F5-05** · Baja · **Arrastrar y soltar en todas partes** (modelos, animaciones, proyectos). — Comprobación: e2e suelta cada tipo de archivo.
- [ ] **F5-06** · Media · **Accesibilidad**: contraste, uso con teclado y revisión con axe (⏳ licencia de axe-core). — Comprobación: revisión automática sin errores graves.
- [ ] **F5-07** · Baja · **Carga diferida** de los módulos pesados. — Comprobación: el paquete inicial pesa menos (medido en la compilación). Avance (ciclo 6): meshoptimizer ya se carga solo en el worker (828 → 777 KB).
- [ ] **F5-08** · Baja · **Uso sin internet (PWA).** — Comprobación: e2e sin red abre el editor.
- [ ] **F5-09** · Media · **Galería de ejemplos** (muñeco R15, espada, árbol low-poly), que se pueda abrir también con un modelo ya abierto (hoy los ejemplos solo están en la pantalla inicial). — Comprobación: e2e abre cada ejemplo y lo exporta válido.
- [ ] **F5-10** · Media · **Dibujar solo cuando algo cambia**: hoy el visor dibuja 60 veces por segundo aunque nada se mueva y gasta batería en laptop y tablet. *(auditoría del ciclo 5)* — Comprobación: prueba que cuenta cuadros dibujados con la escena quieta (≈0) y moviéndose.
- [ ] **F5-11** · Baja · **Código repetido**: recorrer materiales y texturas está hecho 4 veces (`info.js`, `exporter.js`, `model.js`, `viewportTools.js`); unificar en un ayudante. *(auditoría del ciclo 5)* — Comprobación: pruebas en verde y un solo ayudante.
- [ ] **F5-12** · Baja · La etiqueta “v1” de la barra superior quedó vieja: mostrar la versión real. *(auditoría del ciclo 5)* — Comprobación: e2e lee la versión de `package.json` en la barra.
- [ ] **F5-14** · Media · **Panel más corto**: hoy todas las secciones arrancan abiertas y el panel mide
  más de 3.000 px en el celular (y hay que bajar mucho en una laptop para llegar a *Animaciones* y
  *Exportar*). Abrir solas solo las que hacen falta (*Reducir polígonos* si una malla pasa el límite;
  *Mapa de huesos* si falta algo) y recordar las que el usuario cierra. *(auditoría del ciclo 15)* —
  Comprobación: e2e: con el muñeco R15, *Reducir polígonos* empieza cerrada y *Animaciones* se ve sin
  bajar tanto; con la malla pesada, *Reducir polígonos* empieza abierta; lo que cierres sigue cerrado al
  recargar.
- [ ] **F5-15** · Baja · Pruebas: el ayudante `poseAt` (poner el modelo en un momento de una animación) está
  repetido en 3 archivos de `tests/unit`; unificarlo en `helpers.js`. *(auditoría del ciclo 15)* —
  Comprobación: pruebas en verde y un solo ayudante.
- [ ] **F5-13** · Media · **En el celular, la vista 3D queda a la vista mientras bajas por el panel** (fija arriba y más baja). Hoy, al probar el mapa de huesos o un ajuste desde abajo, la página tiene que subir hasta la vista 3D para verlo. *(auditoría del ciclo 12)* — Comprobación: e2e móvil: con el panel bajado hasta *Mapa de huesos*, la vista 3D sigue visible.

---

## Resumen

| Fase | Tareas | Hechas |
| --- | --- | --- |
| 0 — Base sólida | 16 | 12 |
| 1 — Animación | 25 | 10 |
| 2 — Conexión con IA | 8 | 0 |
| 3 — Edición de modelos | 10 | 0 |
| 4 — Roblox | 7 | 0 |
| 5 — Experiencia | 15 | 0 |
| **Total** | **81** | **22** |
