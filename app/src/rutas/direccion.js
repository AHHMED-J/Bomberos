// /consulta y las tres pantallas de la Dirección: Partes, Archivo y Personal.
// Archivo y Personal no salen de los mockups: ver el README.

'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');

const { filas, fila, ejecutar } = require('../db');
const parteDb = require('../parte');
const sellado = require('../sellado');
const sesion = require('../sesion');

const router = express.Router();
const soloDireccion = sesion.exigirRol('direccion');

function filtrosDe(query) {
  return {
    desde: query.desde || '',
    hasta: query.hasta || '',
    tipo_servicio_id: query.tipo_servicio_id || '',
    unidad_id: query.unidad_id || '',
    estado: query.estado || '',
    texto: query.texto || '',
  };
}

// A dónde lleva cada renglón de /consulta. La Tabla 3 sólo define pantalla
// de detalle para la Dirección, así que los otros dos roles caen en una
// pantalla que ya tienen: el bombero en su comprobante (o en la captura, si
// el parte sigue abierto) y el revisor en la revisión, que cuando el parte
// ya está validado se muestra sin botones de decisión.
function enlaceDe(parte, usuario) {
  if (usuario.rol === 'revisor') return `/revision/${parte.id}`;
  return ['borrador', 'devuelto'].includes(parte.estado)
    ? `/partes/${parte.id}/datos`
    : `/partes/${parte.id}/enviado`;
}

// /consulta y /direccion/partes son la misma pantalla con distinto alcance:
// el bombero ve lo suyo, el revisor lo de su división, la Dirección todo.
router.get('/consulta', sesion.exigirRol('bombero', 'revisor'), async (req, res, siguiente) => {
  try {
    const filtros = filtrosDe(req.query);
    const alcance = req.usuario.rol === 'bombero'
      ? { elaboro_id: req.usuario.id }
      : { division_id: req.usuario.division_id };

    const partes = await parteDb.buscar(filtros, alcance);
    const catalogos = await parteDb.catalogosDeFiltro();

    // Cada renglon guarda a donde lleva, segun el rol de quien consulta.
    const conEnlace = [];
    for (const p of partes) {
      p.enlace = enlaceDe(p, req.usuario);
      conEnlace.push(p);
    }

    res.render('direccion/partes', {
      titulo: 'Consulta',
      id: 'consulta',
      contexto: 'Consulta',
      esDireccion: false,
      partes: conEnlace,
      filtros,
      ...catalogos,
      alcanceTexto: req.usuario.rol === 'bombero'
        ? 'Tus partes'
        : `Partes de la división ${req.usuario.division || ''}`,
    });
  } catch (error) {
    siguiente(error);
  }
});

router.get('/direccion/partes', soloDireccion, async (req, res, siguiente) => {
  try {
    const filtros = filtrosDe(req.query);
    const partes = await parteDb.buscar(filtros, {});
    const catalogos = await parteDb.catalogosDeFiltro();

    res.render('direccion/partes', {
      titulo: 'Partes de emergencia',
      id: 'panel-direccion',
      contexto: 'Dirección',
      esDireccion: true,
      partes,
      filtros,
      ...catalogos,
      alcanceTexto: 'Todos los partes de las estaciones',
    });
  } catch (error) {
    siguiente(error);
  }
});

router.get('/direccion/partes/:id', soloDireccion, async (req, res, siguiente) => {
  try {
    const parte = await parteDb.cargar(Number(req.params.id));
    if (!parte) return res.status(404).render('no-existe', { ruta: req.originalUrl });

    res.render('direccion/detalle', {
      titulo: parte.folio,
      id: 'panel-detalle',
      contexto: 'Dirección',
      parte,
    });
  } catch (error) {
    siguiente(error);
  }
});

// El documento que se congeló al validar.
router.get('/direccion/partes/:id/sellado', soloDireccion, async (req, res, siguiente) => {
  try {
    const registro = await fila('SELECT * FROM archivo WHERE parte_id = ?', [Number(req.params.id)]);
    if (!registro) return res.redirect(`/direccion/partes/${req.params.id}`);
    res.sendFile(path.join(sellado.ALMACEN, path.basename(registro.pdf_ruta)));
  } catch (error) {
    siguiente(error);
  }
});

