// Carga servidor/.env (si existe) en process.env. Lo que ya venga definido
// en el entorno gana. Lo piden src/db.js y los scripts antes de leer las
// variables de MySQL.
const fs = require('fs');
const path = require('path');

const archivo = path.join(__dirname, '..', '.env');
if (fs.existsSync(archivo)) process.loadEnvFile(archivo);
