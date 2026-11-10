// Acceso: alta con código de un solo uso + llave del chip seguro; entrar = firmar un reto al azar.
const express = require('express');
const crypto = require('crypto');
const datos = require('../datos');
const firma = require('../firma');

const r = express.Router();
const buscar = (id) => datos.usuarios.find((u) => u.id === id);

r.get('/codigo/:codigo', (req, res) => {
  const c = datos.codigosAlta.get(String(req.params.codigo).toUpperCase());
  if (!c || c.usado) return res.status(404).json({ error: 'codigo_invalido' });
  res.json({ usuario: buscar(c.usuarioId) });
});

r.post('/alta', (req, res) => {
  const { codigo, llave_publica: llave } = req.body;
  const c = datos.codigosAlta.get(String(codigo || '').toUpperCase());
  if (!c || c.usado) return res.status(404).json({ error: 'codigo_invalido' });
  if (!llave) return res.status(400).json({ error: 'falta_llave_publica' });
  c.usado = true;
  datos.llaves.set(c.usuarioId, llave); // la credencial anterior queda reemplazada
  res.json({ usuario: buscar(c.usuarioId) });
});

r.post('/reto', (req, res) => {
  if (!buscar(req.body.usuario_id)) return res.status(404).json({ error: 'usuario_desconocido' });
  res.json({ reto: firma.nuevoReto('acceso') });
});

r.post('/verificar', (req, res) => {
  const { usuario_id: id, reto, firma: f } = req.body;
  const u = buscar(id);
  if (!u) return res.status(404).json({ error: 'usuario_desconocido' });
  const v = firma.verificar({ reto, firma: f, llavePublica: datos.llaves.get(id) });
  if (!v.ok) return res.status(401).json({ error: v.motivo });
  const token = crypto.randomBytes(24).toString('hex');
  datos.sesiones.set(token, id);
  res.json({ ok: true, simulada: v.simulada, token, usuario: u });
});

module.exports = r;