// Archivo: los resguardos de diez años ya vencidos (Tabla 3, con
// idx_archivo_resguardo). Pedir la destrucción a sindicatura queda fuera
// del sistema; aquí sólo se registra el oficio cuando llega.
router.get('/direccion/archivo', soloDireccion, async (req, res, siguiente) => {
  try {
    const columnas = `a.*, p.folio, p.fecha, p.lugar_servicio, ts.nombre AS tipo_servicio
         FROM archivo a
         JOIN parte p ON p.id = a.parte_id
         LEFT JOIN tipo_servicio ts ON ts.id = p.tipo_servicio_id`;

    const vencidos = await filas(`SELECT ${columnas}
        WHERE a.resguardo_hasta <= CURDATE() AND a.destruido_en IS NULL
        ORDER BY a.resguardo_hasta`);

    const vigentes = await filas(`SELECT ${columnas}
        WHERE a.resguardo_hasta > CURDATE()
        ORDER BY a.resguardo_hasta LIMIT 20`);

    const total = await fila('SELECT COUNT(*) AS n FROM archivo');

    res.render('direccion/archivo', {
      titulo: 'Archivo',
      id: 'direccion-archivo',
      contexto: 'Resguardo de 10 años',
      vencidos,
      vigentes,
      total: Number(total.n),
    });
  } catch (error) {
    siguiente(error);
  }
});

router.post('/direccion/archivo/:id', soloDireccion, async (req, res, siguiente) => {
  try {
    const oficio = String(req.body.autorizacion_destruccion || '').trim();
    if (oficio) {
      await ejecutar('UPDATE archivo SET autorizacion_destruccion = ? WHERE id = ?', [
        oficio, Number(req.params.id),
      ]);
    }
    res.redirect('/direccion/archivo');
  } catch (error) {
    siguiente(error);
  }
});

router.get('/direccion/personal', soloDireccion, async (req, res, siguiente) => {
  try {
    const personal = await filas(
      `SELECT u.*, d.nombre AS division, e.nombre AS estacion,
              (SELECT COUNT(*) FROM credencial c WHERE c.usuario_id = u.id) AS credenciales,
              (SELECT COUNT(*) FROM codigo_alta ca
                WHERE ca.usuario_id = u.id AND ca.usado_en IS NULL AND ca.expira_en > NOW())
                AS codigos_vivos
         FROM usuario u
         LEFT JOIN division d ON d.id = u.division_id
         LEFT JOIN estacion e ON e.id = u.estacion_id
        ORDER BY FIELD(u.rol, 'bombero', 'revisor', 'direccion'), u.nombre`,
    );

    res.render('direccion/personal', {
      titulo: 'Personal',
      id: 'direccion-personal',
      contexto: 'Dirección',
      personal,
      codigoNuevo: req.query.codigo || null,
      paraQuien: req.query.para || null,
    });
  } catch (error) {
    siguiente(error);
  }
});

// Emite el código de un solo uso que consume /registro. Se guarda su
// SHA-256: la única vez que se ve en claro es al dictarlo.
router.post('/direccion/personal/:id/codigo', soloDireccion, async (req, res, siguiente) => {
  try {
    const usuarioId = Number(req.params.id);
    const usuario = await fila('SELECT nombre FROM usuario WHERE id = ?', [usuarioId]);
    if (!usuario) return res.redirect('/direccion/personal');

    // Sin las letras que se confunden al dictarlas.
    const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const codigo = Array.from(crypto.randomBytes(5))
      .map((b) => ALFABETO[b % ALFABETO.length])
      .join('');

    await ejecutar(
      `INSERT INTO codigo_alta (usuario_id, codigo_hash, expira_en)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [usuarioId, crypto.createHash('sha256').update(codigo).digest('hex')],
    );

    res.redirect(
      `/direccion/personal?codigo=${encodeURIComponent(codigo)}&para=${encodeURIComponent(usuario.nombre)}`,
    );
  } catch (error) {
    siguiente(error);
  }
});

module.exports = router;
