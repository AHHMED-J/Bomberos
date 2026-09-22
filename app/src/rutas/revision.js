// La bandeja del revisor y la pantalla de revisar parte (Figura 5).
//
// El cambio grande respecto a los mockups: el "jefe de turno" es ahora un
// revisor por división, así que la bandeja filtra por la división del tipo
// de servicio, no por turno (necesidad oculta O4).

'use strict';

const express = require('express');

const { filas, ejecutar } = require('../db');
const parteDb = require('../parte');
const sellado = require('../sellado');
const sesion = require('../sesion');

const router = express.Router();

const PESTANAS = [
  { clave: 'pendientes', estado: 'enviado',  texto: 'Pendientes' },
  { clave: 'devueltos',  estado: 'devuelto', texto: 'Devueltos' },
  { clave: 'validados',  estado: 'validado', texto: 'Validados' },
];

// Consulta de la Tabla 3, con idx_parte_estado_fecha.
router.get('/revision', sesion.exigirRol('revisor'), async (req, res, siguiente) => {
  try {
    const division = req.usuario.division_id;
    const pestana = PESTANAS.find((p) => p.clave === req.query.ver) || PESTANAS[0];

    const partes = await filas(
      `SELECT p.id, p.folio, p.estado, p.fecha, p.hora_salida, p.lugar_servicio,
              p.no_incidente_c5, ts.nombre AS tipo_servicio, u.nombre AS elaboro,
              un.clave AS unidad
         FROM parte p
         JOIN tipo_servicio ts ON ts.id = p.tipo_servicio_id
         JOIN usuario u        ON u.id  = p.elaboro_id
         LEFT JOIN unidad un   ON un.id = p.unidad_id
        WHERE p.estado = ? AND ts.division_id = ?
        ORDER BY p.fecha DESC, p.hora_salida DESC`,
      [pestana.estado, division],
    );

    const cuentas = await filas(
      `SELECT p.estado, COUNT(*) AS n
         FROM parte p JOIN tipo_servicio ts ON ts.id = p.tipo_servicio_id
        WHERE ts.division_id = ?
        GROUP BY p.estado`,
      [division],
    );

    // Cuantos partes hay en cada estado, para el numerito de cada pestana.
    const porEstado = {};
    for (const c of cuentas) {
      porEstado[c.estado] = Number(c.n);
    }

    res.render('revision/bandeja', {
      titulo: 'Bandeja de revisión',
      id: 'bandeja',
      contexto: 'Revisión',
      partes,
      pestanas: PESTANAS.map((p) => ({
        clave: p.clave,
        estado: p.estado,
        texto: p.texto,
        cuenta: porEstado[p.estado] || 0,
      })),
      pestanaActual: pestana.clave,
    });
  } catch (error) {
    siguiente(error);
  }
});

// Carga el parte y comprueba que sea de la división del revisor.
async function cargarParaRevision(req, res) {
  const parte = await parteDb.cargar(Number(req.params.id));

  if (!parte) {
    res.status(404).render('no-existe', { ruta: req.originalUrl });
    return null;
  }
  if (parte.division_id !== req.usuario.division_id) {
    res.status(403).render('sin-permiso', {
      titulo: 'Ese parte es de otra división',
      roles: [`revisor de ${parte.division || 'esa división'}`],
    });
    return null;
  }
  return parte;
}

// Revisar parte (RF-09): la pirámide invertida de la Figura 7.
router.get('/revision/:id', sesion.exigirRol('revisor'), async (req, res, siguiente) => {
  try {
    const parte = await cargarParaRevision(req, res);
    if (!parte) return;

    // Si dos revisores abren el mismo parte, el segundo ve quién decidió y
    // cuándo, sin botones: la tabla revision ya tiene ese registro.
    const decidido = parte.estado === 'validado'
      ? parte.revisiones.find((r) => r.decision === 'validado')
      : null;

    // Sólo se decide sobre un parte que ya se firmó y envió. Un borrador se
    // puede abrir desde Consulta, pero no hay nada que validar todavía.
    const sinEnviar = parte.estado === 'borrador';

    res.render('revision/detalle', {
      titulo: `Revisar ${parte.folio}`,
      id: 'bandeja-detalle',
      contexto: 'Revisión',
      parte,
      faltas: parteDb.revisionAutomatica(parte),
      decidido,
      sinEnviar,
      pasos: parteDb.PASOS.filter((p) => p.clave !== 'firma'),
    });
  } catch (error) {
    siguiente(error);
  }
});

// Validar sella el parte, guarda su hash y fija el resguardo a diez años.
// Devolver manda la nota con el paso al que lleva, para que la Johnson Box
// del bombero abra directo ahí.
router.post('/revision/:id', sesion.exigirRol('revisor'), async (req, res, siguiente) => {
  try {
    const parte = await cargarParaRevision(req, res);
    if (!parte) return;
    // Sólo se decide sobre un parte enviado: ni un borrador, ni uno ya
    // validado, ni uno que está devuelto esperando corrección.
    if (parte.estado !== 'enviado') return res.redirect(`/revision/${parte.id}`);

    if (req.body.decision === 'devolver') {
      const nota = String(req.body.nota || '').trim();
      if (!nota) return res.redirect(`/revision/${parte.id}?falta_nota=1`);

      const paso = ['datos', 'personas', 'croquis'].includes(req.body.paso)
        ? req.body.paso
        : 'datos';

      await ejecutar(
        "INSERT INTO revision (parte_id, revisor_id, decision, nota, paso) VALUES (?, ?, 'devuelto', ?, ?)",
        [parte.id, req.usuario.id, nota, paso],
      );
      await ejecutar("UPDATE parte SET estado = 'devuelto' WHERE id = ?", [parte.id]);

      return res.redirect('/revision?ver=devueltos');
    }

    await ejecutar(
      "INSERT INTO revision (parte_id, revisor_id, decision) VALUES (?, ?, 'validado')",
      [parte.id, req.usuario.id],
    );
    await ejecutar("UPDATE parte SET estado = 'validado' WHERE id = ?", [parte.id]);
    await sellado.sellar(await parteDb.cargar(parte.id));

    res.redirect(`/revision/${parte.id}`);
  } catch (error) {
    siguiente(error);
  }
});

module.exports = router;
