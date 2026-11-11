// Firmar un parte: el autor al Enviar y el revisor al Validar. Las dos
// firmas se confirman con la biometría o el PIN del celular, que desbloquean
// la llave del chip seguro.
//
//   POST /api/partes/:id/reto     { accion }                 → el mensaje a firmar
//   POST /api/partes/:id/firmar   { accion, retoId, firma }  → el parte cambia de estado
//
// El reto lleva el hash del parte en ese momento. Al firmar se vuelve a sacar:
// si alguien cambió el parte entre las dos peticiones, la firma no entra.

'use strict';

const express = require('express');

const db = require('../db');
const { ErrorApi } = require('../errores');
const c = require('../confirmacion');
const { crearReto, cumplirReto } = require('../retos');
const { exigirSesion, exigirDispositivo } = require('../sesion');

const router = express.Router();

const ROL_POR_ACCION = { enviar: 'autor', validar: 'revisor' };

async function cargarParte(id) {
  const parte = await db.fila('SELECT * FROM parte WHERE id = ?', [id]);
  if (!parte) throw new ErrorApi(404, 'PARTE_NO_EXISTE', 'Ese parte no existe.');
  parte.firmas = await db.filas(
    'SELECT * FROM firma_parte WHERE parte_id = ? AND anulada_en IS NULL ORDER BY id',
    [id],
  );
  return parte;
}

// Lo que se firma. El autor firma los datos; el revisor firma los datos más
// la firma del autor. Cuando la v3 tenga fotos y croquis, entran aquí, y el
// sellado al validar debe usar este mismo contenido.
function hashContenido(parte, accion) {
  const firmas = accion === 'enviar' ? [] : parte.firmas.filter((firma) => firma.rol === 'autor');
  return c.sha256(
    c.canonico({
      folio: parte.folio,
      division_id: parte.division_id,
      elaboro_id: parte.elaboro_id,
      datos: parte.datos,
      firmas: firmas.map((firma) => ({
        rol: firma.rol,
        usuario_id: firma.usuario_id,
        reto_id: firma.reto_id,
        firma_cripto: firma.firma_cripto,
        trazo_sha256: c.sha256(firma.trazo),
      })),
    }),
  );
}

// Las reglas de las notas de la v3, sección "Revisión y envío".
function revisarPermiso(usuario, parte, accion) {
  if (accion === 'enviar') {
    if (parte.elaboro_id !== usuario.id) {
      throw new ErrorApi(403, 'NO_ES_AUTOR', 'Solo quien llenó el parte lo puede enviar.');
    }
    if (!['borrador', 'devuelto'].includes(parte.estado)) {
      throw new ErrorApi(409, 'YA_ENVIADO', 'Este parte ya se envió.');
    }
  } else {
    if (usuario.puede_revisar !== 1) {
      throw new ErrorApi(403, 'NO_REVISA', 'Dirección no te ha habilitado para revisar partes.');
    }
    if (parte.elaboro_id === usuario.id) {
      throw new ErrorApi(
        403,
        'ES_SU_PARTE',
        'No puedes revisar un parte que llenaste tú. Lo tiene que revisar otro revisor de la división.',
      );
    }
    if (parte.division_id !== null && parte.division_id !== usuario.division_id) {
      throw new ErrorApi(403, 'OTRA_DIVISION', 'Este parte es de otra división.');
    }
    if (parte.estado !== 'enviado') {
      throw new ErrorApi(409, 'NO_ESPERA_REVISION', 'Este parte no está esperando revisión.');
    }
  }

  if (!usuario.firma_trazo) {
    throw new ErrorApi(409, 'SIN_TRAZO', 'Primero sube tu firma en trazo desde tu perfil.');
  }
}

function leerAccion(req) {
  const accion = req.body?.accion;
  if (!ROL_POR_ACCION[accion]) throw new ErrorApi(400, 'ACCION', 'La acción debe ser enviar o validar.');
  return accion;
}

router.post('/:id/reto', exigirSesion, exigirDispositivo, async (req, res) => {
  const accion = leerAccion(req);
  const parte = await cargarParte(Number(req.params.id) || 0);
  revisarPermiso(req.usuario, parte, accion);

  const reto = await crearReto({
    usuario: req.usuario,
    dispositivo: req.dispositivo,
    accion,
    parte,
    hashContenido: hashContenido(parte, accion),
  });
  res.json({ ...reto, folio: parte.folio });
});

router.post('/:id/firmar', exigirSesion, exigirDispositivo, async (req, res) => {
  const accion = leerAccion(req);
  const parteId = Number(req.params.id) || 0;

  const reto = await cumplirReto({
    retoId: req.body?.retoId,
    usuario: req.usuario,
    dispositivo: req.dispositivo,
    accion,
    parteId,
    firma: req.body?.firma,
  });

  // Se revisa otra vez: el parte o los permisos pudieron cambiar en estos
  // dos minutos.
  const parte = await cargarParte(parteId);
  revisarPermiso(req.usuario, parte, accion);
  if (hashContenido(parte, accion) !== reto.hash_contenido) {
    throw new ErrorApi(409, 'PARTE_CAMBIO', 'El parte cambió mientras lo firmabas. Revísalo y vuelve a firmar.');
  }

  await db.transaccion(async (t) => {
    // Si el parte se devolvió, la firma anterior del autor deja de valer.
    if (accion === 'enviar') {
      await t.ejecutar(
        "UPDATE firma_parte SET anulada_en = NOW() WHERE parte_id = ? AND rol = 'autor' AND anulada_en IS NULL",
        [parteId],
      );
    }

    // Se guarda una copia del trazo, no un enlace: si el usuario cambia su
    // firma después, este parte no cambia.
    await t.ejecutar(
      `INSERT INTO firma_parte (parte_id, usuario_id, rol, trazo, dispositivo_id, reto_id, firma_cripto)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [parteId, req.usuario.id, ROL_POR_ACCION[accion], req.usuario.firma_trazo, req.dispositivo.id, reto.id, req.body.firma],
    );

    const cambio =
      accion === 'enviar'
        ? await t.ejecutar(
            "UPDATE parte SET estado = 'enviado', enviado_en = NOW() WHERE id = ? AND estado IN ('borrador', 'devuelto')",
            [parteId],
          )
        : await t.ejecutar(
            "UPDATE parte SET estado = 'validado', revisor_id = ?, validado_en = NOW() WHERE id = ? AND estado = 'enviado'",
            [req.usuario.id, parteId],
          );
    if (cambio.affectedRows !== 1) {
      throw new ErrorApi(409, 'PARTE_CAMBIO', 'El parte cambió de estado mientras lo firmabas. Vuelve a abrirlo.');
    }
  });

  // Al validar, aquí van el sellado SHA-256 y la copia en PDF para la
  // estación (siguen pendientes en la v3).

  res.json({ estado: accion === 'enviar' ? 'enviado' : 'validado' });
});

module.exports = router;
