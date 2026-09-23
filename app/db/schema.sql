-- Sistema de parte digital · Bomberos de Ensenada
-- Las 17 tablas del diagrama entidad-relación (Figura 2), sus claves
-- foráneas y los índices de la Tabla 4. InnoDB y utf8mb4.
--
--   npm run db:crear      (o: mysql -u root -p < db/schema.sql)

DROP DATABASE IF EXISTS parte_digital;
CREATE DATABASE parte_digital
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE parte_digital;

-- 1. estacion · las estaciones de la ciudad
CREATE TABLE estacion (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero VARCHAR(8)   NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_estacion_numero (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. division · estructural, forestales, rescate urbano… decide a qué revisor le llega cada parte (O4)
CREATE TABLE division (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_division_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. unidad · los vehículos (DB-02, Pipa 04…)
CREATE TABLE unidad (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave       VARCHAR(20)  NOT NULL,
  estacion_id INT UNSIGNED NULL,
  division_id INT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unidad_clave (clave),
  KEY idx_unidad_estacion (estacion_id),
  KEY idx_unidad_division (division_id),
  CONSTRAINT fk_unidad_estacion FOREIGN KEY (estacion_id) REFERENCES estacion (id),
  CONSTRAINT fk_unidad_division FOREIGN KEY (division_id) REFERENCES division (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. usuario · bombero, revisor o Dirección. UNIQUE en no_empleado (Tabla 4)
CREATE TABLE usuario (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  no_empleado VARCHAR(20)  NOT NULL,
  nombre      VARCHAR(160) NOT NULL,
  rol         ENUM('bombero','revisor','direccion') NOT NULL DEFAULT 'bombero',
  cargo       VARCHAR(80)  NULL,
  division_id INT UNSIGNED NULL,
  estacion_id INT UNSIGNED NULL,
  turno       ENUM('A','B','C','D','unico') NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_no_empleado (no_empleado),
  KEY idx_usuario_division (division_id),
  KEY idx_usuario_estacion (estacion_id),
  CONSTRAINT fk_usuario_division FOREIGN KEY (division_id) REFERENCES division (id),
  CONSTRAINT fk_usuario_estacion FOREIGN KEY (estacion_id) REFERENCES estacion (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. credencial · WebAuthn: sólo la llave pública, nunca la huella (RNF-05)
CREATE TABLE credencial (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id    INT UNSIGNED NOT NULL,
  credential_id VARCHAR(255) NOT NULL,
  llave_publica TEXT         NOT NULL,
  contador      INT UNSIGNED NOT NULL DEFAULT 0,
  creada_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credencial_credential_id (credential_id),
  KEY idx_credencial_usuario (usuario_id),
  CONSTRAINT fk_credencial_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. codigo_alta · el código de un solo uso de la Dirección. Se guarda el hash, no el código
CREATE TABLE codigo_alta (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  codigo_hash CHAR(64)     NOT NULL,
  expira_en   DATETIME     NOT NULL,
  usado_en    DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_codigo_alta_usuario (usuario_id),
  KEY idx_codigo_alta_hash (codigo_hash),
  CONSTRAINT fk_codigo_alta_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. fundamento_normativo · el ordenamiento y el artículo que cita el parte (N8). En el seed van POR DEFINIR
CREATE TABLE fundamento_normativo (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ordenamiento VARCHAR(200) NOT NULL,
  articulo     VARCHAR(80)  NOT NULL,
  texto        TEXT         NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. tipo_servicio · pertenece a una división y trae un fundamento por defecto
CREATE TABLE tipo_servicio (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(120) NOT NULL,
  division_id   INT UNSIGNED NOT NULL,
  fundamento_id INT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipo_servicio_nombre (nombre),
  KEY idx_tipo_servicio_division (division_id),
  KEY idx_tipo_servicio_fundamento (fundamento_id),
  CONSTRAINT fk_tipo_servicio_division   FOREIGN KEY (division_id)   REFERENCES division (id),
  CONSTRAINT fk_tipo_servicio_fundamento FOREIGN KEY (fundamento_id) REFERENCES fundamento_normativo (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. parte · la tabla central
CREATE TABLE parte (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  folio             VARCHAR(20)   NOT NULL,
  no_incidente_c5   VARCHAR(40)   NULL,
  nuc               VARCHAR(40)   NULL,
  fecha             DATE          NULL,
  hora_salida       TIME          NULL,
  hora_regreso      TIME          NULL,
  unidad_id         INT UNSIGNED  NULL,
  estacion_id       INT UNSIGNED  NULL,
  turno             ENUM('A','B','C','D','unico') NULL,
  tipo_servicio_id  INT UNSIGNED  NULL,
  fundamento_id     INT UNSIGNED  NULL,
  zona              ENUM('rural','urbana') NULL,
  despacho          VARCHAR(120)  NULL,
  lugar_servicio    VARCHAR(255)  NULL,
  latitud           DECIMAL(10,6) NULL,
  longitud          DECIMAL(10,6) NULL,
  descripcion       TEXT          NULL,
  requiere_peritaje TINYINT(1)    NULL,
  estado            ENUM('borrador','enviado','devuelto','validado') NOT NULL DEFAULT 'borrador',
  elaboro_id        INT UNSIGNED  NOT NULL,
  creado_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  enviado_en        DATETIME      NULL,
  PRIMARY KEY (id),

  -- Tabla 4 · identificadores únicos
  UNIQUE KEY uq_parte_folio (folio),

  -- Tabla 4 · bandeja y pestañas del revisor
  KEY idx_parte_estado_fecha (estado, fecha),
  -- Tabla 4 · Johnson Box de Inicio; también cubre la FK de elaboro_id
  KEY idx_parte_elaboro_estado (elaboro_id, estado),
  -- Tabla 4 · rango de fechas en Consulta
  KEY idx_parte_fecha (fecha),
  -- Tabla 4 · búsqueda exacta cuando la pide el 911 o la fiscalía (O3)
  KEY idx_parte_c5 (no_incidente_c5),
  KEY idx_parte_nuc (nuc),
  -- Tabla 4 · filtros de la Dirección y bandeja por división
  KEY idx_parte_unidad (unidad_id),
  KEY idx_parte_estacion (estacion_id),
  KEY idx_parte_tipo (tipo_servicio_id),
  KEY idx_parte_fundamento (fundamento_id),
  -- Tabla 4 · buscador "folio, ubicación o nombre"
  FULLTEXT KEY ft_parte_texto (lugar_servicio, descripcion),

  CONSTRAINT fk_parte_unidad     FOREIGN KEY (unidad_id)        REFERENCES unidad (id),
  CONSTRAINT fk_parte_estacion   FOREIGN KEY (estacion_id)      REFERENCES estacion (id),
  CONSTRAINT fk_parte_tipo       FOREIGN KEY (tipo_servicio_id) REFERENCES tipo_servicio (id),
  CONSTRAINT fk_parte_fundamento FOREIGN KEY (fundamento_id)    REFERENCES fundamento_normativo (id),
  CONSTRAINT fk_parte_elaboro    FOREIGN KEY (elaboro_id)       REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. parte_personal · "personal de turno" del formato. PK compuesta: nadie se repite
CREATE TABLE parte_personal (
  parte_id   INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (parte_id, usuario_id),
  KEY idx_parte_personal_usuario (usuario_id),
  CONSTRAINT fk_parte_personal_parte   FOREIGN KEY (parte_id)   REFERENCES parte (id) ON DELETE CASCADE,
  CONSTRAINT fk_parte_personal_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. persona_involucrada · propietario, arrendatario, testigo y voluntarios, con un campo rol
CREATE TABLE persona_involucrada (
  id          INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  parte_id    INT UNSIGNED      NOT NULL,
  rol         ENUM('propietario','arrendatario','testigo','voluntario','tercero') NOT NULL,
  nombre      VARCHAR(160)      NOT NULL,
  edad        SMALLINT UNSIGNED NULL,
  telefono    VARCHAR(40)       NULL,
  domicilio   VARCHAR(255)      NULL,
  aseguradora VARCHAR(160)      NULL,
  PRIMARY KEY (id),
  KEY idx_persona_parte (parte_id),
  CONSTRAINT fk_persona_parte FOREIGN KEY (parte_id) REFERENCES parte (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. apoyo · unidades e instituciones de apoyo: en el papel piden los mismos datos
CREATE TABLE apoyo (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parte_id    INT UNSIGNED NOT NULL,
  tipo        ENUM('unidad','institucion') NOT NULL,
  institucion VARCHAR(160) NULL,
  no_unidad   VARCHAR(40)  NULL,
  a_cargo_de  VARCHAR(160) NULL,
  PRIMARY KEY (id),
  KEY idx_apoyo_parte (parte_id),
  CONSTRAINT fk_apoyo_parte FOREIGN KEY (parte_id) REFERENCES parte (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. croquis · uno por parte. origen dice si lo hizo la IA o el bombero (Figura 4)
CREATE TABLE croquis (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parte_id       INT UNSIGNED NOT NULL,
  origen         ENUM('ia','manual') NOT NULL DEFAULT 'ia',
  elementos      JSON         NULL,
  svg            MEDIUMTEXT   NULL,
  desactualizado TINYINT(1)   NOT NULL DEFAULT 0,
  generado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_croquis_parte (parte_id),
  CONSTRAINT fk_croquis_parte FOREIGN KEY (parte_id) REFERENCES parte (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. evidencia · las fotos del parte (RF-06)
CREATE TABLE evidencia (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parte_id  INT UNSIGNED NOT NULL,
  archivo   VARCHAR(255) NOT NULL,
  tomada_en DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_evidencia_parte (parte_id),
  CONSTRAINT fk_evidencia_parte FOREIGN KEY (parte_id) REFERENCES parte (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. firma · quien formula, el propietario y el testigo
CREATE TABLE firma (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parte_id   INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NULL,
  tipo       ENUM('formula','propietario','testigo') NOT NULL DEFAULT 'formula',
  firma      TEXT         NOT NULL,
  firmado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_firma_parte (parte_id),
  KEY idx_firma_usuario (usuario_id),
  CONSTRAINT fk_firma_parte   FOREIGN KEY (parte_id)   REFERENCES parte (id) ON DELETE CASCADE,
  CONSTRAINT fk_firma_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. revision · el historial: un parte puede devolverse más de una vez
CREATE TABLE revision (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parte_id   INT UNSIGNED NOT NULL,
  revisor_id INT UNSIGNED NOT NULL,
  decision   ENUM('validado','devuelto') NOT NULL,
  nota       TEXT         NULL,
  paso       ENUM('datos','personas','croquis','firma') NULL,
  fecha      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_revision_parte (parte_id),
  KEY idx_revision_revisor (revisor_id),
  CONSTRAINT fk_revision_parte   FOREIGN KEY (parte_id)   REFERENCES parte (id) ON DELETE CASCADE,
  CONSTRAINT fk_revision_revisor FOREIGN KEY (revisor_id) REFERENCES usuario (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. archivo · el resguardo de 10 años (N7). El trámite de destrucción queda fuera del sistema
CREATE TABLE archivo (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  parte_id                 INT UNSIGNED NOT NULL,
  pdf_ruta                 VARCHAR(255) NOT NULL,
  hash_sha256              CHAR(64)     NOT NULL,
  archivado_en             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resguardo_hasta          DATE         NOT NULL,
  autorizacion_destruccion VARCHAR(160) NULL,
  destruido_en             DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_archivo_parte (parte_id),
  -- Tabla 4 · pantalla de Archivo: partes con resguardo vencido
  KEY idx_archivo_resguardo (resguardo_hasta),
  CONSTRAINT fk_archivo_parte FOREIGN KEY (parte_id) REFERENCES parte (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
