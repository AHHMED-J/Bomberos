// Servidor de prueba: registra una llave pública y verifica firmas.
// Sin dependencias: sólo módulos de Node. Uso: node servidor/servidor.js
const http = require('http');
const crypto = require('crypto');

let llavePublica = null;            // PEM registrada por la app
const retos = new Map();            // reto -> { contenido, usado }

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function cuerpo(req) {
  return new Promise((ok) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } });
  });
}

http.createServer(async (req, res) => {
  const b = await cuerpo(req);
  console.log(new Date().toLocaleTimeString(), req.method, req.url);

  if (req.url === '/registrar' && req.method === 'POST') {
    llavePublica = b.publicKey;
    console.log('Llave pública registrada:\n' + llavePublica);
    return json(res, 200, { ok: true });
  }

  // El reto lleva un número al azar y el hash SHA-256 del contenido del parte,
  // así la firma queda ligada a ese contenido exacto.
  if (req.url === '/reto' && req.method === 'POST') {
    const contenido = b.contenido || '';
    const hash = crypto.createHash('sha256').update(contenido).digest('hex');
    const reto = crypto.randomBytes(16).toString('hex') + ':' + hash;
    retos.set(reto, { contenido, usado: false });
    return json(res, 200, { reto, hash });
  }

  if (req.url === '/verificar' && req.method === 'POST') {
    const r = retos.get(b.reto);
    if (!llavePublica) return json(res, 400, { ok: false, motivo: 'No hay llave registrada' });
    if (!r) return json(res, 400, { ok: false, motivo: 'Reto desconocido' });
    if (r.usado) return json(res, 400, { ok: false, motivo: 'Reto ya usado' });
    r.usado = true;                 // un reto sirve una sola vez
    const v = crypto.createVerify('SHA256');
    v.update(b.reto);
    v.end();
    let valida = false;
    try { valida = v.verify(llavePublica, Buffer.from(b.firma, 'base64')); } catch (e) { console.log(e.message); }
    console.log('Firma', valida ? 'VÁLIDA' : 'INVÁLIDA');
    return json(res, 200, { ok: valida, hash: b.reto.split(':')[1] });
  }

  json(res, 404, { ok: false });
}).listen(3000, '0.0.0.0', () => console.log('Servidor de prueba en el puerto 3000'));
