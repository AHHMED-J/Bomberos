-- Datos de ejemplo · TODOS SON FICTICIOS.
--
-- Salen de los mockups publicados (docs/screens/) y de las figuras 6 y 7
-- del documento, que ya se declaran como datos de ejemplo. No se tomó nada
-- del formato en papel real: ni nombres, ni teléfonos, ni domicilios, ni
-- números de incidente. Los nombres del personal son los del equipo, que
-- es lo que aparece dibujado en los mockups.

USE parte_digital;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE archivo;
TRUNCATE TABLE revision;
TRUNCATE TABLE firma;
TRUNCATE TABLE evidencia;
TRUNCATE TABLE croquis;
TRUNCATE TABLE apoyo;
TRUNCATE TABLE persona_involucrada;
TRUNCATE TABLE parte_personal;
TRUNCATE TABLE parte;
TRUNCATE TABLE tipo_servicio;
TRUNCATE TABLE fundamento_normativo;
TRUNCATE TABLE codigo_alta;
TRUNCATE TABLE credencial;
TRUNCATE TABLE usuario;
TRUNCATE TABLE unidad;
TRUNCATE TABLE division;
TRUNCATE TABLE estacion;
SET FOREIGN_KEY_CHECKS = 1;

-- --- Estaciones ------------------------------------------------------------
INSERT INTO estacion (id, numero, nombre) VALUES
  (1, '1', 'Estación Central'),
  (2, '2', 'Estación Maneadero'),
  (3, '3', 'Estación Valle Dorado');

-- --- Divisiones (Tabla 7 de la entrevista) ---------------------------------
INSERT INTO division (id, nombre) VALUES
  (1, 'Estructural'),
  (2, 'Inspectores'),
  (3, 'Forestales'),
  (4, 'Salvavidas'),
  (5, 'Atención prehospitalaria'),
  (6, 'Rescate urbano'),
  (7, 'Investigación de incendios');

-- --- Unidades (las de los mockups) -----------------------------------------
INSERT INTO unidad (id, clave, estacion_id, division_id) VALUES
  (1, 'Unidad 12', 1, 1),
  (2, 'Pipa 04',   1, 1),
  (3, 'DB-02',     3, 1),
  (4, 'Unidad 08', 2, 6),
  (5, 'Unidad 21', 1, 3);

-- --- Personal --------------------------------------------------------------
-- Dos bomberos, dos revisores de división distinta y una persona de la
-- Dirección. Son los usuarios de prueba del selector de sesión.
INSERT INTO usuario (id, no_empleado, nombre, rol, cargo, division_id, estacion_id, turno) VALUES
  (1, '376285', 'Jalife Burgueño, Ahhmed',      'bombero',   'Comandante',        1, 1, 'A'),
  (2, '380207', 'Acevedo Carrillo, Verónica',   'bombero',   'Bombero',           1, 1, 'A'),
  (3, '379219', 'Rivera Chávez, Josselyn Alexa','revisor',   'Jefa de batallón',  1, 1, 'A'),
  (4, '376290', 'Tamayo Salcedo, Elias',        'revisor',   'Jefe operativo',    6, 2, 'B'),
  (5, '365239', 'Cornejo Escobar, Arturo',      'direccion', 'Dirección',      NULL, 1, NULL),
  (6, '381044', 'Bombero de nuevo ingreso',     'bombero',   'Bombero',           3, 3, 'C');

-- --- Credenciales ----------------------------------------------------------
-- SIMULADO: la llave pública es un texto de ejemplo (nunca la huella, RNF-05).
INSERT INTO credencial (usuario_id, credential_id, llave_publica, contador) VALUES
  (1, 'demo-cred-376285', 'SIMULADA · llave pública de ejemplo', 4),
  (2, 'demo-cred-380207', 'SIMULADA · llave pública de ejemplo', 1),
  (3, 'demo-cred-379219', 'SIMULADA · llave pública de ejemplo', 7),
  (4, 'demo-cred-376290', 'SIMULADA · llave pública de ejemplo', 2),
  (5, 'demo-cred-365239', 'SIMULADA · llave pública de ejemplo', 9);

-- --- Códigos de alta -------------------------------------------------------
-- El usuario 6 todavía no tiene credencial. Su código de un solo uso es
-- 4F2K9, el que aparece dibujado en registro-credencial.html; aquí se guarda
-- su SHA-256, no el código. Vence en 24 horas.
INSERT INTO codigo_alta (usuario_id, codigo_hash, expira_en, usado_en) VALUES
  (6, '5f3f7e6f7943c3acdf662eb203b18d99065725ac1cc67a527233344378d0184a',
      DATE_ADD(NOW(), INTERVAL 24 HOUR), NULL);

