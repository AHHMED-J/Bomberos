// Definición de campos por interfaz (para el motor genérico de formulario/lista)
// y los datos reales de la investigación de campo, para precargar cada colección.
var Schema = {};

Schema.entrevistas = {
  id: 'entrevistas',
  coleccion: 'entrevistas',
  titulo: 'Entrevista a Expertos',
  campos: [
    { clave: 'alias', etiqueta: 'Alias del experto', tipo: 'text', requerido: true },
    { clave: 'rol', etiqueta: 'Rol', tipo: 'text', requerido: true },
    { clave: 'dominio', etiqueta: 'Dominio', tipo: 'text', requerido: true },
    { clave: 'anios_experiencia', etiqueta: 'Años de experiencia', tipo: 'text', requerido: true },
    { clave: 'organizacion', etiqueta: 'Organización', tipo: 'text', requerido: false },
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'date', requerido: true },
    { clave: 'medio', etiqueta: 'Medio', tipo: 'select', opciones: ['Presencial', 'Remoto'], requerido: true },
    {
      clave: 'guion',
      etiqueta: 'Guion dinámico (pregunta → respuesta)',
      tipo: 'repeater',
      subcampos: [
        { clave: 'pregunta', etiqueta: 'Pregunta', tipo: 'text' },
        { clave: 'respuesta', etiqueta: 'Respuesta', tipo: 'textarea' },
        { clave: 'cita_clave', etiqueta: 'Cita textual clave', tipo: 'checkbox' },
      ],
    },
    { clave: 'mapa_conceptos', etiqueta: 'Mapa: conceptos clave', tipo: 'textarea' },
    { clave: 'mapa_jerga', etiqueta: 'Mapa: jerga del dominio', tipo: 'textarea' },
    { clave: 'mapa_dependencias', etiqueta: 'Mapa: dependencias entre componentes', tipo: 'textarea' },
    { clave: 'mapa_actores', etiqueta: 'Mapa: actores del ecosistema', tipo: 'textarea' },
    { clave: 'restricciones', etiqueta: 'Restricciones y riesgos técnicos', tipo: 'textarea' },
    { clave: 'referencias', etiqueta: 'Referencias / fuentes recomendadas', tipo: 'textarea' },
    { clave: 'notas', etiqueta: 'Notas y siguientes pasos', tipo: 'textarea' },
  ],
  columnasLista: ['alias', 'rol', 'fecha', 'medio'],
  seed: [
    {
      alias: 'Sesión conjunta: Capitán González, Maquinista Ortega, Bombero Carrillo',
      rol: 'Capitán / Maquinista / Bombero',
      dominio: 'Operación y administración de un cuerpo de bomberos',
      anios_experiencia: '32 / 25 / 15',
      organizacion: 'H. Cuerpo de Bomberos de Ensenada',
      fecha: '2026-09-19',
      medio: 'Presencial',
      guion: [
        { pregunta: '¿Cómo es el proceso desde que alguien llama al 911 hasta que la emergencia termina?', respuesta: 'La llamada entra al C5 y se deriva al radiooperador, que despacha la unidad según el tipo de evento. El cierre se reporta de vuelta al 911.', cita_clave: true },
        { pregunta: '¿Cómo es la jerarquía y cómo se reparten los roles?', respuesta: 'Encargado de turno con mando directo; jefe de batallón por turno (A-D) en 8-9 estaciones; bomberos en campo, maquinista opera la unidad.', cita_clave: false },
        { pregunta: '¿Qué tipo de papeleo tienen que elaborar?', respuesta: 'Parte de novedades, hoja de incidente, listas de asistencia, revisión mecánica y FRAP.', cita_clave: true },
        { pregunta: '¿Conviene dejar ese papeleo en físico o en digital?', respuesta: 'Resguardo mixto: el archivo físico funciona como amparo por si dirección restringe el acceso.', cita_clave: true },
        { pregunta: '¿Y la bitácora, en físico o en digital?', respuesta: 'La bitácora es control interno de estación; la hoja de incidente sí va a dirección.', cita_clave: false },
        { pregunta: '¿Qué son las "notas" y tienen un formato específico?', respuesta: 'Reportes de fallas mecánicas o de conducta, sin formato rígido.', cita_clave: false },
        { pregunta: '¿Qué problemas detectan en el proceso actual?', respuesta: 'Formatos sin fundamento normativo citado; retención legal obligatoria de 10 años.', cita_clave: true },
        { pregunta: '¿Cómo se beneficiarían las divisiones de una plataforma digital?', respuesta: 'Elimina el doble trabajo de WhatsApp + transcripción manual, y ahorra POA en papel/tinta.', cita_clave: true },
        { pregunta: '¿Se les facilitaría más el celular, la tablet o la computadora?', respuesta: 'Sería práctico operar en cualquiera de los tres; no descartan ninguno.', cita_clave: false },
        { pregunta: '¿Quién revisa los partes según su rango?', respuesta: 'Jefes de batallón, jefe operativo y coordinadores de cada área.', cita_clave: false },
      ],
      mapa_conceptos: 'C5 (centro de control), NUC (Número Único de Caso), FRAP, POA, equipo de respiración autónoma, revisión mecánica.',
      mapa_jerga: 'parte de novedades, hoja de incidente, bitácora, encargado de turno, jefe de batallón, maquinista, amparo.',
      mapa_dependencias: '911 → C5 → radiooperador → división → unidad → cierre reportado al 911. En paralelo: WhatsApp informal → transcripción manual (el doble trabajo).',
      mapa_actores: 'C5/911, radiooperador, jefe de batallón, Director, Subdirector, capitán, bomberos, maquinista, paramédicos, Cruz Roja, Seguridad Pública, fiscalía, sindicatura.',
      restricciones: 'No puede ser 100% digital sin respaldo físico o exportable. Retención legal de 10 años. Permisos deben reflejar jerarquía real (4 turnos × 8-9 estaciones × 7 divisiones).',
      referencias: 'No se mencionaron documentos específicos; pendiente para una siguiente sesión.',
      notas: 'Profundizar en los campos exactos de las 4-5 hojas diarias. El Maquinista Ortega es candidato a un perfil de usuario extremo propio.',
    },
  ],
};

