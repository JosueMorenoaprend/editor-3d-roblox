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
