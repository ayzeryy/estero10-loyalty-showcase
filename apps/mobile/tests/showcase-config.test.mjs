import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLocalShowcaseEndpoint } from '../src/lib/showcase-config.ts';

test('demo accepts loopback and private LAN hosts on the isolated port', () => {
  for (const url of ['http://localhost:55321', 'http://127.0.0.1:55321', 'http://192.168.1.10:55321', 'http://10.0.0.2:55321', 'http://172.16.0.2:55321']) {
    assert.doesNotThrow(() => assertLocalShowcaseEndpoint(url));
  }
});

test('demo rejects hosted databases, the original local port, and misleading LAN hosts', () => {
  for (const url of ['https://example.supabase.co', 'http://127.0.0.1:54321', 'http://192.168.1.10.evil.test:55321', 'http://172.32.0.1:55321', 'http://8.8.8.8:55321', 'http://localhost:55321/rest/v1']) {
    assert.throws(() => assertLocalShowcaseEndpoint(url));
  }
});