Schema.extremos = {
  id: 'extremos',
  coleccion: 'extremos',
  titulo: 'Usuarios Extremos',
  campos: [
    { clave: 'alias', etiqueta: 'Alias', tipo: 'text', requerido: true },
    { clave: 'clasificacion', etiqueta: 'Clasificación', tipo: 'select', opciones: ['Súper-experto', 'Inexperto', 'Mainstream'], requerido: true },
    { clave: 'contexto_frecuencia', etiqueta: 'Contexto y frecuencia de uso', tipo: 'textarea', requerido: true },
    { clave: 'nivel_habilidad', etiqueta: 'Nivel de habilidad (1-10)', tipo: 'number', requerido: true },
    {
      clave: 'tareas',
      etiqueta: 'Tareas observadas',
      tipo: 'repeater',
      subcampos: [{ clave: 'tarea', etiqueta: 'Tarea', tipo: 'text' }],
    },
    {
      clave: 'workarounds',
      etiqueta: 'Workarounds / adaptaciones manuales',
      tipo: 'repeater',
      subcampos: [{ clave: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea' }],
    },
    { clave: 'fricciones', etiqueta: 'Errores o fricciones que amplifica', tipo: 'textarea' },
    { clave: 'necesidad_extrema', etiqueta: 'Necesidad extrema detectada', tipo: 'textarea', requerido: true },
    { clave: 'hipotesis', etiqueta: 'Hipótesis de generalización al usuario promedio', tipo: 'textarea' },
    {
      clave: 'evidencia',
      etiqueta: 'Evidencia',
      tipo: 'repeater',
      subcampos: [
        { clave: 'tipo', etiqueta: 'Tipo', tipo: 'select', opciones: ['Enlace', 'Foto', 'Marca de tiempo'] },
        { clave: 'valor', etiqueta: 'Valor', tipo: 'text' },
      ],
    },
  ],
  columnasLista: ['alias', 'clasificacion', 'nivel_habilidad'],
  seed: [
    {
      alias: 'Capitán Mauricio Javier González Navarro',
      clasificacion: 'Súper-experto',
      contexto_frecuencia: 'Capitán, 32 años de experiencia (27 de servicio + 5 como voluntario) — supervisa y valida el papeleo de su división de forma constante.',
      nivel_habilidad: 9,
      tareas: [
        { tarea: 'Supervisa/valida el papeleo generado por turno (4-5 hojas diarias)' },
        { tarea: 'Aplica el criterio de qué se resguarda en físico vs. qué se reporta a dirección' },
        { tarea: 'Identifica qué información es legalmente relevante (NUC, fiscalía) vs. control interno' },
      ],
      workarounds: [
        { descripcion: 'El atajo de WhatsApp: el personal envía la información informal y después la transcribe a mano.' },
        { descripcion: 'Resguardo mixto por desconfianza institucional: guardan copia física aunque exista app.' },
      ],
      fricciones: 'Por su rol de supervisión, amplifica el "doble trabajo" multiplicado por todo su turno y división.',
      necesidad_extrema: 'Un sistema que sea al menos tan rápido como WhatsApp, porque quien más papeleo supervisa es quien más rápido nota cuando el sistema formal no da abasto.',
      hipotesis: 'Si el sistema es lo bastante rápido para que un capitán deje el atajo, también le alcanza de sobra al bombero operativo promedio.',
      evidencia: [{ tipo: 'Marca de tiempo', valor: 'Sesión de campo, sábado 19 de septiembre de 2026, presencial en la estación' }],
    },
  ],
};

Schema.needfinding = {
  id: 'needfinding',
  coleccion: 'needfinding',
  titulo: 'Observación Directa / Needfinding',
  campos: [
    { clave: 'lugar', etiqueta: 'Lugar', tipo: 'text', requerido: true },
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'date', requerido: true },
    { clave: 'duracion', etiqueta: 'Duración', tipo: 'text' },
    { clave: 'actividad', etiqueta: 'Actividad observada', tipo: 'text', requerido: true },
    {
      clave: 'obvias',
      etiqueta: 'Necesidades obvias (superficie)',
      tipo: 'repeater',
      subcampos: [{ clave: 'texto', etiqueta: 'Necesidad', tipo: 'text' }],
    },
    {
      clave: 'ocultas',
      etiqueta: 'Necesidades ocultas (profundidad)',
      tipo: 'repeater',
      subcampos: [{ clave: 'texto', etiqueta: 'Necesidad', tipo: 'text' }],
    },
    { clave: 'dato_crudo', etiqueta: 'Dato crudo observado', tipo: 'textarea', requerido: true },
    { clave: 'interpretacion', etiqueta: 'Interpretación / inferencia', tipo: 'textarea', requerido: true },
    { clave: 'potencial', etiqueta: 'Potencial de innovación', tipo: 'select', opciones: ['Bajo', 'Alto'], requerido: true },
  ],
  columnasLista: ['actividad', 'fecha', 'potencial'],
  seed: [
    {
      lugar: 'Estación de bomberos, Ensenada',
      fecha: '2026-09-19',
      duracion: 'Sesión grupal (sin duración exacta registrada)',
      actividad: 'Entrevista grupal + encuesta al personal operativo (7 respuestas)',
      obvias: [
        { texto: 'Llenar el reporte en tiempo real desde el lugar del incidente' },
        { texto: 'Que la app funcione en celular, tablet o computadora' },
        { texto: 'Reducir el gasto en papel, tinta e impresoras' },
        { texto: 'Enviar novedades e imágenes directo a los mandos' },
        { texto: 'Letras grandes, iconos' },
      ],
      ocultas: [
        { texto: 'Necesita sentir que no pierde el control de su información si dirección restringe el acceso' },
        { texto: 'Necesita que el sistema reconozca la jerarquía real (4 turnos × 8-9 estaciones × 7 divisiones)' },
        { texto: 'El canal informal (WhatsApp) ya es más rápido y confiable que el proceso formal' },
        { texto: '71.4% de las estaciones no tiene computadora compartida: el celular no siempre es preferencia, a veces es la única opción' },
      ],
      dato_crudo: '"Se generan entre 4 y 5 hojas diarias por turno." / 71.4% de los encuestados dijo que su estación no tiene computadora compartida.',
      interpretacion: 'Un sistema que sólo digitalice una hoja no resuelve el problema completo. Diseñar "celular o computadora" como opciones equivalentes es engañoso.',
      potencial: 'Alto',
    },
  ],
};

// Empathy Map: dos colecciones (fragmentos crudos y insights estructurados).
Schema.empathyFragmentos = {
  id: 'empathy_fragmentos',
  coleccion: 'empathy_fragmentos',
  titulo: 'Bandeja de ruido cualitativo',
  campos: [
    { clave: 'texto', etiqueta: 'Fragmento (cita o comportamiento)', tipo: 'textarea', requerido: true },
    { clave: 'cuadrante', etiqueta: 'Cuadrante', tipo: 'select', opciones: ['Dice', 'Hace', 'Piensa', 'Siente'], requerido: true },
  ],
  columnasLista: ['texto', 'cuadrante'],
  seed: [
    { texto: 'El archivo físico funciona como amparo… en caso de que la dirección restrinja el acceso al sistema.', cuadrante: 'Dice' },
    { texto: 'Se generan entre 4 y 5 hojas diarias por turno.', cuadrante: 'Dice' },
    { texto: 'Por tiempos.', cuadrante: 'Dice' },
    { texto: 'Por que todo mundo lo utiliza.', cuadrante: 'Dice' },
    { texto: 'El móvil es más práctico y tenemos acceso todo el tiempo.', cuadrante: 'Dice' },
    { texto: 'Letras grandes, iconos.', cuadrante: 'Dice' },
    { texto: 'Envía la información por WhatsApp de manera informal y después la transcribe a mano (doble trabajo).', cuadrante: 'Hace' },
    { texto: 'Guarda copia física o escaneada como respaldo aunque exista una versión digital.', cuadrante: 'Hace' },
    { texto: 'Llena el parte en cualquier tiempo muerto del turno.', cuadrante: 'Hace' },
    { texto: 'En la mayoría de las estaciones (71.4%) no tiene computadora compartida a la que recurrir.', cuadrante: 'Hace' },
    { texto: 'El sistema digital no sustituye del todo al papel — lo ve como una capa adicional mientras no confíe en dirección.', cuadrante: 'Piensa' },
    { texto: 'El papeleo actual es más carga administrativa que parte esencial del trabajo.', cuadrante: 'Piensa' },
    { texto: 'El celular no es sólo la opción que prefiere: en muchas estaciones es la única opción real.', cuadrante: 'Piensa' },
    { texto: 'Frustración media-alta por el doble trabajo WhatsApp → transcripción manual.', cuadrante: 'Siente' },
    { texto: 'Cautela / desconfianza institucional, no tecnológica, ante depender 100% de un sistema digital.', cuadrante: 'Siente' },
  ],
};

Schema.empathyInsights = {
  id: 'empathy_insights',
  coleccion: 'empathy_insights',
  titulo: 'Insights estructurados',
  campos: [
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'select', opciones: ['Problema de usabilidad', 'Necesidad oculta', 'Carga cognitiva', 'Adaptación manual', 'Innovación potencial'], requerido: true },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', requerido: true },
    { clave: 'prioridad', etiqueta: 'Prioridad', tipo: 'select', opciones: ['Baja', 'Media', 'Alta'], requerido: true },
  ],
  columnasLista: ['tipo', 'descripcion', 'prioridad'],
  seed: [
    { tipo: 'Adaptación manual', descripcion: '"Doble trabajo" WhatsApp → transcripción manual en la estación', prioridad: 'Alta' },
    { tipo: 'Necesidad oculta', descripcion: 'Desconfianza institucional/jerárquica detrás del pedido de respaldo físico', prioridad: 'Media' },
    { tipo: 'Necesidad oculta', descripcion: '71.4% de las estaciones no tiene computadora compartida', prioridad: 'Alta' },
    { tipo: 'Carga cognitiva', descripcion: '4-5 formatos distintos por turno sin unificar', prioridad: 'Alta' },
    { tipo: 'Necesidad oculta', descripcion: 'Formatos actuales sin fundamento normativo citado', prioridad: 'Media' },
    { tipo: 'Problema de usabilidad', descripcion: 'Texto pequeño, dificulta lectura a personal de mayor edad', prioridad: 'Alta' },
    { tipo: 'Innovación potencial', descripcion: 'Permisos diferenciados por rango/división real', prioridad: 'Alta' },
  ],
};

