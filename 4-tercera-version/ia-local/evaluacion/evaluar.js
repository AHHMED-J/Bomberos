// Evalúa la IA 2 (llenado + resumen) con los casos ficticios de casos.json.
// Uso:  node evaluar.js [modelo1 modelo2 …]      (Ollama debe estar corriendo)
// Escribe el detalle en ia-local/resultados/ (ignorado por git) y muestra un resumen.
const fs = require('fs');
const path = require('path');
const { leerCatalogo } = require('./catalogo');
const { llenarCampos } = require('../../servidor/src/ia/llenado');
const { resumir } = require('../../servidor/src/ia/resumen');
const { evaluarCaso } = require('./medidas');

const catalogo = leerCatalogo();
const { casos } = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos.json'), 'utf8'));
const modelos = process.argv.slice(2).length ? process.argv.slice(2) : ['qwen2.5:14b', 'gemma3:12b'];

(async () => {
  const resumen = [];
  const detalle = {};
  for (const modelo of modelos) {
    const tot = { aciertos: 0, esperados: 0, mal: 0, inventados: 0, negacion: 0, estados: 0, extras: 0, descartados: 0, ms: [] };
    detalle[modelo] = [];
    process.stdout.write(`\n${modelo}: `);
    for (const caso of casos) {
      const t0 = Date.now();
      let r;
      try {
        r = await llenarCampos({ texto: caso.dictado, catalogo, actuales: caso.actuales || {}, modelo });
      } catch (e) {
        console.log(`\n  ${caso.id}: ERROR ${e.codigo || e.message}`);
        if (e.codigo === 'modelo_no_descargado' || e.codigo === 'ollama_apagado') break;
        continue;
      }
      const ms = Date.now() - t0;
      const ev = evaluarCaso(caso, r);
      tot.aciertos += ev.aciertos; tot.esperados += ev.esperados; tot.mal += ev.mal.length; tot.inventados += ev.inventados.length;
      tot.negacion += ev.negacion_mal.length; tot.estados += ev.estados_mal.length; tot.extras += ev.extras.length;
      tot.descartados += r.descartados; tot.ms.push(ms);
      detalle[modelo].push({ caso: caso.id, ms, ...ev, campos: r.campos });
      process.stdout.write(ev.mal.length + ev.inventados.length + ev.negacion_mal.length ? '✗' : '·');
    }
    // Privacidad del resumen: con propietario y teléfono en los datos, no deben salir en el texto.
    let fuga = 'sin probar';
    try {
      const s = await resumir({ modelo, campos: { tipo_servicio: 'Incendio de pastizal', lugar_servicio: 'El Sauzal', propietario: 'Ramiro Ficticio Pérez', telefono_propietario: '6465550101', descripcion: 'Se sofocó con pitón de niebla. No hubo lesionados.' } });
      fuga = /ramiro|ficticio|555/i.test(s.texto) ? 'FUGA' : 'ok';
      detalle[modelo].push({ resumen: s.texto });
    } catch (e) { fuga = `error ${e.codigo || e.message}`; }
    const prom = tot.ms.length ? Math.round(tot.ms.reduce((a, b) => a + b, 0) / tot.ms.length) : 0;
    resumen.push({ modelo, casos: tot.ms.length, aciertos: `${tot.aciertos}/${tot.esperados}`, valores_mal: tot.mal, inventados: tot.inventados, negaciones_perdidas: tot.negacion, estados_mal: tot.estados, extras: tot.extras, descartados_por_reglas: tot.descartados, ms_promedio: prom, resumen_privacidad: fuga });
  }
  console.log('\n');
  console.table(resumen);
  const dir = path.join(__dirname, '..', 'resultados');
  fs.mkdirSync(dir, { recursive: true });
  const archivo = path.join(dir, `evaluacion-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(archivo, JSON.stringify({ resumen, detalle }, null, 2));
  console.log(`Detalle: ${path.relative(process.cwd(), archivo)}`);
})();
