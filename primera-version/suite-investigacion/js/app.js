// Arranca la app: siembra los datos reales si es la primera vez, arma el menú
// unificado a las 6 interfaces y enruta por el hash de la URL.
(function () {
  function sembrarDatos() {
    Store.sembrarSiVacio('entrevistas', Schema.entrevistas.seed);
    Store.sembrarSiVacio('extremos', Schema.extremos.seed);
    Store.sembrarSiVacio('needfinding', Schema.needfinding.seed);
    Store.sembrarSiVacio('empathy_fragmentos', Schema.empathyFragmentos.seed);
    Store.sembrarSiVacio('empathy_insights', Schema.empathyInsights.seed);
    Store.sembrarSiVacio('roper_segmentos', Schema.roperSegmentos.seed);
    Store.sembrarSiVacio('roper_personas', Schema.roperPersonas.seed);
    Store.sembrarSiVacio('requisitos', Schema.requisitos.seed);
  }

  const RUTAS = {
    entrevistas: () => Paginas.paginaGenerica(Schema.entrevistas),
    extremos: () => Paginas.paginaGenerica(Schema.extremos),
    needfinding: () => Paginas.paginaGenerica(Schema.needfinding),
    empathy: () => Paginas.paginaEmpathy(),
    roper: () => Paginas.paginaRoper(),
    requisitos: () => Paginas.paginaRequisitos(),
  };

  const NOMBRES_NAV = {
    entrevistas: 'Entrevista a Expertos',
    extremos: 'Usuarios Extremos',
    needfinding: 'Needfinding',
    empathy: 'Empathy Map',
    roper: 'Roper Dynagram',
    requisitos: 'Mapeo de Requerimientos',
  };

  function construirNav() {
    const nav = document.getElementById('nav-principal');
    nav.innerHTML = '';
    Object.keys(NOMBRES_NAV).forEach((clave) => {
      const a = document.createElement('a');
      a.href = '#' + clave;
      a.textContent = NOMBRES_NAV[clave];
      a.className = 'nav-link';
      if (clave === 'requisitos') a.classList.add('nav-link--obligatoria');
      nav.appendChild(a);
    });
  }

  function rutaActual() {
    const hash = (location.hash || '').replace('#', '');
    return RUTAS[hash] ? hash : 'entrevistas';
  }

  function pintarRuta() {
    const clave = rutaActual();
    document.querySelectorAll('.nav-link').forEach((a) => {
      a.classList.toggle('activo', a.getAttribute('href') === '#' + clave);
    });
    const main = document.getElementById('contenido');
    main.innerHTML = '';
    main.appendChild(RUTAS[clave]());
  }

  function iniciar() {
    sembrarDatos();
    construirNav();
    window.addEventListener('hashchange', pintarRuta);
    if (!location.hash) location.hash = '#entrevistas';
    pintarRuta();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
