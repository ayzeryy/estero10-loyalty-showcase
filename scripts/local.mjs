import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { assertShowcaseConfig, assertShowcaseUrl } from './local-guard.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));
assertShowcaseConfig(readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8'));
// No global remote credentials are needed by any command in this entry point.
const env = { ...process.env, DO_NOT_TRACK: '1', SUPABASE_TELEMETRY_DISABLED: 'true' };
for (const key of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'DATABASE_URL', 'SUPABASE_CLI_BINARY_OVERRIDE']) {
  delete env[key];
}
const options = { cwd: root, env, windowsHide: true };

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { ...options, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`Local command failed: ${args[0]}`);
}

function credentials() {
  // Capture credentials; never print the CLI status output or the service key.
  let status;
  try {
    status = JSON.parse(execFileSync(process.execPath, [cli, 'status', '-o', 'json'], {
      ...options, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }));
  } catch {
    throw new Error('Start the showcase stack with npm run supabase:start first.');
  }
  assertShowcaseUrl(status.API_URL);
  if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY) throw new Error('Local API keys are unavailable.');
  return status;
}

function checked(result, operation) {
  if (result.error) throw new Error(`${operation} failed. Check the local stack and migrations.`);
  return result.data;
}

async function setup() {
  const status = credentials();
  const service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const actors = [
    { id: 'd1000000-0000-4000-8000-000000000001', email: 'customer@example.test', name: 'Marina Demo' },
    { id: 'd1000000-0000-4000-8000-000000000002', email: 'staff@example.test', name: 'Personal Demo', role: 'employee' },
  ];
  const password = 'Showcase-only-42!';
  for (const actor of actors) {
    const existing = await service.auth.admin.getUserById(actor.id);
    if (existing.error && !['user_not_found'].includes(existing.error.code) && existing.error.status !== 404) {
      throw new Error('Could not inspect a local demo account.');
    }
    if (!existing.data?.user) {
      checked(await service.auth.admin.createUser({
        id: actor.id, email: actor.email, password, email_confirm: true,
        user_metadata: { name: actor.name },
      }), 'Create fictional actor');
    } else {
      checked(await service.auth.admin.updateUserById(actor.id, { password, email_confirm: true }), 'Reset demo login');
    }
    checked(await service.from('profiles').update({ name: actor.name }).eq('id', actor.id), 'Name demo actor');
    if (actor.role) {
      checked(await service.from('staff_members').upsert({ user_id: actor.id, role: actor.role, active: true }), 'Seed demo staff');
    }
  }
  // Attribute the initial points through the same purchase RPCs used by the UI.
  // Seed once; rerunning setup preserves the demo account's ongoing state.
  const customerId = actors[0].id;
  const transactions = checked(await service.from('point_transactions').select('id').eq('user_id', customerId).limit(1), 'Inspect demo history');
  if (transactions.length === 0) {
    const auth = { auth: { persistSession: false, autoRefreshToken: false } };
    const staff = createClient(status.API_URL, status.ANON_KEY, auth);
    const customer = createClient(status.API_URL, status.ANON_KEY, auth);
    checked(await staff.auth.signInWithPassword({ email: actors[1].email, password }), 'Sign in demo staff');
    checked(await customer.auth.signInWithPassword({ email: actors[0].email, password }), 'Sign in demo customer');
    const rows = checked(await staff.rpc('create_purchase_qr', { p_purchase_amount: 750 }), 'Create initial purchase');
    checked(await customer.rpc('redeem_qr', { p_token: rows[0].token }), 'Redeem initial purchase');
    await Promise.all([staff.auth.signOut(), customer.auth.signOut()]);
  }
  writeFileSync(new URL('../apps/mobile/.env', import.meta.url),
    `EXPO_PUBLIC_SUPABASE_URL=${status.API_URL}\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.ANON_KEY}\n`);
  console.log('Local demo ready. Generated ignored apps/mobile/.env with the local public key only.');
  console.log('Fictional accounts: customer@example.test / staff@example.test');
  console.log('Demo-only password: Showcase-only-42!');
}

try {
  switch (process.argv[2]) {
    case 'start':
      // Capture successful startup output so keys never enter terminal logs.
      try {
        execFileSync(process.execPath, [cli, 'start'], { ...options, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
      } catch {
        throw new Error('Local stack could not start. Check Docker Desktop, available disk space, and ports 55320-55329.');
      }
      console.log('Isolated local showcase stack started. Run npm run demo:setup.');
      break;
    case 'stop': run(['stop', '--project-id', 'estero10-loyalty-showcase']); break;
    case 'reset': run(['db', 'reset', '--local']); break;
    case 'lint': run(['db', 'lint', '--local', '--level', 'warning']); break;
    case 'setup': await setup(); break;
    case 'test': {
      const status = credentials();
      const result = spawnSync(process.execPath, ['--test', 'supabase/tests/loyalty.integration.test.mjs'], {
        ...options, stdio: 'inherit',
        env: { ...env, API_URL: status.API_URL, ANON_KEY: status.ANON_KEY, SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY },
      });
      process.exitCode = result.status ?? 1;
      break;
    }
    default: throw new Error('Use start, stop, reset, lint, setup, or test.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
