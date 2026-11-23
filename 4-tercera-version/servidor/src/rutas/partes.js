// Partes de quien los elabora. TODAS las rutas piden sesión (Authorization: Bearer)
// y quién es lo decide la sesión, nunca lo que diga el cuerpo de la petición.
//
//   POST /api/partes/folio                un folio nuevo
//   GET  /api/partes                      mis partes
//   POST /api/partes/:folio/reto          el reto para firmar (lleva el hash del contenido)
//   POST /api/partes/:folio/adjuntos      sube una foto o el croquis (PNG o JPEG, en base64)
//   GET  /api/partes/:folio/adjuntos/:h   la imagen: su autor o un capitán de la división
//   POST /api/partes/:folio/enviar        revisa, confirma a quien firma y manda a revisión
//   GET  /api/partes/:folio/sello         «Verificar sello»: lo vuelve a sacar y lo compara

'use strict';

const express = require('express');

const db = require('../db');
const datos = require('../datos');
const firma = require('../firma');
const notificaciones = require('../notificaciones');
const adjuntos = require('../adjuntos');
const { calcularSello } = require('../sello');
const { pendientes, contenidoParaFirmar, hashContenido } = require('../validacion');

const r = express.Router();
r.use(datos.exigirSesion);

const FOLIO = /^[A-Za-z0-9-]{1,20}$/;
const folioValido = (req, res, siguiente) =>
  FOLIO.test(req.params.folio) ? siguiente() : res.status(404).json({ error: 'no_existe' });

// ¿Puede esta persona ver el parte (y sus imágenes)? Quien lo elaboró, y los capitanes de su división.
// Antes de que el parte llegue al servidor, sólo quien subió sus imágenes.
async function puedeVer(usuario, folio) {
  const p = await datos.partePorFolio(folio);
  if (!p) return (await adjuntos.subidasPor(folio, usuario.id)).length > 0;
  return p.elaboro_id === usuario.id || (usuario.rol === 'capitan' && p.division === usuario.division);
}

r.post('/folio', async (_req, res) => res.json({ folio: await datos.nuevoFolio() }));

// Sólo los propios. Si la app pide los de otra persona, no.
r.get('/', async (req, res) => {
  if (req.query.usuario && req.query.usuario !== req.usuario.id) return res.status(403).json({ error: 'no_es_tu_cuenta' });
  res.json({ partes: await datos.partesDonde('WHERE elaboro_id = ?', [req.usuario.id]) });
});

// Reto = azar + ':' + SHA-256 del contenido. La confirmación queda ligada a
// ese contenido exacto.
r.post('/:folio/reto', folioValido, async (req, res) => {
  if (!req.body.contenido) return res.status(400).json({ error: 'falta_contenido' });
  const hash = hashContenido(req.body.contenido);
  res.json({ reto: await firma.nuevoReto(hash), hash });
});

// Sube una imagen antes de enviar el parte. Sólo quien lo elabora, y mientras el
// parte sea suyo y siga abierto (sin enviar o devuelto).
r.post('/:folio/adjuntos', folioValido, async (req, res) => {
  const anterior = await datos.partePorFolio(req.params.folio);
  if (anterior && anterior.elaboro_id !== req.usuario.id) return res.status(403).json({ error: 'no_es_su_parte' });
  if (anterior && !['borrador', 'devuelto'].includes(anterior.estado)) return res.status(409).json({ error: 'ya_enviado' });
  const { tipo, sha256, datos: base64 } = req.body;
  const r2 = await adjuntos.guardar({ folio: req.params.folio, tipo, sha256, base64, usuarioId: req.usuario.id });
  if (!r2.ok) return res.status(400).json({ error: r2.motivo });
  res.json({ ok: true, sha256: r2.sha256 });
});

r.get('/:folio/adjuntos/:sha256', folioValido, async (req, res) => {
  if (!(await puedeVer(req.usuario, req.params.folio))) return res.status(403).json({ error: 'sin_permiso' });
  const fila = await adjuntos.buscar(req.params.folio, req.params.sha256);
  if (!fila) return res.status(404).json({ error: 'no_existe' });
  adjuntos.servir(res, fila);
});

