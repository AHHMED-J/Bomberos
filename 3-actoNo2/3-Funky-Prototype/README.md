# Hito 3 · Funky Prototype: parte multijugador

Primer concepto integrado: el **CFP** (captura rápida del parte) más la
idea rescatada del **Dark Horse** (parte multijugador).

Abre `index.html`. Hay tres teléfonos con un solo parte compartido:
Jefe de turno, Maquinista y Bombero.

1. El jefe presiona **Nuevo parte**; los otros dos ven la invitación y
   presionan **Unirse**. Al unirse aparecen en «Personal de turno».
2. Lo que cualquiera escribe aparece al momento en los otros teléfonos.
3. Cada teléfono muestra dónde está cada quien. En la sección aparecen
   todas las personas que están ahí, con su color, y la barra lateral
   lleva todos esos colores. El campo exacto se marca con un borde y la
   inicial de cada persona; si dos están en el mismo campo se ven los dos
   colores. Nadie bloquea a nadie.
4. Sólo el jefe tiene **Llegada** (hora + lugar), **Regreso** y **Enviar**.
   Los demás tienen **Salir**: dejan el parte y pueden volver a unirse.
5. **Reiniciar** vuelve al inicio.

## Del CFP se conserva

Las secciones y etiquetas del parte, los botones Llegada y Regreso con la
misma lógica de ubicación, las fotos comprimidas y los campos obligatorios.
Los estilos son los del CFP (`../1-CFP/css/cfp.css`).

## Fuera de este prototipo

Los tres teléfonos viven en la misma página: no hay red ni servidor. Es
un concepto para mostrar la interacción, no la sincronización real entre
dispositivos.

## Estructura

    index.html       los tres teléfonos y la plantilla del parte
    css/funky.css    lo propio del multijugador
    js/funky.js      estado compartido, sincronización y presencia
