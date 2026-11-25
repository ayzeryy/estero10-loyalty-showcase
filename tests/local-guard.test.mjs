import assert from 'node:assert/strict';
import test from 'node:test';
import { assertShowcaseConfig, assertShowcaseUrl } from '../scripts/local-guard.mjs';

test('allows only the dedicated loopback API and rejects the original local port', () => {
  assert.doesNotThrow(() => assertShowcaseUrl('http://127.0.0.1:55321'));
  assert.doesNotThrow(() => assertShowcaseUrl('http://localhost:55321'));
  for (const url of [
    'https://example.supabase.co', 'http://127.0.0.1:54321',
    'http://localhost.evil.test:55321', 'https://localhost:55321',
    'http://user:pass@localhost:55321', 'http://localhost:55321/rest/v1',
  ]) assert.throws(() => assertShowcaseUrl(url), undefined, url);
});

test('rejects another project or an API port specified outside the API section', () => {
  const valid = 'project_id = "estero10-loyalty-showcase"\n[api]\nport = 55321\n[db]\nport = 55322\n';
  assert.doesNotThrow(() => assertShowcaseConfig(valid));
  assert.throws(() => assertShowcaseConfig(valid.replace('estero10-loyalty-showcase', 'restaurant-loyalty')));
  assert.throws(() => assertShowcaseConfig(valid.replace('port = 55321', 'port = 54321')));
  assert.throws(() => assertShowcaseConfig('project_id = "estero10-loyalty-showcase"\n[db]\nport = 55321\n'));
});