// Roper Dynagram: segmentos + personas asignadas a cada segmento.
Schema.roperSegmentos = {
  id: 'roper_segmentos',
  coleccion: 'roper_segmentos',
  titulo: 'Segmentos',
  campos: [
    { clave: 'nombre', etiqueta: 'Nombre del segmento', tipo: 'text', requerido: true },
    { clave: 'valores', etiqueta: 'Valores asociados', tipo: 'textarea', requerido: true },
  ],
  columnasLista: ['nombre', 'valores'],
  seed: [
    { nombre: 'Prácticos de tiempo', valores: 'Eficiencia, rapidez, disponibilidad, practicidad' },
    { nombre: 'Institucionales / orden y control', valores: 'Seguridad, legalidad, control del entorno' },
    { nombre: 'Conformistas sociales', valores: 'Pertenencia, seguir la norma del grupo' },
  ],
};

Schema.roperPersonas = {
  id: 'roper_personas',
  coleccion: 'roper_personas',
  titulo: 'Personas asignadas',
  campos: [
    { clave: 'persona', etiqueta: 'Persona', tipo: 'text', requerido: true },
    { clave: 'segmento', etiqueta: 'Segmento', tipo: 'select', opcionesDe: 'roper_segmentos', requerido: true },
    { clave: 'evidencia', etiqueta: 'Evidencia', tipo: 'textarea', requerido: true },
  ],
  columnasLista: ['persona', 'segmento'],
  seed: [
    { persona: 'Encuestado 1 (anónimo)', segmento: 'Prácticos de tiempo', evidencia: '"Por disponibilidad"' },
    { persona: 'Encuestado 2 (anónimo)', segmento: 'Prácticos de tiempo', evidencia: '"El móvil es más práctico y tenemos acceso todo el tiempo"' },
    { persona: 'Encuestado 3 (anónimo)', segmento: 'Conformistas sociales', evidencia: '"Por que todo mundo lo utiliza"' },
    { persona: 'Encuestado 4 (anónimo)', segmento: 'Prácticos de tiempo', evidencia: '"sería más rápido en el móvil"' },
    { persona: 'Encuestado 5 (anónimo)', segmento: 'Prácticos de tiempo', evidencia: '"más fácil… reducir el tiempo… reducción de papel"' },
    { persona: 'Encuestado 6 (anónimo)', segmento: 'Institucionales / orden y control', evidencia: '"tranquilo controlado y ordenado…"' },
    { persona: 'Encuestado 7 (anónimo)', segmento: 'Prácticos de tiempo', evidencia: '"Por tiempos"' },
    { persona: 'Capitán González', segmento: 'Institucionales / orden y control', evidencia: 'Retención legal, sindicatura, POA, resguardo físico' },
    { persona: 'Maquinista Ortega', segmento: 'Prácticos de tiempo', evidencia: 'Sesión conjunta — el eje de velocidad/atajo de WhatsApp es el más apoyado por el grupo' },
    { persona: 'Bombero Carrillo', segmento: 'Prácticos de tiempo', evidencia: 'Sesión conjunta — mismo eje que el grupo' },
  ],
};

