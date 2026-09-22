// Motor de persistencia: cada colección vive en su propia llave de localStorage.
// CRUD genérico: listar, obtener, crear, editar, borrar. Todo con id y marca de tiempo.
var Store = (() => {
  const PREFIJO = 'suite-inv:';

  function claveDe(coleccion) {
    return PREFIJO + coleccion;
  }

  function listar(coleccion) {
    const crudo = localStorage.getItem(claveDe(coleccion));
    if (!crudo) return [];
    try {
      return JSON.parse(crudo);
    } catch (e) {
      console.error('Datos corruptos en', coleccion, e);
      return [];
    }
  }

  function guardarTodo(coleccion, registros) {
    localStorage.setItem(claveDe(coleccion), JSON.stringify(registros));
  }

  function obtener(coleccion, id) {
    return listar(coleccion).find((r) => r.id === id) || null;
  }

  function generarId() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function crear(coleccion, datos) {
    const registros = listar(coleccion);
    const registro = Object.assign({ id: generarId(), creadoEn: new Date().toISOString() }, datos);
    registros.push(registro);
    guardarTodo(coleccion, registros);
    return registro;
  }

  function editar(coleccion, id, datos) {
    const registros = listar(coleccion);
    const idx = registros.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Registro no encontrado: ' + id);
    registros[idx] = Object.assign({}, registros[idx], datos, { actualizadoEn: new Date().toISOString() });
    guardarTodo(coleccion, registros);
    return registros[idx];
  }

  function borrar(coleccion, id) {
    const registros = listar(coleccion).filter((r) => r.id !== id);
    guardarTodo(coleccion, registros);
  }

  function sembrarSiVacio(coleccion, semillas) {
    if (listar(coleccion).length === 0 && semillas && semillas.length) {
      const registros = semillas.map((s) =>
        Object.assign({ id: generarId(), creadoEn: new Date().toISOString() }, s)
      );
      guardarTodo(coleccion, registros);
    }
  }

  function vaciar(coleccion) {
    localStorage.removeItem(claveDe(coleccion));
  }

  return { listar, obtener, crear, editar, borrar, sembrarSiVacio, vaciar, generarId };
})();
