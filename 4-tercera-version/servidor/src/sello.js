// El sello del parte: un SHA-256 de todo lo que lo forma, siempre en el mismo
// orden. Se saca cuando el revisor lo valida y se guarda con el parte. Si
// después cambia cualquier cosa, al volver a sacarlo ya no coincide.

'use strict';

const { sha256 } = require('./firma');
const { contenidoParaFirmar } = require('./validacion');

// Lo que entra al sello:
//   contenido  los datos de la hoja, el número de fotos, y el propietario y
//              el testigo con sus trazos (lo mismo que confirmaron autor y revisor)
//   croquis    lo que el parte trae del croquis
//   firmas     del autor y del revisor: quién, cómo confirmó y la copia de su trazo
//
// La app todavía no sube al servidor las imágenes de las fotos ni del
// croquis: cuando lo haga, sus hashes entran aquí.
function contenidoSellado(parte) {
  const f = parte.firmas || {};
  return {
    contenido: contenidoParaFirmar(parte),
    croquis: parte.croquis_png ?? null,
    firmas: {
      elaboro: { usuario_id: parte.elaboro_id, firma: f.elaboro ?? null, trazo: f.elaboro_trazo ?? null },
      revisor: { usuario_id: f.revisor_id ?? null, firma: f.revisor ?? null, trazo: f.revisor_trazo ?? null },
    },
  };
}

const calcularSello = (parte) => sha256(JSON.stringify(contenidoSellado(parte)));

module.exports = { calcularSello };
