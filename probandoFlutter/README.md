# probandoFlutter

Prueba mínima de la firma con llave en el chip seguro del iPhone (Secure Enclave) y Face ID.
No es la app final: sólo comprueba que la idea de `2-segunda-version/decisiones.md` funciona
sin la cuenta de pago de Apple.

## Qué hace

1. **Crear llave y registrar:** la app crea una llave ECDSA P-256 en el Secure Enclave (pide Face ID)
   y manda la llave pública al servidor.
2. **Firmar el parte:** el servidor devuelve un reto = número al azar + SHA-256 del texto del parte.
   La app lo firma con Face ID y el servidor verifica la firma con la llave pública.
3. **Borrar llave:** para repetir la prueba.

## Cómo correrlo

1. Terminal 1, en esta carpeta: `node servidor/servidor.js`
2. iPhone por cable, con Modo desarrollador activado y la Mac como equipo de confianza.
3. Terminal 2: `flutter run` (elige el iPhone). La IP del servidor en la app es la de la Mac en la
   red local (`ipconfig getifaddr en0`) y el iPhone debe estar en la misma red Wi-Fi.

Con Apple ID gratis la app caduca a los 7 días: se reinstala con `flutter run`.

## Qué hay que observar

- ¿Pide Face ID al crear la llave y al firmar?
- ¿El servidor dice FIRMA VÁLIDA?
- Cambiar una letra del texto, pedir un reto nuevo y firmar: la firma sigue válida, pero el hash del reto cambia
  (la firma queda ligada a ese contenido).
- Agregar otra cara o huella en Ajustes y firmar de nuevo: por defecto la llave se invalida
  (`setInvalidatedByBiometricEnrollment: true`).