-- --- Fundamento normativo --------------------------------------------------
-- POR DEFINIR con la Dirección. Los artículos concretos del reglamento no se
-- inventan: cada renglón queda marcado hasta que la Dirección los capture.
INSERT INTO fundamento_normativo (id, ordenamiento, articulo, texto) VALUES
  (1, 'POR DEFINIR con la Dirección', 'POR DEFINIR', 'Fundamento del servicio de combate de incendios. Pendiente de capturar con la Dirección.'),
  (2, 'POR DEFINIR con la Dirección', 'POR DEFINIR', 'Fundamento del servicio de rescate. Pendiente de capturar con la Dirección.'),
  (3, 'POR DEFINIR con la Dirección', 'POR DEFINIR', 'Fundamento de inspección y prevención. Pendiente de capturar con la Dirección.'),
  (4, 'POR DEFINIR con la Dirección', 'POR DEFINIR', 'Fundamento de investigación de incendios. Pendiente de capturar con la Dirección.');

-- --- Tipos de servicio -----------------------------------------------------
INSERT INTO tipo_servicio (id, nombre, division_id, fundamento_id) VALUES
  (1, 'Incendio estructural',      1, 1),
  (2, 'Fuga de gas',               1, 1),
  (3, 'Incendio de pastizal',      3, 1),
  (4, 'Incendio forestal',         3, 1),
  (5, 'Rescate vehicular',         6, 2),
  (6, 'Rescate urbano',            6, 2),
  (7, 'Búsqueda y salvamento',     4, 2),
  (8, 'Atención prehospitalaria',  5, 2),
  (9, 'Inspección',                2, 3),
  (10,'Investigación de incendio', 7, 4);

-- Partes de ejemplo (folios PE-2026-0140 a 0147). Los estados están
-- repartidos a propósito para que cada pantalla tenga algo que mostrar.
INSERT INTO parte
  (id, folio, no_incidente_c5, nuc, fecha, hora_salida, hora_regreso, unidad_id,
   estacion_id, turno, tipo_servicio_id, fundamento_id, zona, despacho,
   lugar_servicio, latitud, longitud, descripcion, requiere_peritaje, estado,
   elaboro_id, creado_en, enviado_en)
VALUES
  -- Validado y archivado: es el que abre panel-detalle.html en los mockups.
  (1, 'PE-2026-0147', 'C-5 204517', NULL, '2026-09-08', '14:35', '16:05', 1, 1, 'A', 1, 1,
   'urbana', 'C-5', 'Av. Reforma 1245, Col. Obrera', 31.866700, -116.596400,
   'Casa de dos plantas sobre la acera norte. El fuego salía por la ventana del segundo piso. La Unidad 12 se estacionó enfrente y se tomó agua del hidrante de la esquina.',
   1, 'validado', 1, '2026-09-08 14:35:00', '2026-09-08 16:30:00'),

  (2, 'PE-2026-0146', 'C-5 204498', NULL, '2026-09-08', '09:05', '10:12', 2, 1, 'A', 2, 1,
   'urbana', 'C-5', 'Calle Séptima 320, Col. Obrera', 31.858900, -116.611200,
   'Olor a gas en la banqueta. Se cerró la válvula del tanque estacionario y se ventiló el inmueble.',
   0, 'validado', 1, '2026-09-08 09:05:00', '2026-09-08 10:40:00'),

  (3, 'PE-2026-0145', 'C-5 204390', 'NUC 0912/2026', '2026-09-07', '11:20', '13:00', 4, 2, 'B', 5, 2,
   'rural', '911', 'Carretera Transpeninsular km 106', 31.742300, -116.601800,
   'Volcadura de una camioneta fuera de la carpeta. Se estabilizó el vehículo y se entregó a la ambulancia.',
   1, 'validado', 1, '2026-09-07 11:20:00', '2026-09-07 13:30:00'),

  -- Devuelto: es el renglón rojo de la Johnson Box (Figura 6).
  (4, 'PE-2026-0142', 'C-5 204301', NULL, '2026-09-06', '08:40', NULL, 5, 3, 'C', 3, 1,
   'rural', 'C-5', 'Camino al Tigre s/n, Valle Dorado', 31.912400, -116.512900,
   'Pastizal encendido a un costado del camino. Se hizo línea de defensa con la Unidad 21.',
   0, 'devuelto', 1, '2026-09-06 08:40:00', '2026-09-06 12:05:00'),

  -- Borrador a medias: el segundo renglón de la Johnson Box.
  (5, 'PE-2026-0141', NULL, NULL, '2026-09-09', '07:15', NULL, 1, 1, 'A', NULL, NULL,
   'urbana', NULL, 'Av. Reforma 1245, Col. Obrera', NULL, NULL,
   NULL, NULL, 'borrador', 1, '2026-09-09 07:15:00', NULL),

  -- Enviado, de otra división: sólo lo ve el revisor de Rescate urbano.
  (6, 'PE-2026-0144', 'C-5 204355', NULL, '2026-09-07', '18:02', '19:40', 4, 2, 'B', 6, 2,
   'urbana', '911', 'Cañón del Buey, Col. Ampliación', 31.831100, -116.588700,
   'Persona atrapada en una zanja de obra. Se armó anclaje y se extrajo con camilla rígida.',
   0, 'enviado', 2, '2026-09-07 18:02:00', '2026-09-07 20:10:00'),

  -- Enviado: es el que se revisa en la demo (división Estructural).
  (7, 'PE-2026-0143', 'C-5 204322', NULL, '2026-09-06', '21:30', '23:05', 2, 1, 'A', 2, 1,
   'urbana', 'C-5', 'Calle Novena 88, Col. Bustamante', 31.861200, -116.617400,
   'Reporte de fuga en un tanque portátil dentro de una fonda. Se retiró el tanque a la vía pública.',
   0, 'enviado', 2, '2026-09-06 21:30:00', '2026-09-06 23:20:00'),

  (8, 'PE-2026-0140', 'C-5 204288', NULL, '2026-09-05', '13:10', '14:25', 5, 3, 'C', 4, 1,
   'rural', 'C-5', 'Ejido El Porvenir, brecha norte', 31.955000, -116.480000,
   'Incendio forestal en ladera. Se atacó con herramienta manual y apoyo de la Unidad 21.',
   0, 'validado', 2, '2026-09-05 13:10:00', '2026-09-05 15:00:00'),

  -- Dos partes viejos, para que la pantalla de Archivo tenga resguardos ya
  -- vencidos que mostrar. También son datos de ejemplo.
  (9, 'PE-2015-0088', 'C-5 118840', NULL, '2015-07-14', '10:00', '11:30', 3, 3, 'unico', 1, 1,
   'urbana', 'C-5', 'Calle Primera 410, Zona Centro', NULL, NULL,
   'Parte de ejemplo con resguardo de diez años ya vencido.',
   0, 'validado', 1, '2015-07-14 10:00:00', '2015-07-14 12:00:00'),

  (10,'PE-2016-0031', 'C-5 126117', NULL, '2016-02-02', '16:45', '17:50', 1, 1, 'unico', 5, 2,
   'urbana', '911', 'Blvd. Costero y Riveroll', NULL, NULL,
   'Parte de ejemplo con resguardo de diez años ya vencido y destrucción autorizada.',
   0, 'validado', 2, '2016-02-02 16:45:00', '2016-02-02 18:10:00');

