// Exportar una colección a JSON o CSV y disparar la descarga del navegador.
var Exportar = (() => {
  function descargar(nombreArchivo, contenido, tipoMime) {
    const blob = new Blob([contenido], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function aJSON(nombre, registros) {
    descargar(nombre + '.json', JSON.stringify(registros, null, 2), 'application/json');
  }

  function valorPlano(v) {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' | ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function escaparCSV(valor) {
    const texto = valorPlano(valor);
    if (/[",\n]/.test(texto)) {
      return '"' + texto.replace(/"/g, '""') + '"';
    }
    return texto;
  }

  function aCSV(nombre, registros) {
    if (!registros.length) {
      descargar(nombre + '.csv', '', 'text/csv');
      return;
    }
    const columnas = Array.from(
      registros.reduce((set, r) => {
        Object.keys(r).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );
    const filas = [columnas.join(',')];
    registros.forEach((r) => {
      filas.push(columnas.map((c) => escaparCSV(r[c])).join(','));
    });
    descargar(nombre + '.csv', filas.join('\n'), 'text/csv');
  }

  return { aJSON, aCSV };
})();
