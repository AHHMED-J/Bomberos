// Inicio · Mis partes y los cuatro pasos de la captura (figuras 3 y 5).
//
// Tres cosas sostienen el flujo: el parte se crea como borrador al abrir
// "Nuevo parte", cada paso se guarda al pasar al siguiente, y entrar por
// URL a /partes/:id/firma sin lo obligatorio no es un error: manda al
// primer paso que falta.

'use strict';

const express = require('express');

const { filas, fila, ejecutar } = require('../db');
const parteDb = require('../parte');
const croquisIA = require('../croquis');
const sesion = require('../sesion');

const router = express.Router();
const soloBombero = sesion.exigirRol('bombero');

const limpio = (v) => {
  const t = String(v === undefined ? '' : v).trim();
  return t === '' ? null : t;
};
const numero = (v) => (limpio(v) === null ? null : Number(limpio(v)));

/* --- Inicio · Mis partes (Figura 6) ------------------------------------- */

router.get('/partes', soloBombero, async (req, res, siguiente) => {
  try {
    const yo = req.usuario.id;

    // Johnson Box: sólo lo pendiente, devueltos primero. Usa
    // idx_parte_elaboro_estado (elaboro_id, estado).
    const pendientes = await filas(
      `SELECT p.id, p.folio, p.estado, p.fecha, p.lugar_servicio,
              ts.nombre AS tipo_servicio, r.nota, r.paso
         FROM parte p
         LEFT JOIN tipo_servicio ts ON ts.id = p.tipo_servicio_id
         LEFT JOIN revision r ON r.id = (
           SELECT r2.id FROM revision r2
            WHERE r2.parte_id = p.id AND r2.decision = 'devuelto'
            ORDER BY r2.fecha DESC LIMIT 1)
        WHERE p.elaboro_id = ? AND p.estado IN ('devuelto', 'borrador')
        ORDER BY FIELD(p.estado, 'devuelto', 'borrador'), p.actualizado_en DESC`,
      [yo],
    );

    const recientes = await filas(
      `SELECT p.id, p.folio, p.estado, p.fecha, p.hora_salida, p.lugar_servicio,
              ts.nombre AS tipo_servicio
         FROM parte p
         LEFT JOIN tipo_servicio ts ON ts.id = p.tipo_servicio_id
        WHERE p.elaboro_id = ?
        ORDER BY p.fecha DESC, p.id DESC LIMIT 5`,
      [yo],
    );

    const conteo = await filas(
      `SELECT estado, COUNT(*) AS n FROM parte
        WHERE elaboro_id = ? AND fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        GROUP BY estado`,
      [yo],
    );

    res.render('partes/inicio', {
      titulo: 'Mis partes',
      id: 'mis-partes',
      contexto: 'Inicio',
      pendientes,
      recientes,
      conteo,
      totalMes: conteo.reduce((suma, c) => suma + Number(c.n), 0),
    });
  } catch (error) {
    siguiente(error);
  }
});

router.get('/partes/nuevo', soloBombero, async (req, res, siguiente) => {
  try {
    res.redirect(`/partes/${await parteDb.crearBorrador(req.usuario)}/datos`);
  } catch (error) {
    siguiente(error);
  }
});

/* --- Puerta de todos los pasos ------------------------------------------ */

// Antes de cualquier paso de la captura se comprueba lo mismo: que el parte
// exista, que sea de quien entro, y si todavia se puede editar. Las rutas de
// abajo lo piden por su nombre, asi que se lee en la linea de cada ruta que
// primero se exige el rol, luego se carga el parte y al final va el manejador.
async function cargarParaCaptura(req, res, siguiente) {
  try {
    const parte = await parteDb.cargar(Number(req.params.id));
    if (!parte) return res.status(404).render('no-existe', { ruta: req.originalUrl });

    if (parte.elaboro_id !== req.usuario.id) {
      return res.status(403).render('sin-permiso', {
        titulo: 'Ese parte lo levantó alguien más',
        roles: ['quien lo elaboró'],
      });
    }

    req.parte = parte;
    // Un parte ya enviado o validado no se edita: se ve su comprobante.
    req.soloLectura = !['borrador', 'devuelto'].includes(parte.estado);
    siguiente();
  } catch (error) {
    siguiente(error);
  }
}

function pasosDe(parte, actual) {
  return parteDb.PASOS.map((paso) => ({
    ...paso,
    actual: paso.clave === actual,
    completo: paso.clave === 'firma'
      ? !['borrador', 'devuelto'].includes(parte.estado)
      : parteDb.faltantesDe(parte, paso.clave).length === 0,
    ruta: `/partes/${parte.id}/${paso.clave}`,
  }));
}

/* --- Paso 1 · Datos del servicio ---------------------------------------- */