-- --- Personal de turno de cada parte ---------------------------------------
INSERT INTO parte_personal (parte_id, usuario_id) VALUES
  (1,1), (1,2),
  (2,1),
  (3,1), (3,2),
  (4,1),
  (6,2),
  (7,2), (7,1),
  (8,2);

-- --- Personas involucradas -------------------------------------------------
-- Nombres, teléfonos y domicilios inventados para la demo.
INSERT INTO persona_involucrada (parte_id, rol, nombre, edad, telefono, domicilio, aseguradora) VALUES
  (1, 'propietario', 'Propietario de ejemplo', 54, '646 000 0000', 'Av. Reforma 1245, Col. Obrera', 'Aseguradora de ejemplo'),
  (1, 'testigo',     'Testigo de ejemplo',     37, '646 000 0001', 'Av. Reforma 1243, Col. Obrera', NULL),
  (3, 'propietario', 'Propietario de ejemplo', 41, '646 000 0002', 'Domicilio de ejemplo',          'Aseguradora de ejemplo'),
  (7, 'propietario', 'Propietario de ejemplo', 62, '646 000 0003', 'Calle Novena 88, Col. Bustamante', NULL),
  (4, 'voluntario',  'Voluntario de ejemplo',  29, NULL,           NULL,                            NULL);

-- --- Apoyos ----------------------------------------------------------------
INSERT INTO apoyo (parte_id, tipo, institucion, no_unidad, a_cargo_de) VALUES
  (1, 'unidad',      NULL,                    'Pipa 04',   'Acevedo Carrillo, Verónica'),
  (1, 'institucion', 'Cruz Roja',             'A-17',      'Paramédico de guardia'),
  (3, 'institucion', 'Policía Municipal',     'P-204',     'Oficial de ejemplo'),
  (6, 'institucion', 'Protección Civil',      'PC-03',     'Coordinador de ejemplo'),
  (8, 'unidad',      NULL,                    'Unidad 21', 'Jalife Burgueño, Ahhmed');

