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
- **Nuevo: Proyectos.** En la sección *Proyecto*, “Guardar proyecto” descarga un archivo
  `nombre.proyecto.glb` con todo tu trabajo (modelo, ajustes y animaciones). Otro día, ábrelo con
  “Abrir proyecto” y sigue donde lo dejaste; los ajustes se pueden seguir quitando.
- **Nuevo: Autoguardado.** Mientras editas, tu trabajo se guarda solo en este navegador. Si cierras
  la pestaña sin querer, al volver verás **“¿Seguimos donde lo dejaste?”** con un botón para
  recuperarlo.
- El editor ya sabe **reconocer los huesos de un personaje** (cadera, brazos, piernas…) aunque cada
  programa los nombre distinto (Mixamo, Roblox R15, Unreal, Unity, VRoid…). Es la base para pasar
  animaciones de un personaje a otro y para crear animaciones (llega en los próximos ciclos).
- Todos los mensajes de error ahora dicen **qué pasó y qué hacer** (y, al final, un detalle técnico
  por si necesitas pedir ayuda). Si escribes un valor que no sirve (por ejemplo, un límite de 5
  triángulos), el editor te dice qué escribir.
- **Nuevo: Mapa de huesos.** Una sección nueva te muestra qué hueso de tu personaje es cada parte del
  cuerpo (cadera, brazos, piernas…) y si falta alguna. Si el editor no reconoce un hueso (pasa con
  nombres raros como `Bone_07`), lo eliges tú de una lista; el hueso elegido se marca en rosa en la
  vista 3D. Con **▶** ves moverse un hueso y con **Probar el mapa** se mueve cada parte por turnos, para
  comprobar que todo está bien. Los cambios se pueden deshacer y se guardan en tu proyecto. Es lo que
  usarán las próximas funciones de animación.
- **Nuevo: Agregar animaciones de otro archivo.** En *Animaciones*, elige un GLB con animación (de Tripo AI
  o de Mixamo convertido, aunque traiga solo la animación sin el cuerpo) y el editor pasa sus movimientos a
  los huesos de tu personaje, aunque los dos esqueletos sean distintos (por ejemplo, de Mixamo a un R15).
  Con **▶ Ver** la ves en tu personaje antes de agregarla; después aparece en la lista, se exporta con
  tu modelo y se puede deshacer.
- **Nuevo: Crear una animación.** En *Animaciones* elige **Caminar**, **Correr** o **Respirar** y ajústala
  con deslizadores (velocidad, largo del paso, balanceo de brazos, inclinación, intensidad). Tu personaje
  la muestra mientras mueves los deslizadores; con **Agregar** queda guardada. Todas quedan “en el
  lugar” (sin avanzar), como las usa Roblox, y se repiten sin saltos.
- **Nuevo: Saltar, Caer y Agacharse** en *Crear una animación*. Al agacharse (o antes de saltar) las
  piernas se doblan sin que los pies se muevan del piso. En **Saltar** puedes poner la altura en 0 % para
  usarla como el salto del jugador en Roblox (el salto de verdad lo hace el juego).
- **Nuevo: Dejar en el lugar.** Si una animación hace avanzar al personaje (como muchas de Mixamo), el
  editor lo avisa (“avanza 1,6 m”) y la deja en el lugar con un botón, como la usa Roblox (el que camina
  es el personaje del juego). Al agregar animaciones de otro archivo, esto viene marcado.
- Arreglado: algunas animaciones agregadas desde otro archivo podían exportarse con dos cuadros en el mismo
  instante al final, y el validador oficial rechazaba el GLB.
- **Nuevo: elegir qué animaciones exportar.** En *Exportar*, debajo de “Incluir animaciones”, marca solo
  las que quieres llevar a Roblox; tu proyecto las sigue guardando todas.
- **Nuevo: animaciones FBX de Mixamo.** “Agregar animaciones de otro archivo” ahora acepta archivos `.fbx`
  (como los que descargas de Mixamo), sin tener que convertirlos antes.

## Versión 1

- Abrir modelos `.glb` / `.gltf` (también comprimidos con Draco o Meshopt), con botón o arrastrando.
- Ver el modelo en 3D: girar, acercar, encuadrar, ver la malla y el esqueleto.
- Información: triángulos, medidas en metros y studs, huesos, animaciones y texturas, con aviso del
  límite de triángulos de Roblox.
- Ajustes: escala, altura deseada, giros de 90° y “Centrar y apoyar en el suelo”.
- Reducir polígonos conservando la textura y los pesos de los huesos.
- Reproducir las animaciones que trae el modelo.
- Exportar un `.glb` listo para Roblox Studio y comprobarlo al instante.