router.get('/partes/:id/datos', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    // Las listas de unidades, estaciones y tipos de servicio que llenan los
    // <select> de la pantalla.
    const catalogos = await parteDb.catalogosDeCaptura();

    res.render('partes/datos', {
      titulo: 'Datos del servicio',
      id: 'partes-datos',
      contexto: 'Captura de parte',
      parte: req.parte,
      pasos: pasosDe(req.parte, 'datos'),
      faltantes: new Map(parteDb.faltantesDe(req.parte, 'datos')),
      unidades: catalogos.unidades,
      tipos: catalogos.tipos,
      estaciones: catalogos.estaciones,
    });
  } catch (error) {
    siguiente(error);
  }
});

router.post('/partes/:id/datos', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);

    const c = req.body;
    await ejecutar(
      `UPDATE parte SET
          no_incidente_c5 = ?, nuc = ?, fecha = ?, hora_salida = ?, hora_regreso = ?,
          unidad_id = ?, turno = ?, estacion_id = ?, tipo_servicio_id = ?,
          zona = ?, despacho = ?, lugar_servicio = ?, latitud = ?, longitud = ?
        WHERE id = ?`,
      [
        limpio(c.no_incidente_c5), limpio(c.nuc), limpio(c.fecha),
        limpio(c.hora_salida), limpio(c.hora_regreso),
        numero(c.unidad_id), limpio(c.turno), numero(c.estacion_id),
        numero(c.tipo_servicio_id), limpio(c.zona), limpio(c.despacho),
        limpio(c.lugar_servicio), numero(c.latitud), numero(c.longitud),
        req.parte.id,
      ],
    );

    if (c.accion === 'salir') return res.redirect('/partes');
    res.redirect(`/partes/${req.parte.id}/personas`);
  } catch (error) {
    siguiente(error);
  }
});

/* --- Paso 2 · Personas y apoyos ----------------------------------------- */

router.get('/partes/:id/personas', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    const personal = await parteDb.catalogoPersonal();

    res.render('partes/personas', {
      titulo: 'Personas y apoyos',
      id: 'partes-personas',
      contexto: 'Captura de parte',
      parte: req.parte,
      pasos: pasosDe(req.parte, 'personas'),
      faltantes: new Map(parteDb.faltantesDe(req.parte, 'personas')),
      personal: personal,
    });
  } catch (error) {
    siguiente(error);
  }
});

