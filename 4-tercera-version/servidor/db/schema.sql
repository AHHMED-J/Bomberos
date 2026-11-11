-- BomberosApp · tercera versión
-- Las tablas de acceso (usuario, dispositivo, sesion), de la confirmación
-- con la llave del celular (reto) y de las firmas del parte (firma_parte).
--
-- La tabla parte de aquí es la MÍNIMA para probar la firma. Cuando exista el
-- esquema completo de la v3, se reemplaza por ese.
--
--   npm run db:crear   (crea la base de DB_NAME y corre este archivo)
--
-- No borra nada: si una tabla ya existe, la deja como está.

-- division · decide qué revisores pueden revisar cada parte
CREATE TABLE IF NOT EXISTS division (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_division_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- usuario · elementos (algunos habilitados por Dirección para revisar) y
-- Dirección. El usuario es su número de empleado.
CREATE TABLE IF NOT EXISTS usuario (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  no_empleado     VARCHAR(20)  NOT NULL,
  nombre          VARCHAR(160) NOT NULL,
  rol             ENUM('elemento','direccion') NOT NULL DEFAULT 'elemento',
  puede_revisar   TINYINT(1)   NOT NULL DEFAULT 0,  -- lo decide Dirección
  division_id     INT UNSIGNED NULL,
  contrasena_hash VARCHAR(72)  NOT NULL,            -- bcrypt
  firma_trazo     MEDIUMTEXT   NULL,                -- PNG en base64 (RF-13)
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_no_empleado (no_empleado),
  KEY idx_usuario_division (division_id),
  CONSTRAINT fk_usuario_division FOREIGN KEY (division_id) REFERENCES division (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- dispositivo · los celulares de cada usuario. Solo la llave pública: la
-- biometría y el PIN del teléfono se quedan en el celular (RNF-05).
CREATE TABLE IF NOT EXISTS dispositivo (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id    INT UNSIGNED NOT NULL,
  clave_hash    CHAR(64)     NOT NULL,  -- SHA-256 de la clave que guarda la app
  llave_publica VARCHAR(255) NOT NULL,  -- EC P-256, SPKI en base64
  plataforma    ENUM('android','ios') NOT NULL,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dispositivo_clave (clave_hash),
  KEY idx_dispositivo_usuario (usuario_id),
  CONSTRAINT fk_dispositivo_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- sesion · se guarda el SHA-256 del token, nunca el token
CREATE TABLE IF NOT EXISTS sesion (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash     CHAR(64)     NOT NULL,
  usuario_id     INT UNSIGNED NOT NULL,
  dispositivo_id INT UNSIGNED NULL,     -- NULL si se entró con contraseña y aún no se registra la llave
  creada_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en      DATETIME     NOT NULL,
  cerrada_en     DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sesion_token (token_hash),
  KEY idx_sesion_usuario (usuario_id),
  KEY idx_sesion_dispositivo (dispositivo_id),
  CONSTRAINT fk_sesion_usuario     FOREIGN KEY (usuario_id)     REFERENCES usuario (id),
  CONSTRAINT fk_sesion_dispositivo FOREIGN KEY (dispositivo_id) REFERENCES dispositivo (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- parte · MÍNIMA, solo para probar la firma. Los partes nunca se borran.
CREATE TABLE IF NOT EXISTS parte (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  folio       VARCHAR(20)  NOT NULL,
  division_id INT UNSIGNED NULL,
  datos       JSON         NOT NULL,
  estado      ENUM('borrador','enviado','devuelto','validado') NOT NULL DEFAULT 'borrador',
  elaboro_id  INT UNSIGNED NOT NULL,
  revisor_id  INT UNSIGNED NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_en  DATETIME     NULL,
  validado_en DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parte_folio (folio),
  KEY idx_parte_estado (estado),
  KEY idx_parte_elaboro (elaboro_id),
  KEY idx_parte_division (division_id),
  KEY idx_parte_revisor (revisor_id),
  CONSTRAINT fk_parte_division FOREIGN KEY (division_id) REFERENCES division (id),
  CONSTRAINT fk_parte_elaboro  FOREIGN KEY (elaboro_id)  REFERENCES usuario (id),
  CONSTRAINT fk_parte_revisor  FOREIGN KEY (revisor_id)  REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- reto · el mensaje único que el celular firma con su llave para entrar o
-- para firmar un parte. Vale 2 minutos y una sola vez.
CREATE TABLE IF NOT EXISTS reto (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED NOT NULL,
  dispositivo_id INT UNSIGNED NOT NULL,
  accion         ENUM('entrar','enviar','validar') NOT NULL,
  parte_id       INT UNSIGNED NULL,
  hash_contenido CHAR(64)     NULL,     -- SHA-256 del parte al pedir el reto
  mensaje        VARCHAR(400) NOT NULL, -- lo que firma el celular
  creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en      DATETIME     NOT NULL,
  usado_en       DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_reto_usuario (usuario_id),
  KEY idx_reto_dispositivo (dispositivo_id),
  KEY idx_reto_parte (parte_id),
  CONSTRAINT fk_reto_usuario     FOREIGN KEY (usuario_id)     REFERENCES usuario (id),
  CONSTRAINT fk_reto_dispositivo FOREIGN KEY (dispositivo_id) REFERENCES dispositivo (id),
  CONSTRAINT fk_reto_parte       FOREIGN KEY (parte_id)       REFERENCES parte (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- firma_parte · las firmas del autor y del revisor, con la evidencia de que
-- se confirmaron en su celular. Se puede volver a comprobar después:
-- firma_cripto, contra la llave pública del dispositivo y el mensaje del reto.
CREATE TABLE IF NOT EXISTS firma_parte (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parte_id       INT UNSIGNED NOT NULL,
  usuario_id     INT UNSIGNED NOT NULL,
  rol            ENUM('autor','revisor') NOT NULL,
  trazo          MEDIUMTEXT   NOT NULL, -- copia del trazo al firmar
  dispositivo_id INT UNSIGNED NOT NULL,
  reto_id        INT UNSIGNED NOT NULL,
  firma_cripto   VARCHAR(200) NOT NULL, -- la firma que hizo la llave del celular
  firmado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  anulada_en     DATETIME     NULL,     -- el autor volvió a firmar después de una devolución
  PRIMARY KEY (id),
  UNIQUE KEY uq_firma_reto (reto_id),
  KEY idx_firma_parte_rol (parte_id, rol),
  KEY idx_firma_usuario (usuario_id),
  KEY idx_firma_dispositivo (dispositivo_id),
  CONSTRAINT fk_firma_parte       FOREIGN KEY (parte_id)       REFERENCES parte (id),
  CONSTRAINT fk_firma_usuario     FOREIGN KEY (usuario_id)     REFERENCES usuario (id),
  CONSTRAINT fk_firma_dispositivo FOREIGN KEY (dispositivo_id) REFERENCES dispositivo (id),
  CONSTRAINT fk_firma_reto        FOREIGN KEY (reto_id)        REFERENCES reto (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
