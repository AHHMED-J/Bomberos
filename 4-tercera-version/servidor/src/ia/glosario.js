// Palabras locales que Whisper suele escribir mal (ver pruebas del equipo: «Riverol», «Sausal», «López Mateo»,
// «pistón»). Son nombres públicos de lugares y términos técnicos; NO poner aquí datos de personas.
module.exports = {
  // Se le pasa a Whisper como contexto inicial para que prefiera estas grafías.
  contextoWhisper:
    'Parte de Bomberos de Ensenada, Baja California. El Sauzal, Maneadero, Chapultepec, Valle Dorado, ' +
    'López Mateos, Riveroll, Reforma, Ruiz, Juárez. Pitón de niebla, línea de 1½ pulgadas, C-5, NUC, ' +
    'unidad E7, pipa, ambulancia, Cruz Roja, Protección Civil.',

  // Correcciones deterministas sobre el texto de Whisper (palabra completa, sin importar mayúsculas).
  correcciones: [
    [/\briverol\b/gi, 'Riveroll'],
    [/\bsau[sz]a+l\b/gi, 'Sauzal'], // «Sausal», «Sauzaal»
    [/\bl[óo]pez mateo\b(?!s)/gi, 'López Mateos'],
    [/\bpist[óo]n de niebla\b/gi, 'pitón de niebla'],
  ],
};
