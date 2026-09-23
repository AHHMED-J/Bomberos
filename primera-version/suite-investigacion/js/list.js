// Lista genérica: tabla con las columnas que pida el esquema, y botones editar/borrar.
var Lista = (() => {
  function recortar(texto, max) {
    const t = String(texto == null ? '' : texto);
    return t.length > max ? t.slice(0, max) + '…' : t;
  }

  function celdaTexto(valor) {
    if (Array.isArray(valor)) return recortar(valor.length + ' elemento(s)', 60);
    return recortar(valor, 80);
  }

  // onEditar(id), onBorrar(id) — callbacks del contenedor que sabe re-pintar.
  function construir(schema, registros, onEditar, onBorrar) {
    const wrap = document.createElement('div');
    wrap.className = 'lista-wrap';

    if (!registros.length) {
      const vacio = document.createElement('p');
      vacio.className = 'lista-vacia';
      vacio.textContent = 'No hay registros todavía. Crea el primero con el formulario de arriba.';
      wrap.appendChild(vacio);
      return wrap;
    }

    const tabla = document.createElement('table');
    tabla.className = 'tabla-lista';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    schema.columnasLista.forEach((col) => {
      const th = document.createElement('th');
      const campo = schema.campos.find((c) => c.clave === col);
      th.textContent = campo ? campo.etiqueta : col;
      trh.appendChild(th);
    });
    const thAcciones = document.createElement('th');
    thAcciones.textContent = 'Acciones';
    trh.appendChild(thAcciones);
    thead.appendChild(trh);
    tabla.appendChild(thead);

    const tbody = document.createElement('tbody');
    registros.forEach((r) => {
      const tr = document.createElement('tr');
      schema.columnasLista.forEach((col) => {
        const td = document.createElement('td');
        td.textContent = celdaTexto(r[col]);
        tr.appendChild(td);
      });
      const tdAcc = document.createElement('td');
      tdAcc.className = 'celda-acciones';
      const btnEditar = document.createElement('button');
      btnEditar.type = 'button';
      btnEditar.className = 'btn-icono';
      btnEditar.textContent = 'Editar';
      btnEditar.addEventListener('click', () => onEditar(r.id));
      const btnBorrar = document.createElement('button');
      btnBorrar.type = 'button';
      btnBorrar.className = 'btn-icono btn-peligro';
      btnBorrar.textContent = 'Borrar';
      btnBorrar.addEventListener('click', () => {
        if (confirm('¿Borrar este registro? No se puede deshacer.')) onBorrar(r.id);
      });
      tdAcc.appendChild(btnEditar);
      tdAcc.appendChild(btnBorrar);
      tr.appendChild(tdAcc);
      tbody.appendChild(tr);
    });
    tabla.appendChild(tbody);
    wrap.appendChild(tabla);
    return wrap;
  }

  return { construir };
})();