-- --- Croquis ---------------------------------------------------------------
-- SIMULADO: el SVG lo dibuja src/croquis.js; aquí sólo va el origen.
INSERT INTO croquis (parte_id, origen, elementos, desactualizado) VALUES
  (1, 'ia', '{"elementos":[{"tipo":"estructura","etiqueta":"Casa de dos plantas"},{"tipo":"fuego","etiqueta":"Foco de fuego"},{"tipo":"unidad","etiqueta":"Unidad 12"},{"tipo":"hidrante","etiqueta":"Hidrante"}]}', 0),
  (3, 'manual', '{"elementos":[{"tipo":"vehiculo","etiqueta":"Camioneta volcada"},{"tipo":"unidad","etiqueta":"Unidad 08"}]}', 0);

-- --- Evidencia -------------------------------------------------------------
-- Rutas de ejemplo: el prototipo no sube fotos de verdad.
INSERT INTO evidencia (parte_id, archivo, tomada_en) VALUES
  (1, 'ejemplo/foto-01.jpg', '2026-09-08 14:52:00'),
  (1, 'ejemplo/foto-02.jpg', '2026-09-08 15:04:00'),
  (3, 'ejemplo/foto-03.jpg', '2026-09-07 12:10:00');

-- --- Firmas ----------------------------------------------------------------
-- SIMULADO: la firma del prototipo es un texto, no una aserción WebAuthn.
INSERT INTO firma (parte_id, usuario_id, tipo, firma, firmado_en) VALUES
  (1, 1, 'formula',     'SIMULADA · demo-cred-376285', '2026-09-08 16:30:00'),
  (1, NULL,'propietario','SIMULADA · firma de trazo',   '2026-09-08 16:28:00'),
  (1, NULL,'testigo',   'SIMULADA · firma de trazo',   '2026-09-08 16:29:00'),
  (2, 1, 'formula',     'SIMULADA · demo-cred-376285', '2026-09-08 10:40:00'),
  (3, 1, 'formula',     'SIMULADA · demo-cred-376285', '2026-09-07 13:30:00'),
  (4, 1, 'formula',     'SIMULADA · demo-cred-376285', '2026-09-06 12:05:00'),
  (6, 2, 'formula',     'SIMULADA · demo-cred-380207', '2026-09-07 20:10:00'),
  (7, 2, 'formula',     'SIMULADA · demo-cred-380207', '2026-09-06 23:20:00'),
  (8, 2, 'formula',     'SIMULADA · demo-cred-380207', '2026-09-05 15:00:00'),
  (9, 1, 'formula',     'SIMULADA · demo-cred-376285', '2015-07-14 12:00:00'),
  (10,2, 'formula',     'SIMULADA · demo-cred-380207', '2016-02-02 18:10:00');

-- --- Revisiones ------------------------------------------------------------
INSERT INTO revision (parte_id, revisor_id, decision, nota, paso, fecha) VALUES
  (1, 3, 'validado', NULL, NULL, '2026-09-08 17:10:00'),
  (2, 3, 'validado', NULL, NULL, '2026-09-08 11:15:00'),
  (3, 4, 'validado', NULL, NULL, '2026-09-07 14:20:00'),
  (4, 3, 'devuelto', 'Falta la hora de control del fuego y el regreso a la estación.', 'datos', '2026-09-06 13:40:00'),
  (8, 3, 'validado', NULL, NULL, '2026-09-05 16:00:00'),
  (9, 3, 'validado', NULL, NULL, '2015-07-14 13:00:00'),
  (10,3, 'validado', NULL, NULL, '2016-02-02 19:00:00');

-- --- Archivo (resguardo de 10 años) ----------------------------------------
-- El hash SHA-256 se calcula de verdad al validar; los de este seed son de
-- relleno, porque estos partes no pasaron por el sellado del prototipo.
INSERT INTO archivo (parte_id, pdf_ruta, hash_sha256, archivado_en, resguardo_hasta, autorizacion_destruccion, destruido_en) VALUES
  (1, 'almacen/PE-2026-0147.html', REPEAT('0', 64), '2026-09-08 17:10:00', '2036-09-08', NULL, NULL),
  (2, 'almacen/PE-2026-0146.html', REPEAT('0', 64), '2026-09-08 11:15:00', '2036-09-08', NULL, NULL),
  (3, 'almacen/PE-2026-0145.html', REPEAT('0', 64), '2026-09-07 14:20:00', '2036-09-07', NULL, NULL),
  (8, 'almacen/PE-2026-0140.html', REPEAT('0', 64), '2026-09-05 16:00:00', '2036-09-05', NULL, NULL),
  -- Resguardo vencido: estos dos son los que salen en /direccion/archivo.
  (9, 'almacen/PE-2015-0088.html', REPEAT('0', 64), '2015-07-14 13:00:00', '2025-07-14', NULL, NULL),
  (10,'almacen/PE-2016-0031.html', REPEAT('0', 64), '2016-02-02 19:00:00', '2026-02-02', 'Oficio de ejemplo SIND/000/2026', NULL);
