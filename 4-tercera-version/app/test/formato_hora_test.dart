import 'package:bomberos_parte/compartido/campo_con_estado.dart';
import 'package:flutter_test/flutter_test.dart';

/// Escribe [teclas] una por una, como en el teclado del teléfono.
String escribir(String teclas, {String inicio = ''}) {
  const f = FormatoHora();
  var v = TextEditingValue(text: inicio);
  for (final t in teclas.split('')) {
    v = f.formatEditUpdate(v, TextEditingValue(text: '${v.text}$t'));
  }
  return v.text;
}

void main() {
  test('pone los dos puntos solo', () {
    expect(escribir('1435'), '14:35');
    expect(escribir('0905'), '09:05');
  });

  test('una hora de un dígito se completa con 0', () => expect(escribir('930'), '09:30'));

  test('no pasa de 23:59 ni de 4 cifras', () {
    expect(escribir('2'), '2');
    expect(escribir('25'), '2'); // 25 no es hora
    expect(escribir('1275'), '12:5'); // 75 no son minutos
    expect(escribir('123456'), '12:34');
  });

  test('borrar después de los «:» quita la cifra de antes', () {
    const f = FormatoHora();
    final v = f.formatEditUpdate(const TextEditingValue(text: '14:'), const TextEditingValue(text: '14'));
    expect(v.text, '14');
  });
}
