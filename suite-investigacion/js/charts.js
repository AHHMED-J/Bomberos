// Las dos visualizaciones obligatorias: cuadrícula 2x2 del Empathy Map
// y rueda/gráfico polar del Roper Dynagram. Ambas se recalculan solas
// a partir de lo que haya en localStorage en el momento de pintarse.
var Charts = (() => {
  function cuadriculaEmpathy(contenedor) {
    contenedor.innerHTML = '';
    const fragmentos = Store.listar('empathy_fragmentos');
    const cuadrantes = ['Dice', 'Hace', 'Piensa', 'Siente'];
    const grid = document.createElement('div');
    grid.className = 'empathy-grid';
    cuadrantes.forEach((c) => {
      const items = fragmentos.filter((f) => f.cuadrante === c);
      const celda = document.createElement('div');
      celda.className = 'empathy-celda';
      const titulo = document.createElement('h4');
      titulo.textContent = c + ' (' + items.length + ')';
      celda.appendChild(titulo);
      const ul = document.createElement('ul');
      items.forEach((it) => {
        const li = document.createElement('li');
        li.textContent = it.texto;
        ul.appendChild(li);
      });
      celda.appendChild(ul);
      grid.appendChild(celda);
    });
    contenedor.appendChild(grid);
  }

  const COLORES = ['#c0392b', '#2874a6', '#d68910', '#117864', '#6c3483', '#7d6608'];

  function ruedaRoper(contenedor) {
    contenedor.innerHTML = '';
    const personas = Store.listar('roper_personas');
    const total = personas.length;
    if (!total) {
      const vacio = document.createElement('p');
      vacio.textContent = 'No hay personas asignadas todavía.';
      contenedor.appendChild(vacio);
      return;
    }
    const conteoPorSegmento = {};
    personas.forEach((p) => {
      const seg = p.segmento || 'Sin clasificar';
      conteoPorSegmento[seg] = (conteoPorSegmento[seg] || 0) + 1;
    });
    const segmentos = Object.keys(conteoPorSegmento);

    const tam = 220;
    const cx = tam / 2;
    const cy = tam / 2;
    const r = tam / 2 - 4;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + tam + ' ' + tam);
    svg.setAttribute('width', tam);
    svg.setAttribute('height', tam);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Rueda de segmentos Roper Dynagram, recalculada con ' + total + ' personas');

    let anguloActual = -Math.PI / 2;
    segmentos.forEach((seg, i) => {
      const porcion = conteoPorSegmento[seg] / total;
      const anguloFinal = anguloActual + porcion * Math.PI * 2;
      const x1 = cx + r * Math.cos(anguloActual);
      const y1 = cy + r * Math.sin(anguloActual);
      const x2 = cx + r * Math.cos(anguloFinal);
      const y2 = cy + r * Math.sin(anguloFinal);
      const grandeArco = porcion > 0.5 ? 1 : 0;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${grandeArco} 1 ${x2} ${y2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', COLORES[i % COLORES.length]);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = seg + ': ' + conteoPorSegmento[seg] + '/' + total + ' (' + Math.round(porcion * 100) + '%)';
      path.appendChild(title);
      svg.appendChild(path);
      anguloActual = anguloFinal;
    });

    const wrap = document.createElement('div');
    wrap.className = 'roper-wheel-wrap';
    wrap.appendChild(svg);

    const leyenda = document.createElement('ul');
    leyenda.className = 'roper-leyenda';
    segmentos.forEach((seg, i) => {
      const li = document.createElement('li');
      const chip = document.createElement('span');
      chip.className = 'roper-chip';
      chip.style.background = COLORES[i % COLORES.length];
      li.appendChild(chip);
      const pct = Math.round((conteoPorSegmento[seg] / total) * 100);
      li.appendChild(document.createTextNode(` ${seg} — ${conteoPorSegmento[seg]}/${total} (${pct}%)`));
      leyenda.appendChild(li);
    });
    wrap.appendChild(leyenda);

    const nota = document.createElement('p');
    nota.className = 'roper-nota';
    nota.textContent = `Muestra de ${total} personas. La rueda se recalcula sola cada vez que agregas, editas o borras una persona.`;
    wrap.appendChild(nota);

    contenedor.appendChild(wrap);
  }

  return { cuadriculaEmpathy, ruedaRoper };
})();
