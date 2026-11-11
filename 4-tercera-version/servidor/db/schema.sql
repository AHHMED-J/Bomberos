-- BomberosApp · tercera versión
-- Lo mismo que app-bomberos/servidor guarda en memoria (src/datos.js), en
-- MySQL: usuarios, códigos de alta, llaves, sesiones, retos y partes.
--
--   npm run db:crear   (crea la base de DB_NAME y corre este archivo)
--
-- No borra nada: si una tabla ya existe, la deja como está.

-- usuario · el id es el que usa la app (u-<matrícula>). La matrícula es el
-- número de empleado. rol: editor (elemento) o capitan (revisor).
CREATE TABLE IF NOT EXISTS usuario (
  id              VARCHAR(40)  NOT NULL,
  nombre          VARCHAR(160) NOT NULL,
  matricula       VARCHAR(20)  NOT NULL,
  rango           VARCHAR(40)  NOT NULL,
  rol             ENUM('editor','capitan') NOT NULL DEFAULT 'editor',
  division        VARCHAR(80)  NOT NULL,
  estacion        VARCHAR(80)  NOT NULL,
  contrasena_hash VARCHAR(72)  NULL,      -- bcrypt; para la entrada manual
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_matricula (matricula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- codigo_alta · el código de un solo uso que da Dirección
CREATE TABLE IF NOT EXISTS codigo_alta (
  codigo     VARCHAR(20) NOT NULL,
  usuario_id VARCHAR(40) NOT NULL,
  usado_en   DATETIME    NULL,
  PRIMARY KEY (codigo),
  KEY idx_codigo_usuario (usuario_id),
  CONSTRAINT fk_codigo_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- llave · las llaves públicas de los celulares de cada usuario (PEM, o el
-- texto SIMULADA en modo prueba). La biometría y el PIN del teléfono se
-- quedan en el celular. Dar de alta otro celular no quita las anteriores.
CREATE TABLE IF NOT EXISTS llave (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id    VARCHAR(40)  NOT NULL,
  llave_publica TEXT         NOT NULL,
  creada_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_llave_usuario (usuario_id),
  CONSTRAINT fk_llave_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
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

-- firma_parte · la evidencia de cada firma: quién, con qué reto, la firma
-- del celular y, en la del revisor, su trazo.
CREATE TABLE IF NOT EXISTS firma_parte (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  folio      VARCHAR(20)  NOT NULL,
  usuario_id VARCHAR(40)  NOT NULL,
  rol        ENUM('autor','revisor') NOT NULL,
  reto       VARCHAR(120) NOT NULL,
  firma      TEXT         NOT NULL,
  simulada   TINYINT(1)   NOT NULL DEFAULT 0,
  trazo      MEDIUMTEXT   NULL,
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