// El propietario y el testigo son uno solo cada uno: se reescribe su renglón.
async function guardarPersona(parte, rol, datos) {
  if (!datos.nombre) return;
  const existente = rol === 'testigo' ? parte.testigo : parte.propietario;

  if (existente) {
    await ejecutar(
      `UPDATE persona_involucrada
          SET rol = ?, nombre = ?, edad = ?, telefono = ?, domicilio = ?, aseguradora = ?
        WHERE id = ?`,
      [
        datos.rol || rol, datos.nombre, datos.edad, datos.telefono,
        datos.domicilio, datos.aseguradora, existente.id,
      ],
    );
  } else {
    await ejecutar(
      `INSERT INTO persona_involucrada (parte_id, rol, nombre, edad, telefono, domicilio, aseguradora)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        parte.id, datos.rol || rol, datos.nombre, datos.edad, datos.telefono,
        datos.domicilio, datos.aseguradora,
      ],
    );
  }
}

router.post('/partes/:id/personas', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    const c = req.body;

    await guardarPersona(req.parte, 'propietario', {
      rol: limpio(c.propietario_rol),
      nombre: limpio(c.propietario_nombre),
      edad: numero(c.propietario_edad),
      telefono: limpio(c.propietario_telefono),
      domicilio: limpio(c.propietario_domicilio),
      aseguradora: limpio(c.propietario_aseguradora),
    });

    await guardarPersona(req.parte, 'testigo', {
      nombre: limpio(c.testigo_nombre),
      telefono: limpio(c.testigo_telefono),
      edad: null, domicilio: null, aseguradora: null,
    });

    if (c.accion === 'salir') return res.redirect('/partes');
    res.redirect(`/partes/${req.parte.id}/croquis`);
  } catch (error) {
    siguiente(error);
  }
});

router.post('/partes/:id/personal', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    const usuarioId = numero(req.body.usuario_id);
    if (usuarioId) {
      await ejecutar('INSERT IGNORE INTO parte_personal (parte_id, usuario_id) VALUES (?, ?)', [
        req.parte.id, usuarioId,
      ]);
    }
    res.redirect(`/partes/${req.parte.id}/personas`);
  } catch (error) {
    siguiente(error);
  }
});

router.post('/partes/:id/personal/quitar', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    await ejecutar('DELETE FROM parte_personal WHERE parte_id = ? AND usuario_id = ?', [
      req.parte.id, numero(req.body.usuario_id),
    ]);
    res.redirect(`/partes/${req.parte.id}/personas`);
  } catch (error) {
    siguiente(error);
  }
});

router.post('/partes/:id/voluntario', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    if (limpio(req.body.nombre)) {
      await ejecutar(
        "INSERT INTO persona_involucrada (parte_id, rol, nombre) VALUES (?, 'voluntario', ?)",
        [req.parte.id, limpio(req.body.nombre)],
      );
    }
    res.redirect(`/partes/${req.parte.id}/personas`);
  } catch (error) {
    siguiente(error);
  }
});

router.post('/partes/:id/apoyo', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    const tipo = req.body.tipo === 'institucion' ? 'institucion' : 'unidad';
    if (limpio(req.body.no_unidad) || limpio(req.body.institucion)) {
      await ejecutar(
        'INSERT INTO apoyo (parte_id, tipo, institucion, no_unidad, a_cargo_de) VALUES (?, ?, ?, ?, ?)',
        [req.parte.id, tipo, limpio(req.body.institucion), limpio(req.body.no_unidad), limpio(req.body.a_cargo_de)],
      );
    }
    res.redirect(`/partes/${req.parte.id}/personas`);
  } catch (error) {
    siguiente(error);
  }
});

router.post('/partes/:id/quitar-renglon', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    const tabla = req.body.tabla === 'apoyo' ? 'apoyo' : 'persona_involucrada';
    await ejecutar(`DELETE FROM ${tabla} WHERE id = ? AND parte_id = ?`, [
      numero(req.body.renglon_id), req.parte.id,
    ]);
    res.redirect(`/partes/${req.parte.id}/personas`);
  } catch (error) {
    siguiente(error);
  }
});

/* --- Paso 3 · Descripción y croquis ------------------------------------- */

router.get('/partes/:id/croquis', soloBombero, cargarParaCaptura, (req, res) => {
  res.render('partes/croquis', {
    titulo: 'Descripción y croquis',
    id: 'partes-croquis',
    contexto: 'Captura de parte',
    parte: req.parte,
    pasos: pasosDe(req.parte, 'croquis'),
    faltantes: new Map(parteDb.faltantesDe(req.parte, 'croquis')),
    sinRespuesta: req.query.sin_respuesta ? String(req.query.sin_respuesta) : null,
  });
});

// Si la descripción cambió, el croquis no se borra: se marca como
// desactualizado y el bombero decide si lo regenera (Figura 4).
async function guardarDescripcion(parte, descripcion) {
  const nueva = limpio(descripcion);
  const cambio = (parte.descripcion || '') !== (nueva || '');

  await ejecutar('UPDATE parte SET descripcion = ? WHERE id = ?', [nueva, parte.id]);
  if (cambio && parte.croquis) {
    await ejecutar('UPDATE croquis SET desactualizado = 1 WHERE parte_id = ?', [parte.id]);
  }
}

router.post('/partes/:id/croquis', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    await guardarDescripcion(req.parte, req.body.descripcion);

    if (req.body.accion === 'salir') return res.redirect('/partes');
    res.redirect(`/partes/${req.parte.id}/firma`);
  } catch (error) {
    siguiente(error);
  }
});

async function guardarCroquis(parteId, origen, elementos, svg) {
  await ejecutar(
    `INSERT INTO croquis (parte_id, origen, elementos, svg, desactualizado)
     VALUES (?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
       origen = VALUES(origen), elementos = VALUES(elementos),
       svg = VALUES(svg), desactualizado = 0, generado_en = NOW()`,
    [parteId, origen, JSON.stringify({ elementos }), svg],
  );
}

router.post('/partes/:id/croquis/generar', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    const id = req.parte.id;
    await guardarDescripcion(req.parte, req.body.descripcion);

    const parte = await parteDb.cargar(id);
    const resultado = await croquisIA.generar(parte);

    // Si falla, el parte ya quedó guardado: el croquis es opcional y la
    // pantalla alterna ofrece reintentar, dibujar a mano o dejarlo.
    if (!resultado.ok) {
      return res.redirect(`/partes/${id}/croquis?sin_respuesta=${encodeURIComponent(resultado.motivo)}`);
    }

    await guardarCroquis(id, 'ia', resultado.elementos, resultado.svg);
    res.redirect(`/partes/${id}/croquis`);
  } catch (error) {
    siguiente(error);
  }
});

router.post('/partes/:id/croquis/manual', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    const elementos = croquisIA.elementosDe(req.parte.descripcion);
    await guardarCroquis(
      req.parte.id, 'manual', elementos,
      croquisIA.dibujar(elementos, req.parte.lugar_servicio),
    );
    res.redirect(`/partes/${req.parte.id}/croquis`);
  } catch (error) {
    siguiente(error);
  }
});

router.post('/partes/:id/croquis/quitar', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    await ejecutar('DELETE FROM croquis WHERE parte_id = ?', [req.parte.id]);
    res.redirect(`/partes/${req.parte.id}/croquis`);
  } catch (error) {
    siguiente(error);
  }
});

/* --- Paso 4 · Cierre y firma -------------------------------------------- */

router.get('/partes/:id/firma', soloBombero, cargarParaCaptura, (req, res) => {
  if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);

  // La puerta de la Figura 3: sin lo obligatorio, al primer paso que falta.
  const falta = parteDb.primerPasoIncompleto(req.parte);
  if (falta) return res.redirect(`/partes/${req.parte.id}/${falta}?incompleto=1`);

  res.render('partes/firma', {
    titulo: 'Cierre y firma',
    id: 'partes-firma',
    contexto: 'Captura de parte',
    parte: req.parte,
    pasos: pasosDe(req.parte, 'firma'),
    faltantes: new Map(parteDb.faltantesDe(req.parte, 'firma')),
  });
});

router.post('/partes/:id/cierre', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    if (req.soloLectura) return res.redirect(`/partes/${req.parte.id}/enviado`);
    const id = req.parte.id;
    const peritaje = req.body.requiere_peritaje;

    await ejecutar('UPDATE parte SET requiere_peritaje = ? WHERE id = ?', [
      peritaje === undefined || peritaje === '' ? null : Number(peritaje), id,
    ]);

    // SIMULADO: las firmas de trazo se registran con un botón.
    for (const tipo of ['propietario', 'testigo']) {
      if (req.body[`firma_${tipo}`]) {
        await ejecutar(
          "INSERT INTO firma (parte_id, tipo, firma) VALUES (?, ?, 'SIMULADA · firma de trazo')",
          [id, tipo],
        );
      }
    }

    res.redirect(`/partes/${id}/firma`);
  } catch (error) {
    siguiente(error);
  }
});

// Firmar y enviar (RF-07): el borrador se vuelve parte entregado, se le
// congela el fundamento del tipo de servicio y le llega al revisor de esa
// división.
router.post('/partes/:id/firma', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    const parte = req.parte;
    // Sin esto, reenviar este formulario a un parte ya enviado insertaría
    // otra firma y volvería a incrementar el contador de la credencial —
    // rompe la garantía de que el documento sellado no cambia después.
    if (req.soloLectura) return res.redirect(`/partes/${parte.id}/enviado`);

    const falta = parteDb.primerPasoIncompleto(parte);
    if (falta) return res.redirect(`/partes/${parte.id}/${falta}?incompleto=1`);
    if (parteDb.vacio(parte.requiere_peritaje)) {
      return res.redirect(`/partes/${parte.id}/firma?falta_peritaje=1`);
    }

    // SIMULADO: aquí iría la verificación de la aserción de WebAuthn contra
    // credencial.llave_publica. Lo que sí queda registrado es quién firmó,
    // cuándo y con qué credencial.
    const credencial = await fila(
      'SELECT credential_id FROM credencial WHERE usuario_id = ? LIMIT 1', [req.usuario.id],
    );

    await ejecutar(
      "INSERT INTO firma (parte_id, usuario_id, tipo, firma) VALUES (?, ?, 'formula', ?)",
      [parte.id, req.usuario.id, `SIMULADA · ${credencial ? credencial.credential_id : 'sin credencial'}`],
    );

    if (credencial) {
      await ejecutar('UPDATE credencial SET contador = contador + 1 WHERE usuario_id = ?', [req.usuario.id]);
    }

    await ejecutar(
      `UPDATE parte p
         JOIN tipo_servicio ts ON ts.id = p.tipo_servicio_id
          SET p.estado = 'enviado', p.enviado_en = NOW(),
              p.fundamento_id = COALESCE(p.fundamento_id, ts.fundamento_id)
        WHERE p.id = ?`,
      [parte.id],
    );

    res.redirect(`/partes/${parte.id}/enviado`);
  } catch (error) {
    siguiente(error);
  }
});

/* --- Envío confirmado · el comprobante ---------------------------------- */

router.get('/partes/:id/enviado', soloBombero, cargarParaCaptura, async (req, res, siguiente) => {
  try {
    const parte = req.parte;

    // A quién le llegó: los revisores de la división del tipo de servicio.
    const revisores = await filas(
      "SELECT nombre, cargo FROM usuario WHERE rol = 'revisor' AND division_id = ? ORDER BY nombre",
      [parte.division_id],
    );

    res.render('partes/enviado', {
      titulo: 'Parte enviado',
      id: 'envio-confirmado',
      contexto: 'Comprobante',
      parte,
      revisores,
      firmaFormula: parte.firmas.find((f) => f.tipo === 'formula') || null,
    });
  } catch (error) {
    siguiente(error);
  }
});

module.exports = router;