// Mapeo de Requerimientos (obligatoria): insight → requisito → prioridad → estado,
// con "eje" para agrupar la ley embebida de recálculo.
Schema.requisitos = {
  id: 'requisitos',
  coleccion: 'requisitos',
  titulo: 'Mapeo de Requerimientos',
  campos: [
    { clave: 'insight', etiqueta: 'Insight', tipo: 'textarea', requerido: true },
    { clave: 'requisito_funcional', etiqueta: 'Requisito funcional', tipo: 'textarea', requerido: true },
    { clave: 'requisito_ux', etiqueta: 'Requisito UX / no funcional', tipo: 'textarea' },
    { clave: 'eje', etiqueta: 'Eje', tipo: 'select', opciones: ['Velocidad', 'Confianza', 'Permisos', 'Accesibilidad'], requerido: true },
    { clave: 'prioridad', etiqueta: 'Prioridad (0-100)', tipo: 'number', requerido: true },
    { clave: 'estado', etiqueta: 'Estado de validación', tipo: 'text', requerido: true },
    { clave: 'decision_arquitectura', etiqueta: 'Decisión de arquitectura', tipo: 'textarea' },
  ],
  columnasLista: ['insight', 'eje', 'prioridad', 'estado'],
  seed: [
    { insight: '"Doble trabajo" WhatsApp → transcripción manual', requisito_funcional: 'Captura del reporte en tiempo real desde el sitio del incidente, con envío directo a los mandos', requisito_ux: 'Debe tomar igual o menos pasos que mandar un WhatsApp', eje: 'Velocidad', prioridad: 90, estado: 'Validado en entrevista', decision_arquitectura: 'Formulario de un solo paso con autoguardado cada 30s' },
    { insight: 'Desconfianza institucional / necesidad de amparo físico', requisito_funcional: 'Exportar o generar automáticamente una copia imprimible (PDF) de cada reporte', requisito_ux: 'El respaldo se genera solo, sin pasos extra', eje: 'Confianza', prioridad: 55, estado: 'Validado en entrevista', decision_arquitectura: 'Job asíncrono que sella el PDF al validar el reporte' },
    { insight: '4-5 formatos distintos por turno sin unificar', requisito_funcional: 'Un solo flujo digital que cubra los distintos tipos de documento de una salida', requisito_ux: 'Evitar cambiar de pantalla o repetir datos', eje: 'Velocidad', prioridad: 85, estado: 'Validado; falta confirmar con más usuarios', decision_arquitectura: 'Un solo modelo de datos "reporte" con subtipo' },
    { insight: 'Formatos actuales sin fundamento normativo citado', requisito_funcional: 'Campo opcional de referencia a artículo/reglamento aplicable', requisito_ux: 'No obligatorio', eje: 'Confianza', prioridad: 45, estado: 'Señalado, sin validar', decision_arquitectura: 'Campo de texto libre + catálogo opcional' },
    { insight: 'Permisos diferenciados por rango/división real', requisito_funcional: 'Control de acceso por rol: sólo perfiles autorizados validan reportes de su división', requisito_ux: 'Roles deben reflejar turno + estación + división', eje: 'Permisos', prioridad: 88, estado: 'Validado en entrevista', decision_arquitectura: 'Tabla de permisos por (usuario, división, rol)' },
    { insight: 'Preferencia de dispositivo — no descartan computadora fija', requisito_funcional: 'Diseño responsivo, igual de funcional en celular, tablet y computadora', requisito_ux: '—', eje: 'Velocidad', prioridad: 40, estado: 'Contrasta con la encuesta', decision_arquitectura: 'CSS responsivo sin vista exclusiva de escritorio' },
    { insight: '"Letras grandes, iconos" (encuesta)', requisito_funcional: 'Tipografía e iconografía más grande en toda la interfaz', requisito_ux: 'Prioriza accesibilidad para personal de mayor edad', eje: 'Accesibilidad', prioridad: 95, estado: 'Validado — ya implementado', decision_arquitectura: 'Tokens de tipografía a 24px base' },
    { insight: 'Retención legal de 10 años antes de destrucción', requisito_funcional: 'Archivo de cada reporte por al menos 10 años, con proceso de baja controlado', requisito_ux: 'Almacenamiento y trazabilidad de largo plazo', eje: 'Confianza', prioridad: 80, estado: 'Señalado, sin validar', decision_arquitectura: 'Columna resguardo_hasta + job de archivado' },
    { insight: 'Sistema al menos tan rápido como el atajo de WhatsApp', requisito_funcional: 'Tiempo de captura de un parte nuevo bajo un umbral medible', requisito_ux: 'Se valida con pruebas de tiempo, no sólo opinión', eje: 'Velocidad', prioridad: 92, estado: 'Validado en usuario extremo', decision_arquitectura: 'Métrica de tiempo de captura instrumentada en el cliente' },
    { insight: '71.4% de la encuesta: su estación no tiene computadora compartida', requisito_funcional: 'La app debe ser 100% funcional sólo con celular', requisito_ux: 'Ningún flujo puede requerir pasar por una computadora', eje: 'Velocidad', prioridad: 93, estado: 'Validado en encuesta', decision_arquitectura: 'Cero dependencias de mouse/teclado físico en el flujo crítico' },
  ],
};

Schema.listaGeneral = [Schema.entrevistas, Schema.extremos, Schema.needfinding];
