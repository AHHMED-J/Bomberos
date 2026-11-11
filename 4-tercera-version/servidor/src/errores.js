// Un error que la app puede mostrar tal cual. Se responde como
//
//     { "error": "RETO_VENCIDO", "mensaje": "Pasó demasiado tiempo. Vuelve a intentarlo." }
//
// La app decide qué hacer por el código (error) y le enseña al usuario el
// mensaje.

'use strict';

class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, extra = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.extra = extra;
  }
}

module.exports = { ErrorApi };
