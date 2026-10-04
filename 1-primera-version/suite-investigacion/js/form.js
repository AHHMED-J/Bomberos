// Formulario genérico: crea inputs a partir de un esquema, valida campos requeridos
// y soporta campos "repeater" (listas dinámicas dentro del registro).
var Formulario = (() => {
  function opcionesPara(campo) {
    if (campo.opciones) return campo.opciones;
    if (campo.opcionesDe) {
      return Store.listar(campo.opcionesDe).map((r) => r.nombre || r.persona || r.alias);
    }
    return [];
  }

  function crearInput(campo, valor) {
    const v = valor === undefined || valor === null ? '' : valor;
    if (campo.tipo === 'textarea') {
      const el = document.createElement('textarea');
      el.rows = 3;
      el.value = v;
      return el;
    }
    if (campo.tipo === 'select') {
      const el = document.createElement('select');
      const vacio = document.createElement('option');
      vacio.value = '';
      vacio.textContent = '— elegir —';
      el.appendChild(vacio);
      opcionesPara(campo).forEach((op) => {
        const o = document.createElement('option');
        o.value = op;
        o.textContent = op;
        if (op === v) o.selected = true;
        el.appendChild(o);
      });
      return el;
    }
    if (campo.tipo === 'checkbox') {
      const el = document.createElement('input');
      el.type = 'checkbox';
      el.checked = !!v;
      return el;
    }
    const el = document.createElement('input');
    el.type = campo.tipo === 'number' ? 'number' : campo.tipo === 'date' ? 'date' : 'text';
    el.value = v;
    return el;
  }

  function valorDeInput(campo, el) {
    if (campo.tipo === 'checkbox') return el.checked;
    if (campo.tipo === 'number') return el.value === '' ? null : Number(el.value);
    return el.value;
  }

  // Renderiza un campo repeater: tabla de filas, cada una con sus subcampos,
  // más un botón para agregar fila y una "×" por fila para quitarla.
  function crearRepeater(campo, valorInicial) {
    const wrap = document.createElement('div');
    wrap.className = 'campo-repeater';
    let filas = Array.isArray(valorInicial) ? JSON.parse(JSON.stringify(valorInicial)) : [];

    const tabla = document.createElement('div');
    tabla.className = 'repeater-filas';
    wrap.appendChild(tabla);

    function pintar() {
      tabla.innerHTML = '';
      filas.forEach((fila, idx) => {
        const filaEl = document.createElement('div');
        filaEl.className = 'repeater-fila';
        campo.subcampos.forEach((sub) => {
          const subInput = crearInput(sub, fila[sub.clave]);
          subInput.placeholder = sub.etiqueta;
          subInput.addEventListener('input', () => {
            filas[idx][sub.clave] = valorDeInput(sub, subInput);
          });
          subInput.addEventListener('change', () => {
            filas[idx][sub.clave] = valorDeInput(sub, subInput);
          });
          filaEl.appendChild(subInput);
        });
        const btnQuitar = document.createElement('button');
        btnQuitar.type = 'button';
        btnQuitar.className = 'btn-quitar-fila';
        btnQuitar.textContent = '×';
        btnQuitar.setAttribute('aria-label', 'Quitar fila');
        btnQuitar.addEventListener('click', () => {
          filas.splice(idx, 1);
          pintar();
        });
        filaEl.appendChild(btnQuitar);
        tabla.appendChild(filaEl);
      });
    }
    pintar();

    const btnAgregar = document.createElement('button');
    btnAgregar.type = 'button';
    btnAgregar.className = 'btn-agregar-fila';
    btnAgregar.textContent = '+ agregar fila';
    btnAgregar.addEventListener('click', () => {
      const nueva = {};
      campo.subcampos.forEach((s) => (nueva[s.clave] = s.tipo === 'checkbox' ? false : ''));
      filas.push(nueva);
      pintar();
    });
    wrap.appendChild(btnAgregar);

    wrap.obtenerValor = () => filas;
    return wrap;
  }

  // Construye el <form>. onGuardar(datosValidados) se llama si pasa la validación.
  function construir(schema, registro, onGuardar, onCancelar) {
    const form = document.createElement('form');
    form.className = 'formulario';
    const getters = [];

    schema.campos.forEach((campo) => {
      const grupo = document.createElement('div');
      grupo.className = 'campo-grupo';
      const label = document.createElement('label');
      label.textContent = campo.etiqueta + (campo.requerido ? ' *' : '');
      grupo.appendChild(label);

      const valorInicial = registro ? registro[campo.clave] : undefined;
      let entrada;
      if (campo.tipo === 'repeater') {
        entrada = crearRepeater(campo, valorInicial);
        getters.push(() => [campo, entrada.obtenerValor()]);
      } else {
        entrada = crearInput(campo, valorInicial);
        getters.push(() => [campo, valorDeInput(campo, entrada)]);
      }
      grupo.appendChild(entrada);

      const errorEl = document.createElement('p');
      errorEl.className = 'campo-error';
      grupo.appendChild(errorEl);
      grupo.errorEl = errorEl;
      grupo.campo = campo;
      form.appendChild(grupo);
    });

    const acciones = document.createElement('div');
    acciones.className = 'form-acciones';
    const btnGuardar = document.createElement('button');
    btnGuardar.type = 'submit';
    btnGuardar.className = 'btn-primario';
    btnGuardar.textContent = registro ? 'Guardar cambios' : 'Crear registro';
    acciones.appendChild(btnGuardar);

    if (onCancelar) {
      const btnCancelar = document.createElement('button');
      btnCancelar.type = 'button';
      btnCancelar.className = 'btn-secundario';
      btnCancelar.textContent = 'Cancelar';
      btnCancelar.addEventListener('click', onCancelar);
      acciones.appendChild(btnCancelar);
    }
    form.appendChild(acciones);

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const datos = {};
      let valido = true;
      Array.from(form.querySelectorAll('.campo-grupo')).forEach((grupo) => (grupo.errorEl.textContent = ''));

      getters.forEach((obtenerCampoValor, i) => {
        const [campo, valor] = obtenerCampoValor();
        datos[campo.clave] = valor;
        const vacio =
          campo.tipo === 'repeater'
            ? false
            : campo.tipo === 'checkbox'
            ? false
            : valor === '' || valor === null || valor === undefined;
        if (campo.requerido && vacio) {
          valido = false;
          const grupo = form.querySelectorAll('.campo-grupo')[i];
          grupo.errorEl.textContent = 'Este campo es obligatorio.';
        }
      });

      if (campoNumericoFueraDeRango(schema, datos)) valido = false;

      if (!valido) return;
      onGuardar(datos);
    });

    return form;
  }

  function campoNumericoFueraDeRango(schema, datos) {
    let fuera = false;
    schema.campos.forEach((campo) => {
      if (campo.clave === 'nivel_habilidad' && datos[campo.clave] != null) {
        if (datos[campo.clave] < 1 || datos[campo.clave] > 10) fuera = true;
      }
      if (campo.clave === 'prioridad' && datos[campo.clave] != null) {
        if (datos[campo.clave] < 0 || datos[campo.clave] > 100) fuera = true;
      }
    });
    return fuera;
  }

  return { construir };
})();
