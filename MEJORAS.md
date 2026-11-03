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
  Mientras tanto, el paso de Pages no debe romper nada (F0-08).
- **Accesibilidad con axe:** `axe-core` tiene licencia **MPL-2.0**, que no está en la lista permitida
  (MIT, BSD, Apache, CC0). ¿Se permite solo para las pruebas? Se preguntará al llegar a F5-06.

---

## Fase 0 — Base sólida

- [x] **F0-01** · Alta · Pruebas del núcleo con **Vitest** (`npm test`). *(ciclo 1)*
  - Comprobación: `npm test` en verde, con pruebas de `info`, `transform`, `simplify`, `model`,
    `exporter` y los ejemplos. ✔ 32 pruebas en 6 archivos.
- [x] **F0-02** · Alta · **Modelos de prueba generados por código**: muñeco humanoide tipo R15 con
  huesos y animaciones, malla pesada (~120.000 triángulos) con textura y modelo de varias piezas. *(ciclo 1)*
  - Comprobación: pruebas que verifican los 16 huesos con nombres R15, los triángulos y las piezas.
    ✔ `tests/unit/samples.test.js`.
- [ ] **F0-03** · Alta · Cada GLB exportado en las pruebas pasa **gltf-validator con 0 errores**.
  - Comprobación: pruebas (Vitest y Playwright) que fallan si el validador da algún error.
  - Avance: Vitest ya lo comprueba con los 3 ejemplos (ciclo 1). Falta en Playwright (con texturas).
- [ ] **F0-04** · Alta · Pruebas de punta a punta con **Playwright** y Chromium sin ventana (WebGL por
  SwiftShader): abrir ejemplo, abrir archivo, ajustar, reducir, animar, exportar y reabrir. Capturas a
  1280×800 y 390×844. Fallan si hay errores en la consola. Script `npm run test:e2e`.
  - Comprobación: `npm run test:e2e` en verde y capturas en `test-results/capturas/`.
- [ ] **F0-05** · Alta · Botones **“Probar con un ejemplo”** en la pantalla inicial (para probar sin
  tener modelos; también los usan las pruebas).
  - Comprobación: e2e abre cada ejemplo con un clic y muestra su información.
- [ ] **F0-06** · Alta · `npm run check` = compilación + Vitest + Playwright.
  - Comprobación: termina con código 0.
- [ ] **F0-07** · Alta · **GitHub Actions** ejecuta `npm run check` en cada push y en cada PR.
  Averiguar por qué no corrió nada en el PR #1.
  - Comprobación: aparece una ejecución verde en la pestaña *Actions* de la rama.
- [ ] **F0-08** · Alta · El paso de publicar en **GitHub Pages** no rompe nada si Pages no está
  activado (⏳ la decisión Vercel/Pages/los dos sigue pendiente).
  - Comprobación: el flujo se salta la publicación cuando Pages está desactivado y no sale en rojo.
- [ ] **F0-09** · Alta · **Deshacer y rehacer** (Ctrl+Z / Ctrl+Y, Ctrl+Shift+Z y botones) para todas
  las acciones.
  - Comprobación: pruebas del historial + e2e: ajustar, reducir, deshacer y rehacer.
- [ ] **F0-10** · Alta · **Autoguardado** en IndexedDB y “Recuperar tu trabajo” al volver a abrir.
  - Comprobación: e2e cambia el modelo, recarga la página y lo recupera con sus cambios.
- [ ] **F0-11** · Alta · **Guardar proyecto / Abrir proyecto** (un archivo que conserva el modelo,
  sus ajustes y sus animaciones).
  - Comprobación: e2e guarda, vuelve a abrir y compara triángulos, medidas, huesos y animaciones.
- [ ] **F0-12** · Alta · **Reducir polígonos en un Web Worker** con barra de progreso, sin congelar
  la página (hoy la congela de 2 a 10 s con 120.000 triángulos).
  - Comprobación: e2e mide que la página sigue respondiendo durante la reducción y que el resultado
    es igual al de antes.
- [ ] **F0-13** · Media · Error visual en móvil: al bajar por el panel, el fondo cambia de color a la
  altura de la pantalla (el panel no crece con su contenido).
  - Comprobación: captura móvil de página completa sin la franja.

## Fase 1 — Animación (lo más importante para el usuario)