// Llega el parte, el reto y la confirmación: firma (biometría del celular) o
// contrasena. Quien envía es quien tiene la sesión: nadie envía partes a nombre de otro.
r.post('/:folio/enviar', folioValido, async (req, res) => {
  const { parte, reto, firma: f, contrasena } = req.body;
  if (!parte || parte.folio !== req.params.folio) return res.status(400).json({ error: 'parte_invalido' });
  if (parte.elaboro_id !== req.usuario.id) return res.status(403).json({ error: 'no_es_su_parte' });

  // Después de enviarlo, quien lo llenó solo lo ve, a menos que se lo devuelvan.
  const anterior = await datos.partePorFolio(parte.folio);
  if (anterior && anterior.elaboro_id !== req.usuario.id) return res.status(403).json({ error: 'no_es_su_parte' });
  if (anterior && !['borrador', 'devuelto'].includes(anterior.estado)) {
    return res.status(409).json({ error: 'ya_enviado' });
  }

  // 1) Nada sin confirmar ni obligatorio vacío.
  const faltan = pendientes(parte);
  if (faltan.length) return res.status(422).json({ error: 'pendientes', pendientes: faltan });

  // 2) El contenido que llega es el mismo que se confirmó.
  const hash = hashContenido(contenidoParaFirmar(parte));
  if (String(reto || '').split(':')[1] !== hash) return res.status(409).json({ error: 'contenido_cambio' });

  // 3) Las imágenes que firma están en el servidor, las subió quien firma y son tantas como fotos dice el parte.
  const lista = Array.isArray(parte.adjuntos) ? parte.adjuntos : [];
  const guardadas = [];
  for (const a of lista) {
    const fila = await adjuntos.buscar(parte.folio, a?.sha256, req.usuario.id); // sólo las que subió quien firma
    if (!fila || fila.tipo !== a.tipo) {
      return res.status(422).json({ error: 'adjunto_faltante', sha256: String(a?.sha256 ?? '').slice(0, 64) });
    }
    guardadas.push({ tipo: fila.tipo, sha256: a.sha256, bytes: fila.bytes, mime: fila.mime, subido_por: req.usuario.id });
  }
  if (guardadas.length && guardadas.filter((a) => a.tipo === 'foto').length !== (parte.fotos || 0)) {
    return res.status(422).json({ error: 'fotos_no_coinciden' });
  }

  // 4) Quien lo elabora tiene su firma en trazo y confirma que es él.
  const autor = req.usuario; // el renglón completo, con su trazo ya descifrado
  if (!autor.trazo) return res.status(409).json({ error: 'falta_trazo' });
  const v = await firma.confirmar({ reto, firma: f, contrasena, usuario: autor });
  if (!v.ok) return res.status(401).json({ error: v.motivo });

  // El parte se queda con una copia del trazo: si el usuario lo cambia
  // después, este parte no cambia.
  const ahora = new Date().toISOString();
  const guardado = {
    ...parte,
    creado_en: parte.creado_en || ahora,
    estado: 'enviado',
    enviado_en: ahora,
    nota: null,
    elaboro_nombre: autor.nombre, // lo que dice la cuenta, no lo que mande el teléfono
    division: autor.division,
    adjuntos: guardadas, // lo que verificó el servidor, sin rutas del teléfono
    firmas: {
      ...parte.firmas,
      elaboro: v.metodo === 'biometria' ? f : 'contrasena',
      elaboro_simulada: v.simulada,
      elaboro_trazo: autor.trazo,
    },
  };
  await db.transaccion(async (t) => {
    await datos.guardarParte(guardado, t);
    await datos.guardarFirma(t, {
      folio: guardado.folio,
      usuarioId: autor.id,
      rol: 'autor',
      reto,
      confirmacion: v,
      firma: f,
      trazo: autor.trazo,
    });
    // A los capitanes de la división les llega un aviso (no a quien lo elaboró).
    await notificaciones.avisarACapitanes(t, guardado.division || datos.DIVISION, autor.id, {
      tipo: 'parte_por_revisar',
      folio: guardado.folio,
      titulo: anterior?.estado === 'devuelto' ? 'Parte corregido por revisar' : 'Parte por revisar',
      texto: `${autor.nombre} envió el parte ${guardado.folio}.`,
    });
  });
  res.json({ parte: guardado, firma_simulada: v.simulada });
});

r.get('/:folio/sello', folioValido, async (req, res) => {
  const parte = await datos.partePorFolio(req.params.folio);
  if (!parte || !(await puedeVer(req.usuario, req.params.folio))) return res.status(404).json({ error: 'no_existe' });
  if (!parte.sello) return res.status(409).json({ error: 'sin_sello' });
  const calculado = calcularSello(parte);
  const imagenes = await adjuntos.integras(parte.folio, parte.adjuntos);
  res.json({ folio: parte.folio, sello: parte.sello, calculado, coincide: calculado === parte.sello && imagenes, imagenes_integras: imagenes });
});

module.exports = r;
