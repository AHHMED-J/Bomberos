// Páginas: arman formulario + lista + export para un esquema, y las tres
// páginas especiales (Empathy Map, Roper Dynagram, Mapeo de Requerimientos)
// que además dibujan su visualización y, en Requisitos, aplican la "ley embebida".
var Paginas = (() => {
  // Bloque reutilizable: título + botón exportar + formulario (oculto hasta crear/editar) + lista.
  // alRepintar() se llama después de cada cambio, para que quien la use (Empathy, Roper)
  // pueda refrescar su visualización también. alGuardarExtra(idGuardado) corre justo
  // después de Store.crear/editar y ANTES de repintar la lista — la usa Requisitos
  // para aplicar la "ley embebida" y que la lista ya muestre las prioridades recalculadas.
  function bloqueCRUD(schema, alRepintar, alGuardarExtra) {
    const seccion = document.createElement('section');
    seccion.className = 'bloque-crud';

    const cab = document.createElement('div');
    cab.className = 'bloque-cab';
    const h3 = document.createElement('h3');
    h3.textContent = schema.titulo;
    cab.appendChild(h3);

    const botones = document.createElement('div');
    botones.className = 'bloque-botones';
    const btnNuevo = document.createElement('button');
    btnNuevo.type = 'button';
    btnNuevo.className = 'btn-primario';
    btnNuevo.textContent = '+ Nuevo registro';
    const btnJSON = document.createElement('button');
    btnJSON.type = 'button';
    btnJSON.className = 'btn-secundario';
    btnJSON.textContent = 'Exportar JSON';
    const btnCSV = document.createElement('button');
    btnCSV.type = 'button';
    btnCSV.className = 'btn-secundario';
    btnCSV.textContent = 'Exportar CSV';
    botones.appendChild(btnNuevo);
    botones.appendChild(btnJSON);
    botones.appendChild(btnCSV);
    cab.appendChild(botones);
    seccion.appendChild(cab);

    const zonaForm = document.createElement('div');
    zonaForm.className = 'zona-form';
    seccion.appendChild(zonaForm);

    const zonaLista = document.createElement('div');
    seccion.appendChild(zonaLista);

    function repintarLista() {
      zonaLista.innerHTML = '';
      zonaLista.appendChild(
        Lista.construir(
          schema,
          Store.listar(schema.coleccion),
          (id) => mostrarForm(Store.obtener(schema.coleccion, id)),
          (id) => {
            Store.borrar(schema.coleccion, id);
            repintarLista();
            if (alRepintar) alRepintar();
          }
        )
      );
    }

    function mostrarForm(registro) {
      zonaForm.innerHTML = '';
      const form = Formulario.construir(
        schema,
        registro,
        (datos) => {
          const guardado = registro
            ? Store.editar(schema.coleccion, registro.id, datos)
            : Store.crear(schema.coleccion, datos);
          if (alGuardarExtra) alGuardarExtra(guardado.id);
          zonaForm.innerHTML = '';
          repintarLista();
          if (alRepintar) alRepintar();
        },
        () => (zonaForm.innerHTML = '')
      );
      zonaForm.appendChild(form);
    }

    btnNuevo.addEventListener('click', () => mostrarForm(null));
    btnJSON.addEventListener('click', () => Exportar.aJSON(schema.coleccion, Store.listar(schema.coleccion)));
    btnCSV.addEventListener('click', () => Exportar.aCSV(schema.coleccion, Store.listar(schema.coleccion)));

    repintarLista();
    return seccion;
  }

  function paginaGenerica(schema) {
    const cont = document.createElement('div');
    cont.className = 'pagina';
    const h2 = document.createElement('h2');
    h2.textContent = schema.titulo;
    cont.appendChild(h2);
    cont.appendChild(bloqueCRUD(schema));
    return cont;
  }

  function paginaEmpathy() {
    const cont = document.createElement('div');
    cont.className = 'pagina';
    const h2 = document.createElement('h2');
    h2.textContent = 'Empathy Map — "The Parser"';
    cont.appendChild(h2);

    const vizWrap = document.createElement('div');
    vizWrap.className = 'viz-wrap';
    const h3viz = document.createElement('h3');
    h3viz.textContent = 'Cuadrícula 2×2 (se recalcula sola)';
    vizWrap.appendChild(h3viz);
    const cuadricula = document.createElement('div');
    vizWrap.appendChild(cuadricula);
    cont.appendChild(vizWrap);

    function repintarViz() {
      Charts.cuadriculaEmpathy(cuadricula);
    }
    repintarViz();

    cont.appendChild(bloqueCRUD(Schema.empathyFragmentos, repintarViz));
    cont.appendChild(bloqueCRUD(Schema.empathyInsights));
    return cont;
  }

  function paginaRoper() {
    const cont = document.createElement('div');
    cont.className = 'pagina';
    const h2 = document.createElement('h2');
    h2.textContent = 'Roper Dynagram — segmentación por valores';
    cont.appendChild(h2);

    const vizWrap = document.createElement('div');
    vizWrap.className = 'viz-wrap';
    const h3viz = document.createElement('h3');
    h3viz.textContent = 'Rueda de segmentos (se recalcula sola)';
    vizWrap.appendChild(h3viz);
    const rueda = document.createElement('div');
    vizWrap.appendChild(rueda);
    cont.appendChild(vizWrap);

    function repintarViz() {
      Charts.ruedaRoper(rueda);
    }
    repintarViz();

    cont.appendChild(bloqueCRUD(Schema.roperSegmentos, repintarViz));
    cont.appendChild(bloqueCRUD(Schema.roperPersonas, repintarViz));
    return cont;
  }

  // "Ley embebida": al guardar un requisito, los demás de su mismo eje se
  // reparten proporcionalmente para que la suma de prioridades del eje se
  // mantenga constante (300) — subir uno baja automáticamente a los otros.
  const SUMA_OBJETIVO_POR_EJE = 300;
  function aplicarLeyEmbebida(idGuardado) {
    const todos = Store.listar('requisitos');
    const guardado = todos.find((r) => r.id === idGuardado);
    if (!guardado) return;
    const mismoEje = todos.filter((r) => r.eje === guardado.eje && r.id !== idGuardado);
    if (!mismoEje.length) return;

    const restante = Math.max(SUMA_OBJETIVO_POR_EJE - guardado.prioridad, 0);
    const sumaActualOtros = mismoEje.reduce((acc, r) => acc + (r.prioridad || 0), 0) || 1;
    mismoEje.forEach((r) => {
      const proporcion = (r.prioridad || 0) / sumaActualOtros;
      const nuevaPrioridad = Math.round(restante * proporcion);
      Store.editar('requisitos', r.id, { prioridad: nuevaPrioridad });
    });
  }

  function paginaRequisitos() {
    const cont = document.createElement('div');
    cont.className = 'pagina';
    const h2 = document.createElement('h2');
    h2.textContent = 'Mapeo de Requerimientos (obligatoria)';
    cont.appendChild(h2);

    const nota = document.createElement('p');
    nota.className = 'nota-ley';
    nota.textContent =
      '"Ley embebida": cada eje (Velocidad, Confianza, Permisos, Accesibilidad) mantiene una suma de prioridad fija. ' +
      'Si subes la prioridad de un requisito, los demás de su mismo eje bajan solos, proporcionalmente, al guardar.';
    cont.appendChild(nota);

    const toggleWrap = document.createElement('div');
    const btnToggle = document.createElement('button');
    btnToggle.type = 'button';
    btnToggle.className = 'btn-secundario';
    btnToggle.textContent = 'Ver trazabilidad (insight → requisito → decisión)';
    toggleWrap.appendChild(btnToggle);
    cont.appendChild(toggleWrap);

    const zonaTrazabilidad = document.createElement('div');
    zonaTrazabilidad.className = 'trazabilidad oculto';
    cont.appendChild(zonaTrazabilidad);

    function repintarTrazabilidad() {
      zonaTrazabilidad.innerHTML = '';
      Store.listar('requisitos').forEach((r) => {
        const fila = document.createElement('div');
        fila.className = 'traza-fila';
        fila.innerHTML =
          '<strong>' + escaparHTML(r.insight) + '</strong>' +
          ' <span class="traza-flecha">→</span> ' +
          escaparHTML(r.requisito_funcional) +
          ' <span class="traza-flecha">→</span> ' +
          '<em>' + escaparHTML(r.decision_arquitectura || 'sin decisión registrada') + '</em>' +
          ' <span class="traza-prioridad">prioridad: ' + r.prioridad + '</span>';
        zonaTrazabilidad.appendChild(fila);
      });
    }

    btnToggle.addEventListener('click', () => {
      const oculto = zonaTrazabilidad.classList.toggle('oculto');
      if (!oculto) repintarTrazabilidad();
    });

    // bloqueCRUD normal: alGuardarExtra aplica la ley embebida ANTES de que
    // la lista se repinte, así que ya se ve con las prioridades recalculadas.
    const schema = Schema.requisitos;
    const seccion = bloqueCRUD(
      schema,
      () => {
        if (!zonaTrazabilidad.classList.contains('oculto')) repintarTrazabilidad();
      },
      (idGuardado) => aplicarLeyEmbebida(idGuardado)
    );

    cont.appendChild(seccion);
    return cont;
  }

  function escaparHTML(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }

  return { paginaGenerica, paginaEmpathy, paginaRoper, paginaRequisitos };
})();
