// intentos.js — la tabla de intentos del panel de prueba y su exportación a CSV.

'use strict';

let intentos = leer(LS_INTENTOS, []);

function pintarIntentos() {
  const tbody = $('#intentos');
  tbody.replaceChildren();
  $('#sin-intentos').hidden = intentos.length > 0;
  for (const i of intentos) {
    const tr = document.createElement('tr');
    for (const v of [i.id, i.participante, mmss(i.seg_lugar), mmss(i.seg_estacion), mmss(i.seg_total), i.fotos]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.append(td);
    }
    tbody.append(tr);
  }
}

function descargarCSV() {
  if (!intentos.length) {
    alert('Todavía no hay intentos para exportar.');
    return;
  }
  // Todas las columnas de todos los intentos: los de versiones anteriores
  // del CFP pueden traer columnas distintas.
  const columnas = [...new Set(intentos.flatMap((i) => Object.keys(i)))];
  const celda = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lineas = [columnas.join(','), ...intentos.map((i) => columnas.map((c) => celda(i[c])).join(','))];
  // El BOM hace que Excel respete los acentos.
  const blob = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cfp-intentos-${fechaISO(new Date())}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#descargar-csv').addEventListener('click', descargarCSV);

$('#borrar-intentos').addEventListener('click', () => {
  if (!intentos.length || !confirm(`¿Borrar los ${intentos.length} intentos? Descarga el CSV antes si los necesitas.`)) return;
  intentos = [];
  escribir(LS_INTENTOS, intentos);
  pintarIntentos();
});
