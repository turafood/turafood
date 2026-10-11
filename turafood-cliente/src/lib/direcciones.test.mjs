import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enCobertura, parseDireccionCO, direccionCompleta, normalizarCelularCO, mostrarCelular, codigoValido, CENTRO,
} from './direcciones.mjs';

test('parseDireccionCO normaliza abreviaturas y número', () => {
  assert.deepEqual(parseDireccionCO('cra 5 # 12-34'), { calle: 'Carrera 5', numero: '12-34' });
  assert.deepEqual(parseDireccionCO('Kr 3 no. 4-5'), { calle: 'Carrera 3', numero: '4-5' });
  assert.deepEqual(parseDireccionCO('cl 2 #8'), { calle: 'Calle 2', numero: '8' });
  assert.deepEqual(parseDireccionCO('av simón bolívar'), { calle: 'Avenida simón bolívar', numero: '' });
  assert.deepEqual(parseDireccionCO('  tv   7  '), { calle: 'Transversal 7', numero: '' });
});

test('parseDireccionCO no rompe con entradas raras', () => {
  assert.deepEqual(parseDireccionCO(''), { calle: '', numero: '' });
  assert.deepEqual(parseDireccionCO(null), { calle: '', numero: '' });
  assert.deepEqual(parseDireccionCO('Barrio El Jorge'), { calle: 'Barrio El Jorge', numero: '' });
});

test('direccionCompleta arma la línea', () => {
  assert.equal(direccionCompleta({ calle: 'Carrera 3', numero: '4-58' }), 'Carrera 3 #4-58');
  assert.equal(direccionCompleta({ calle: 'Calle 2', numero: '' }), 'Calle 2');
});

test('cobertura: acepta Buenaventura y rechaza Cali, Bogotá y datos inválidos', () => {
  assert.equal(enCobertura(CENTRO.lat, CENTRO.lng), true);
  assert.equal(enCobertura(3.8700, -77.0541), true);   // La Independencia
  assert.equal(enCobertura(3.45, -76.53), false);       // Cali
  assert.equal(enCobertura(4.71, -74.07), false);       // Bogotá
  assert.equal(enCobertura(NaN, -77), false);
  assert.equal(enCobertura(undefined, undefined), false);
});

test('celular colombiano: formatos válidos e inválidos', () => {
  assert.equal(normalizarCelularCO('300 123 4567'), '+573001234567');
  assert.equal(normalizarCelularCO('3001234567'), '+573001234567');
  assert.equal(normalizarCelularCO('+57 300 123 4567'), '+573001234567');
  assert.equal(normalizarCelularCO('573001234567'), '+573001234567');
  assert.equal(normalizarCelularCO('(300) 123-4567'), '+573001234567');
  assert.equal(normalizarCelularCO('2001234567'), null);   // no empieza por 3
  assert.equal(normalizarCelularCO('300123456'), null);    // faltan dígitos
  assert.equal(normalizarCelularCO(''), null);
  assert.equal(normalizarCelularCO(null), null);
});

test('mostrarCelular y codigoValido', () => {
  assert.equal(mostrarCelular('+573001234567'), '300 123 4567');
  assert.equal(codigoValido('123456'), true);
  assert.equal(codigoValido(' 123456 '), true);
  assert.equal(codigoValido('12345'), false);
  assert.equal(codigoValido('12a456'), false);
});
