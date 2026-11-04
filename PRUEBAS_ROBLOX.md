# Pruebas en Roblox Studio (y Blender)

Desde la nube no se puede abrir Roblox Studio ni Blender. Aquí está lo que **falta probar a mano**,
con pasos exactos, para que lo pruebes tú o tu Claude local con Roblox Studio conectado.

Cómo anotar el resultado: cambia `[ ]` por `[x]` si funcionó, o escribe debajo **qué pasó**
(captura, mensaje de error, versión de Studio). Así el siguiente ciclo puede arreglarlo.

---

## Cómo conseguir los archivos de prueba

1. Abre el editor (`npm run dev` o la dirección publicada).
2. Abre tu modelo o, cuando exista, un ejemplo con **Probar con un ejemplo**.
3. Haz los cambios que pida la prueba y pulsa **Descargar .glb**.

---

## R-01 · Modelo sin huesos (MeshPart)

- [ ] **Pendiente de probar**
1. En el editor abre un modelo sin esqueleto (por ejemplo, el ejemplo “varias piezas”).
2. Ajusta la altura a **5 studs**, pulsa **Centrar y apoyar en el suelo** y exporta.
3. En Roblox Studio: **Importar 3D** (pestaña *Inicio* o menú *Archivo*), elige el `.glb`.
4. Comprueba en la ventana del importador:
   - ¿Aparece algún aviso o error? Anótalo tal cual.
   - ¿El tamaño es de unos 5 studs de alto?
5. Pulsa **Importar** y comprueba que el modelo aparece en el *Workspace* con sus colores/texturas.

## R-02 · Malla reducida con textura

- [ ] **Pendiente de probar**
1. Abre un modelo pesado de Tripo (más de 20.000 triángulos) y redúcelo a 20.000 en
   **Reducir polígonos**.
2. Exporta con texturas de **1024 px**.
3. Importa en Roblox Studio y comprueba:
   - ¿Lo acepta sin el error de “demasiados triángulos”?
   - ¿La textura se ve bien (sin manchas ni corrida)?

## R-03 · Personaje con huesos y animaciones

- [ ] **Pendiente de probar**
1. Abre un personaje con esqueleto y animaciones (de Tripo con rig, o el muñeco R15 de ejemplo).
2. Exporta con **Incluir animaciones** marcado.
3. En Roblox Studio, importa con **Importar 3D** y revisa:
   - ¿Detecta el esqueleto (aparecen los huesos dentro del modelo)?
   - ¿Aparecen las animaciones? ¿Se reproducen bien o salen giradas/invertidas?
   - ¿La pose de reposo es la correcta?
4. Anota cualquier aviso del importador.

## R-04 · Ajustes del editor guardados en el nodo raíz

- [ ] **Pendiente de probar**
1. Abre un modelo, gíralo 90° en X y cambia la escala a ×2. Exporta.
2. Importa en Roblox Studio y comprueba que el giro y el tamaño se ven igual que en el editor.

## R-05 · Animación agregada desde otro archivo

- [ ] **Pendiente de probar**
1. Abre tu personaje (de Tripo con rig, o el muñeco R15 de ejemplo).
2. En *Animaciones*, pulsa **Agregar animaciones de otro archivo…** y elige un GLB con animación (paso
   T-02). Pulsa **Agregar** y exporta con **Incluir animaciones**.
3. En Roblox Studio, impórtalo con **Importar 3D** y reproduce la animación: ¿se mueve igual que en el
   editor? ¿Brazos y piernas giran hacia el lado correcto? Anota cualquier aviso del importador.

## R-06 · Animaciones creadas con los generadores

- [ ] **Pendiente de probar**
1. Abre tu personaje (de Tripo con rig, o el muñeco R15 de ejemplo).
2. En *Animaciones* → **Crear una animación**, agrega **Caminar**, **Correr**, **Respirar**, **Caer** y
   **Saltar** (este con la altura en 0 %) y exporta con **Incluir animaciones**.
3. En Roblox Studio, impórtalo con **Importar 3D**. En el *Animation Editor*, o con un script que use
   `Animator:LoadAnimation`, comprueba que cada una se repite sin saltos y que el personaje no se
   desplaza (se queda en el lugar). Anota si algún brazo o pierna gira hacia el lado equivocado.
4. Si puedes, reemplaza las animaciones del script *Animate* del personaje (walk, run, idle, jump, fall)
   por estas y juega: ¿se ven bien al caminar, saltar y caer?
5. Agrega también **Saludar**, **Atacar** y **Bailar** y repite el paso 3: ¿se saluda con la mano derecha y el
   golpe va hacia adelante?

## R-07 · Animación hecha a mano con keyframes

- [ ] **Pendiente de probar**
1. Abre tu personaje (de Tripo con rig, o el muñeco R15 de ejemplo).
2. En *Animaciones* → **Crear a mano con keyframes…**: elige *Brazo izquierdo*, pon un keyframe a los
   0 s; mueve el *Momento* a 1 s, sube *Hacia los lados* a 80° y pon otro keyframe. Haz lo mismo con
   *Cabeza* (*Girar* 30° a 1 s). Pulsa **Guardar animación** y exporta con **Incluir animaciones**.
3. En Roblox Studio, impórtalo con **Importar 3D** y reproduce «Mi animación»: ¿el brazo sube hacia el
   costado (no hacia adelante) y la cabeza gira? ¿Pasa por la mitad a los 0,5 s, como en el editor?

---

## Archivos reales de Tripo (no se pueden descargar desde la nube)

### T-01 · Detección de huesos con un personaje de Tripo

- [ ] **Pendiente de probar**
1. En Tripo AI genera un personaje con **esqueleto (rig)** y descárgalo como **GLB**. Si Tripo te deja
   elegir la convención de huesos, prueba primero la que viene por defecto (`tripo`) y, si puedes,
   también `mixamo`.
2. Ábrelo en el editor y mira la sección **Mapa de huesos**: ¿dice **“Mapa completo”** o qué partes
   faltan? ¿Qué dice en *Tipo de esqueleto*?
3. Pulsa **Probar el mapa** y mira la vista 3D: cada vez que el panel dice “Ahora se mueve: «…»”, ¿se
   mueve esa parte del cuerpo? (Ojo: «izquierdo» es el lado izquierdo del personaje, a tu derecha
   cuando te mira de frente.)
4. Si falta algo o se mueve lo que no es, corrígelo en **Ver y corregir cada hueso** (con ▶ ves qué se
   mueve) y anota aquí los nombres de los huesos del archivo que tuviste que elegir a mano, para que
   el detector los aprenda.

### T-02 · Pasar una animación real de Tripo o de Mixamo a tu personaje

- [ ] **Pendiente de probar**
1. Consigue una animación: en Tripo AI, un personaje con rig y una animación (por ejemplo, correr) en GLB;
   o en Mixamo, una animación descargada en **FBX** (ya no hace falta convertirla). Prueba una “In Place” y
   otra sin esa opción.
2. En el editor, abre **tu** personaje y, en *Animaciones*, pulsa **Agregar animaciones de otro archivo…**
   y elige ese GLB.
3. Pulsa **▶ Ver** y mira la vista 3D: ¿los brazos, las piernas y la cabeza se mueven como en la animación
   original? Fíjate en: antebrazos girados de más, pies que se hunden en el piso o flotan, el personaje
   que avanza (si querías que corra en el lugar).
4. Anota aquí qué se ve mal (con una captura si puedes) y de dónde salió la animación (Tripo o Mixamo).
