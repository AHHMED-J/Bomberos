// Lee el catálogo de casillas directo de la app (app/lib/datos/catalogo_campos.dart) para no duplicarlo.
const fs = require('fs');
const path = require('path');

function leerCatalogo() {
  const dart = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'lib', 'datos', 'catalogo_campos.dart'), 'utf8');
  const listas = {};
  for (const m of dart.matchAll(/const (\w+) = \[([\s\S]*?)\];/g)) {
    listas[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
  const campos = [];
  for (const m of dart.matchAll(/CampoDef\(([^)]*?)\)\s*,/g)) {
    const t = m[1];
    const val = (k) => (new RegExp(`${k}: '([^']*)'`).exec(t) || [])[1];
    const tipo = (/tipo: TipoCampo\.(\w+)/.exec(t) || [])[1] || 'texto';
    const opcLit = /opciones: \[([^\]]*)\]/.exec(t);
    const opcRef = /opciones: (\w+)/.exec(t);
    const opciones = opcLit ? [...opcLit[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : opcRef && listas[opcRef[1]] ? listas[opcRef[1]] : undefined;
    campos.push({
      id: val('id'),
      etiqueta: val('etiqueta'),
      seccion: (/seccion: SeccionHoja\.(\w+)/.exec(t) || [])[1],
      tipo,
      obligatorio: /obligatorio: true/.test(t),
      ...(opciones ? { opciones } : {}),
    });
  }
  return campos.filter((c) => c.id);
}

module.exports = { leerCatalogo };
if (require.main === module) console.log(JSON.stringify(leerCatalogo(), null, 1));
