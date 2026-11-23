// Usuarios, vistos por Administración (RF-11 alta y RF-12 permisos).
//
//   GET   /                     lista (texto, rol, activo)
//   POST  /                     alta: devuelve UNA vez la contraseña para entregarle
//   PATCH /:id                  datos, permiso de revisar (rol) y baja / reactivación
//   POST  /:id/restablecer      contraseña nueva; borra sus llaves y cierra sus sesiones
//
// Nadie se borra: la baja sólo lo desactiva (sus partes lo siguen citando).
// Nadie puede quitarse a sí mismo el acceso ni cambiar su propio rol.

'use strict';

const express = require('express');

const db = require('../../db');
const { darDeAlta, restablecer } = require('../../../scripts/usuario');
const sesion = require('../sesion');
const { anotar } = require('../bitacora');

const r = express.Router();

const ROLES = ['editor', 'capitan', 'administracion'];
// El permiso de revisar (RF-12) es pasar de editor a capitán y al revés. Las
// cuentas de Administración se crean como tales y no se convierten: así una
// contraseña vieja nunca alcanza para registrar una llave de acceso.
const ROLES_DE_LA_APP = ['editor', 'capitan'];

function textoValido(v, min, max) {
  return typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;
}

const vista = (u) => ({
  id: u.id,
  nombre: u.nombre,
  matricula: u.matricula,
  rango: u.rango,
  rol: u.rol,
  division: u.division,
  estacion: u.estacion,
  activo: Boolean(u.activo),
  debe_cambiar: Boolean(u.debe_cambiar),
  tiene_firma: Boolean(u.tiene_firma),
  tiene_celular: Boolean(u.tiene_celular),
  llaves_web: Number(u.llaves_web || 0),
  creado_en: u.creado_en,
});

const CONSULTA = `
  SELECT u.id, u.nombre, u.matricula, u.rango, u.rol, u.division, u.estacion, u.activo, u.debe_cambiar, u.creado_en,
         u.trazo IS NOT NULL AS tiene_firma, u.llave_publica IS NOT NULL AS tiene_celular,
         (SELECT COUNT(*) FROM credencial_web c WHERE c.usuario_id = u.id) AS llaves_web
    FROM usuario u`;

const uno = async (id) => {
  const u = await db.fila(`${CONSULTA} WHERE u.id = ?`, [String(id)]);
  return u ? vista(u) : null;
};

r.get('/', async (req, res) => {
  const condiciones = [];
  const valores = [];
  const texto = textoValido(req.query.texto, 1, 80);
  if (texto) {
    const like = `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    condiciones.push('(u.nombre LIKE ? OR u.matricula LIKE ?)');
    valores.push(like, like);
  }
  if (ROLES.includes(req.query.rol)) {
    condiciones.push('u.rol = ?');
    valores.push(req.query.rol);
  }
  if (req.query.activo === '1' || req.query.activo === '0') {
    condiciones.push('u.activo = ?');
    valores.push(Number(req.query.activo));
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const filas = await db.filas(`${CONSULTA} ${where} ORDER BY u.activo DESC, u.nombre LIMIT 500`, valores);
  res.json({ usuarios: filas.map(vista) });
});

r.post('/', async (req, res) => {
  const b = req.body;
  const matricula = typeof b.matricula === 'string' && /^\d{4,10}$/.test(b.matricula.trim()) ? b.matricula.trim() : null;
  const nombre = textoValido(b.nombre, 3, 160);
  const rol = ROLES.includes(b.rol) ? b.rol : null;
  if (!matricula) return res.status(400).json({ error: 'matricula_invalida' });
  if (!nombre) return res.status(400).json({ error: 'nombre_invalido' });
  if (!rol) return res.status(400).json({ error: 'rol_invalido' });
  const rango = b.rango ? textoValido(b.rango, 1, 40) : undefined;
  const division = b.division ? textoValido(b.division, 1, 80) : undefined;
  const estacion = b.estacion ? textoValido(b.estacion, 1, 80) : undefined;
  if (rango === null || division === null || estacion === null) return res.status(400).json({ error: 'dato_invalido' });

  if (await db.fila('SELECT 1 FROM usuario WHERE matricula = ? OR id = ?', [matricula, `u-${matricula}`])) {
    return res.status(409).json({ error: 'matricula_repetida' });
  }
  const { id, contrasena } = await darDeAlta({ matricula, nombre, rol, rango, division, estacion });
  await anotar(req, 'usuario_alta', { objetivo: matricula, detalle: { rol } });
  res.status(201).json({ usuario: await uno(id), contrasena });
});

r.patch('/:id', async (req, res) => {
  const antes = await uno(req.params.id);
  if (!antes) return res.status(404).json({ error: 'no_existe' });
  const b = req.body;
  const cambios = {};

  for (const [campo, min, max] of [
    ['nombre', 3, 160],
    ['rango', 1, 40],
    ['division', 1, 80],
    ['estacion', 1, 80],
  ]) {
    if (b[campo] === undefined) continue;
    const v = textoValido(b[campo], min, max);
    if (!v) return res.status(400).json({ error: 'dato_invalido', campo });
    if (v !== antes[campo]) cambios[campo] = v;
  }
  if (b.rol !== undefined && b.rol !== antes.rol) {
    if (!ROLES_DE_LA_APP.includes(b.rol) || !ROLES_DE_LA_APP.includes(antes.rol)) {
      return res.status(400).json({ error: 'rol_no_cambia' });
    }
    cambios.rol = b.rol;
  }
  if (b.activo !== undefined && Boolean(b.activo) !== antes.activo) cambios.activo = b.activo ? 1 : 0;

  if (antes.id === req.usuario.id && ('rol' in cambios || 'activo' in cambios)) {
    return res.status(409).json({ error: 'no_a_ti_mismo' });
  }
  if (!Object.keys(cambios).length) return res.json({ usuario: antes });

  const columnas = Object.keys(cambios);
  await db.ejecutar(`UPDATE usuario SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [
    ...columnas.map((c) => cambios[c]),
    antes.id,
  ]);
  // Dado de baja: sus sesiones (app y web) se cierran en ese momento.
  if (cambios.activo === 0) await sesion.cerrarTodas(antes.id);

  const accion = 'activo' in cambios ? (cambios.activo ? 'usuario_reactivado' : 'usuario_baja') : 'usuario_editado';
  await anotar(req, accion, {
    objetivo: antes.matricula,
    detalle: Object.fromEntries(columnas.map((c) => [c, { antes: antes[c], despues: cambios[c] }])),
  });
  res.json({ usuario: await uno(antes.id) });
});

r.post('/:id/restablecer', async (req, res) => {
  const u = await uno(req.params.id);
  if (!u) return res.status(404).json({ error: 'no_existe' });
  if (u.id === req.usuario.id) return res.status(409).json({ error: 'no_a_ti_mismo' });
  if (!u.activo) return res.status(409).json({ error: 'esta_de_baja' });
  const { contrasena } = await restablecer(u.matricula);
  await anotar(req, 'usuario_restablecido', { objetivo: u.matricula });
  res.json({ usuario: await uno(u.id), contrasena });
});

module.exports = r;
