# Cambios (en palabras simples)

Lo que cambió para quien usa el editor. Lo más nuevo va arriba.

## En preparación (rama `mejoras-continuas`)

- Empezó el plan de mejoras continuas: la lista completa de tareas está en `MEJORAS.md`.
- El editor ahora tiene **pruebas automáticas**: 32 revisiones que se ejecutan con `npm test` y
  comprueban que abrir, medir, ajustar, reducir y exportar siguen funcionando. Cada archivo GLB que
  exportan pasa el **validador oficial de glTF** sin errores.
- Hay **3 modelos de ejemplo hechos por código** (un muñeco R15 con 16 huesos y 3 animaciones, una
  malla pesada con textura y un carrito de 8 piezas).
- **Nuevo: “Prueba con un ejemplo”.** En la pantalla inicial hay 3 botones para abrir esos ejemplos
  con un clic y probar todo sin tener modelos propios.
- Si abres un archivo que no es un modelo, o que está dañado, el editor ahora te dice qué pasó y qué
  hacer (por ejemplo, descargarlo otra vez desde Tripo AI).
- Las pruebas automáticas ahora también usan el editor como lo harías tú, en un navegador, en tamaño
  de computadora y de celular: abren los ejemplos, animan, reducen, ajustan y exportan.
- GitHub revisará cada cambio con todas las pruebas (cuando actives Actions; los pasos están en el
  README). La publicación en GitHub Pages ya no sale en rojo si no usas Pages.
- Arreglado: en el celular, al bajar por el panel, el fondo ya no cambia de color a mitad de camino.
- **Nuevo: Deshacer y Rehacer.** Botones ↶ ↷ arriba, o **Ctrl+Z** y **Ctrl+Y** (Cmd en Mac). Funciona
  con todos los ajustes, con “Reducir” y con “Volver al original”. Al pasar el mouse por el botón ves
  qué se va a deshacer.
- **Reducir polígonos ya no congela la página.** Se hace en segundo plano: mientras tanto puedes
  mover la cámara, ves una **barra de avance** y puedes pulsar **Cancelar** (el modelo queda igual).
- El editor arranca un poco más rápido: la herramienta de reducir se carga solo cuando la usas.

## Versión 1

- Abrir modelos `.glb` / `.gltf` (también comprimidos con Draco o Meshopt), con botón o arrastrando.
- Ver el modelo en 3D: girar, acercar, encuadrar, ver la malla y el esqueleto.
- Información: triángulos, medidas en metros y studs, huesos, animaciones y texturas, con aviso del
  límite de triángulos de Roblox.
- Ajustes: escala, altura deseada, giros de 90° y “Centrar y apoyar en el suelo”.
- Reducir polígonos conservando la textura y los pesos de los huesos.
- Reproducir las animaciones que trae el modelo.
- Exportar un `.glb` listo para Roblox Studio y comprobarlo al instante.
