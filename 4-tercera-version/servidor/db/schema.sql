-- BomberosApp · tercera versión
-- Usuarios, sesiones, retos, partes y firmas.
--
--   npm run db:crear   (crea la base de DB_NAME y corre este archivo)
--
-- No borra nada: si una tabla ya existe, la deja como está.

-- usuario · el id es el que usa la app (u-<matrícula>). La matrícula es el
-- número de empleado, y con ella y su contraseña entra. Dirección lo da de
-- alta y le entrega la contraseña; él la puede cambiar.
-- rol: editor (elemento), capitan (revisor) o administracion (entra sólo a
-- la página web de Administración, no a la app).
-- activo: 0 = dado de baja. Nunca se borra a nadie: sus partes lo siguen citando.
-- debe_cambiar: 1 = entra con una contraseña que le dieron y debe cambiarla.
-- llave_publica: la del chip seguro de SU celular (uno por usuario), para
-- confirmar con la biometría. NULL = confirma con su contraseña.
-- trazo: su firma, que sube desde la app. Se guarda CIFRADA (src/boveda.js) y se
-- copia a cada parte que firma.
CREATE TABLE IF NOT EXISTS usuario (
  id              VARCHAR(40)  NOT NULL,
  nombre          VARCHAR(160) NOT NULL,
  matricula       VARCHAR(20)  NOT NULL,
  rango           VARCHAR(40)  NOT NULL,
  rol             ENUM('editor','capitan','administracion') NOT NULL DEFAULT 'editor',
  division        VARCHAR(80)  NOT NULL,
  estacion        VARCHAR(80)  NOT NULL,
  contrasena_hash VARCHAR(72)  NOT NULL,   -- bcrypt
  llave_publica   TEXT         NULL,
  trazo           MEDIUMTEXT   NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  debe_cambiar    TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_matricula (matricula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- sesion · se guarda el SHA-256 del token, nunca el token
CREATE TABLE IF NOT EXISTS sesion (
  token_hash CHAR(64)    NOT NULL,
  usuario_id VARCHAR(40) NOT NULL,
  creada_en  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_sesion_usuario (usuario_id),
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- reto · lo que firma el celular: azar + ':' + (acceso | SHA-256 del
-- contenido del parte). Vale 5 minutos y una sola vez.
CREATE TABLE IF NOT EXISTS reto (
  reto      VARCHAR(120) NOT NULL,
  creado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usado_en  DATETIME     NULL,
  PRIMARY KEY (reto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- parte · datos es el parte completo, tal como lo manda y lo lee la app.
-- estado, elaboro_id y division se repiten afuera para poder filtrar.
-- Los partes nunca se borran.
CREATE TABLE IF NOT EXISTS parte (
  folio          VARCHAR(20) NOT NULL,
  estado         ENUM('borrador','enviado','devuelto','validado') NOT NULL,
  elaboro_id     VARCHAR(40) NOT NULL,
  division       VARCHAR(80) NOT NULL,
  datos          JSON        NOT NULL,
  actualizado_en DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (folio),
  KEY idx_parte_elaboro (elaboro_id),
  KEY idx_parte_division_estado (division, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- firma_parte · la evidencia de cada firma: quién, con qué reto, cómo la
-- confirmó (biometría del celular o contraseña) y la copia de su trazo.
CREATE TABLE IF NOT EXISTS firma_parte (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  folio      VARCHAR(20)  NOT NULL,
  usuario_id VARCHAR(40)  NOT NULL,
  rol        ENUM('autor','revisor') NOT NULL,
  reto       VARCHAR(120) NOT NULL,
  metodo     ENUM('biometria','contrasena') NOT NULL,
  firma      TEXT         NULL,          -- la firma del celular; NULL si fue con contraseña
  simulada   TINYINT(1)   NOT NULL DEFAULT 0,
  trazo      MEDIUMTEXT   NOT NULL,
  firmada_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_firma_folio (folio),
  CONSTRAINT fk_firma_parte FOREIGN KEY (folio) REFERENCES parte (folio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- consecutivo · el siguiente número de folio (PE-<año>-<número>)
CREATE TABLE IF NOT EXISTS consecutivo (
  nombre VARCHAR(20)  NOT NULL,
  valor  INT UNSIGNED NOT NULL,
  PRIMARY KEY (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- El primer folio nuevo es el 153, como en el servidor de la app.
INSERT IGNORE INTO consecutivo (nombre, valor) VALUES ('folio', 152);

-- ---------------------------------------------------------------------------
-- Página web de Administración (4-tercera-version/administracion)
-- ---------------------------------------------------------------------------

-- credencial_web · las llaves de acceso (WebAuthn / passkeys) de cada cuenta de
-- Administración. Se guarda sólo la llave PÚBLICA; la privada nunca sale del
-- dispositivo (Touch ID, Face ID, Windows Hello o una llave USB).
-- contador: lo sube el dispositivo en cada uso; si baja, la llave fue copiada.
CREATE TABLE IF NOT EXISTS credencial_web (
  id          VARCHAR(255)  NOT NULL,          -- id de la credencial (base64url)
  usuario_id  VARCHAR(40)   NOT NULL,
  llave       BLOB          NOT NULL,          -- llave pública COSE (las post-cuánticas pasan de 1 KB)
  contador    INT UNSIGNED  NOT NULL DEFAULT 0,
  transportes VARCHAR(200)  NULL,
  nombre      VARCHAR(80)   NOT NULL,
  creada_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usada_en    DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_credencial_usuario (usuario_id),
  CONSTRAINT fk_credencial_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- sesion_web · sesiones del navegador. Como en sesion, sólo el SHA-256 del
-- token: el token vive en una cookie HttpOnly.
-- nivel: contrasena = ya dio su contraseña y le falta su llave de acceso;
--        completa   = ya confirmó con su llave. Sólo esta abre la página.
-- reto: el reto de WebAuthn que espera esta sesión (uno a la vez).
CREATE TABLE IF NOT EXISTS sesion_web (
  token_hash CHAR(64)     NOT NULL,
  usuario_id VARCHAR(40)  NOT NULL,
  nivel      ENUM('contrasena','completa') NOT NULL,
  reto       VARCHAR(128) NULL,
  ip         VARCHAR(45)  NULL,
  agente     VARCHAR(255) NULL,
  creada_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_sesion_web_usuario (usuario_id),
  CONSTRAINT fk_sesion_web_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- reto_web · el reto para entrar sólo con la llave de acceso (sin escribir el
-- número de empleado). El navegador guarda el id en una cookie; aquí su SHA-256.
CREATE TABLE IF NOT EXISTS reto_web (
  id_hash   CHAR(64)     NOT NULL,
  reto      VARCHAR(128) NOT NULL,
  creado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usado_en  DATETIME     NULL,
  PRIMARY KEY (id_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- bitacora · quién hizo qué en Administración: entradas, intentos fallidos,
-- altas, permisos, bajas, restablecimientos y exportaciones. No se borra.
CREATE TABLE IF NOT EXISTS bitacora (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id VARCHAR(40)  NULL,
  accion     VARCHAR(60)  NOT NULL,
  objetivo   VARCHAR(80)  NULL,
  detalle    JSON         NULL,
  ip         VARCHAR(45)  NULL,
  creada_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bitacora_fecha (creada_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Avisos (app y página web)
-- ---------------------------------------------------------------------------

-- notificacion · un renglón por destinatario. tipo: parte_por_revisar,
-- parte_devuelto, parte_validado o firma_cambiada. Quien los lee sólo ve los suyos.
CREATE TABLE IF NOT EXISTS notificacion (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id VARCHAR(40)  NOT NULL,
  tipo       VARCHAR(30)  NOT NULL,
  folio      VARCHAR(20)  NULL,
  titulo     VARCHAR(120) NOT NULL,
  texto      VARCHAR(400) NOT NULL DEFAULT '',
  creada_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leida_en   DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_notificacion_usuario (usuario_id, leida_en, id),
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