- [ ] **F1-01** · Alta · **Mapa de huesos humanoide estándar**: cadera, columna, pecho, cuello, cabeza,
  brazos, antebrazos, manos, muslos, piernas y pies (izquierda y derecha).
  - Comprobación: pruebas unitarias del mapa.
- [ ] **F1-02** · Alta · **Detección automática** del mapa para esqueletos de Tripo, Mixamo y R15.
  - Comprobación: pruebas con esqueletos generados con los nombres de cada uno.
- [ ] **F1-03** · Alta · **Editor visual** para ver y corregir el mapa de huesos.
  - Comprobación: e2e cambia una asignación y se usa al aplicar animaciones.
- [ ] **F1-04** · Alta · **Importar animaciones GLB** (Tripo, Mixamo convertidas) y pasarlas a mi
  personaje con `SkeletonUtils.retargetClip`, con vista previa.
  - Comprobación: prueba unitaria de retarget entre dos esqueletos distintos + e2e.
- [ ] **F1-05** · Alta · **Importar animaciones FBX** (Mixamo) y pasarlas a mi personaje.
  - Comprobación: prueba con un FBX generado por código + e2e.
- [ ] **F1-06** · Alta · **Generadores de animación con deslizadores**: caminar, correr y respirar en
  reposo (velocidad, largo del paso, balanceo de brazos).
  - Comprobación: pruebas (clips válidos, en el lugar, loop sin saltos) + e2e + GLB válido.
- [ ] **F1-07** · Alta · Generadores: **saltar, caer y agacharse** (altura del salto, etc.).
  - Comprobación: igual que F1-06.
- [ ] **F1-08** · Media · Generadores: **saludar, atacar y baile simple**.
  - Comprobación: igual que F1-06.
- [ ] **F1-09** · Media · **Estilos** para los generadores (enérgico, cansado, …).
  - Comprobación: pruebas que comparan amplitud/velocidad entre estilos.
- [ ] **F1-10** · Alta · **Línea de tiempo de keyframes**: elegir un hueso, girarlo con
  `TransformControls`, poner y quitar keyframes.
  - Comprobación: e2e crea una animación de 2 keyframes, la reproduce y la exporta válida.
- [ ] **F1-11** · Media · **Copiar y pegar poses** y **reflejar** izquierda↔derecha.
  - Comprobación: pruebas unitarias del reflejo + e2e.
- [ ] **F1-12** · Media · **Suavizado de curvas** y **fantasmas** de los fotogramas vecinos.
  - Comprobación: pruebas + captura con fantasmas visibles.
- [ ] **F1-13** · Media · **IK de pies y manos** (`CCDIKSolver`): los pies no atraviesan el piso.
  - Comprobación: prueba que mide la altura de los pies en cada fotograma.
- [ ] **F1-14** · Alta · Animación **“en el lugar”** (sin avance de la raíz, como la usa Roblox).
  - Comprobación: prueba que la raíz no avanza en X/Z.
- [ ] **F1-15** · Media · **Loop sin saltos, recortar, cambiar velocidad y combinar** animaciones.
  - Comprobación: pruebas unitarias de cada operación.
- [ ] **F1-16** · Alta · **Exportar una o varias animaciones** (elegir cuáles) dentro del GLB.
  - Comprobación: e2e exporta 2 de 3 animaciones, reabre y el validador da 0 errores.

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
- [ ] **F5-07** · Baja · **Carga diferida** de los módulos pesados. — Comprobación: el paquete inicial pesa menos (medido en la compilación).
- [ ] **F5-08** · Baja · **Uso sin internet (PWA).** — Comprobación: e2e sin red abre el editor.
- [ ] **F5-09** · Media · **Galería de ejemplos** (muñeco R15, espada, árbol low-poly). — Comprobación: e2e abre cada ejemplo y lo exporta válido.

---

## Resumen

| Fase | Tareas | Hechas |
| --- | --- | --- |
| 0 — Base sólida | 13 | 2 |
| 1 — Animación | 16 | 0 |
| 2 — Conexión con IA | 8 | 0 |
| 3 — Edición de modelos | 10 | 0 |
| 4 — Roblox | 7 | 0 |
| 5 — Experiencia | 9 | 0 |
| **Total** | **63** | **2** |
