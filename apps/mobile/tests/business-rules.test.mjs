import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAuthErrorMessage,
  getBackendErrorMessage,
  normalizeUuid,
  parsePurchaseAmount,
} from '../src/lib/business-rules.ts';

test('redacta errores de Auth sin enumerar usuarios ni filtrar detalles internos', () => {
  assert.equal(
    getAuthErrorMessage('sign-in', 'User not found'),
    'No se pudo iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.'
  );
  assert.equal(
    getAuthErrorMessage('sign-in', 'Invalid login credentials'),
    'No se pudo iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.'
  );
  assert.equal(
    getAuthErrorMessage('sign-up', 'Database error saving new user: profiles_pkey'),
    'No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.'
  );
});

test('normaliza UUID válidos y rechaza contenido arbitrario', () => {
  assert.equal(
    normalizeUuid(' 123e4567-e89b-12d3-a456-426614174000 '),
    '123e4567-e89b-12d3-a456-426614174000'
  );
  assert.equal(normalizeUuid('no-es-un-uuid'), null);
});

test('acepta montos positivos con punto o coma decimal', () => {
  assert.equal(parsePurchaseAmount('500.25'), 500.25);
  assert.equal(parsePurchaseAmount('500,25'), 500.25);
  assert.equal(parsePurchaseAmount('0'), null);
  assert.equal(parsePurchaseAmount('-10'), null);
  assert.equal(parsePurchaseAmount(''), null);
});

test('traduce los errores contractuales de las RPC', () => {
  assert.equal(
    getBackendErrorMessage('redeem-purchase', 'QR code already redeemed'),
    'Este QR ya fue utilizado.'
  );
  assert.equal(
    getBackendErrorMessage('redeem-reward', 'Not enough points'),
    'No tienes suficientes puntos.'
  );
  assert.equal(
    getBackendErrorMessage('use-reward', 'Not authorized'),
    'No tienes permisos de empleado.'
  );
});
