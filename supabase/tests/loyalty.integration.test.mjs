import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Local Supabase credentials are required: API_URL, ANON_KEY, SERVICE_ROLE_KEY.'
  );
}

const endpoint = new URL(url);
if (!['127.0.0.1', 'localhost'].includes(endpoint.hostname) || endpoint.port !== '55321') {
  throw new Error('Integration tests refuse to run outside local Supabase on port 55321.');
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

const service = createClient(url, serviceRoleKey, clientOptions);
const anonymous = createClient(url, anonKey, clientOptions);
const createdUserIds = [];
const createdRewardIds = [];
const createdQrTokens = [];
const createdCategoryIds = [];
const password = 'Local-only-test-password-42!';

function assertSuccess(result, context) {
  assert.equal(result.error, null, `${context}: ${result.error?.message ?? ''}`);
  return result.data;
}

async function createActor({ role = 'customer', points = 0 } = {}) {
  const email = `showcase-${randomUUID()}@example.test`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const user = assertSuccess(created, 'create local auth user').user;
  assert.ok(user);
  createdUserIds.push(user.id);

  const profiles = assertSuccess(
    await service.from('profiles').select('id').eq('id', user.id),
    'verify onboarding profile'
  );
  assert.equal(profiles.length, 1, 'onboarding must create exactly one profile');
  assert.equal(profiles[0].id, user.id);

  const accounts = assertSuccess(
    await service
      .from('loyalty_accounts')
      .select('user_id, points_balance, lifetime_points')
      .eq('user_id', user.id),
    'verify onboarding loyalty account'
  );
  assert.equal(accounts.length, 1, 'onboarding must create exactly one loyalty account');
  assert.deepEqual(accounts[0], {
    user_id: user.id,
    points_balance: 0,
    lifetime_points: 0,
  });

  if (points !== 0) {
    assertSuccess(
      await service
        .from('loyalty_accounts')
        .update({ points_balance: points, lifetime_points: points })
        .eq('user_id', user.id),
      'set initial test points'
    );
  }

  if (role !== 'customer') {
    assertSuccess(
      await service.from('staff_members').insert({
        user_id: user.id,
        role: role === 'inactive' ? 'employee' : role,
        active: role !== 'inactive',
      }),
      'create staff member'
    );
  }

  const client = createClient(url, anonKey, clientOptions);
  assertSuccess(
    await client.auth.signInWithPassword({ email, password }),
    'sign in local actor'
  );

  return { client, id: user.id, role };
}

async function createReward({ active = true, points = 100 } = {}) {
  const id = randomUUID();
  createdRewardIds.push(id);
  assertSuccess(
    await service.from('rewards').insert({
      id,
      name: `Premio ${id.slice(0, 8)}`,
      points_required: points,
      active,
    }),
    'create reward'
  );
  return id;
}

async function createPurchaseQr(staff, amount = 100) {
  const result = await staff.client.rpc('create_purchase_qr', {
    p_purchase_amount: amount,
  });
  const rows = assertSuccess(result, 'create purchase QR');
  const qr = Array.isArray(rows) ? rows[0] : rows;
  assert.ok(qr?.token);
  createdQrTokens.push(qr.token);
  return qr;
}

async function accountFor(userId) {
  return assertSuccess(
    await service
      .from('loyalty_accounts')
      .select('points_balance, lifetime_points')
      .eq('user_id', userId)
      .single(),
    'read account'
  );
}

async function transactionsFor(userId) {
  return assertSuccess(
    await service
      .from('point_transactions')
      .select('points, type')
      .eq('user_id', userId),
    'read transactions'
  );
}

function assertDenied(result, context) {
  if (result.error) return;
  assert.deepEqual(result.data ?? [], [], `${context}: the operation unexpectedly affected rows`);
}

function assertRejected(result, context) {
  assert.ok(result.error, `${context}: the request unexpectedly succeeded`);
}

before(async () => {
  assertSuccess(
    await service.from('loyalty_settings').upsert({
      id: 1,
      points_percentage: 20,
      qr_expiration_minutes: 60,
    }),
    'seed loyalty settings'
  );
});

after(async () => {
  if (createdUserIds.length) {
    await service.from('point_transactions').delete().in('user_id', createdUserIds);
    await service.from('reward_redemptions').delete().in('user_id', createdUserIds);
  }
  if (createdQrTokens.length) {
    await service.from('qr_tokens').delete().in('token', createdQrTokens);
  }
  if (createdRewardIds.length) {
    await service.from('rewards').delete().in('id', createdRewardIds);
  }
  if (createdCategoryIds.length) {
    await service.from('categories').delete().in('id', createdCategoryIds);
  }
  if (createdUserIds.length) {
    await service.from('staff_members').delete().in('user_id', createdUserIds);
    await service.from('loyalty_accounts').delete().in('user_id', createdUserIds);
    await service.from('profiles').delete().in('id', createdUserIds);
    for (const id of createdUserIds) {
      await service.auth.admin.deleteUser(id);
    }
  }
});

test('QR purchase is single-use, atomic, and rejects invalid or expired tokens', async () => {
  const staff = await createActor({ role: 'employee' });
  const customer = await createActor();
  const qr = await createPurchaseQr(staff, 100);

  assert.equal(
    assertSuccess(
      await customer.client.rpc('redeem_qr', { p_token: qr.token }),
      'redeem valid QR'
    ),
    20
  );

  const afterSuccess = await accountFor(customer.id);
  assert.equal(afterSuccess.points_balance, 20);
  assert.equal(afterSuccess.lifetime_points, 20);
  assert.deepEqual(await transactionsFor(customer.id), [{ points: 20, type: 'purchase' }]);

  const duplicate = await customer.client.rpc('redeem_qr', { p_token: qr.token });
  assert.ok(duplicate.error?.message.includes('already redeemed'));
  assert.deepEqual(await accountFor(customer.id), afterSuccess);
  assert.equal((await transactionsFor(customer.id)).length, 1);

  const missing = await customer.client.rpc('redeem_qr', { p_token: randomUUID() });
  assert.ok(missing.error?.message.includes('Invalid QR'));

  const expiredQr = await createPurchaseQr(staff, 100);
  assertSuccess(
    await service
      .from('qr_tokens')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('token', expiredQr.token),
    'expire QR'
  );
  const beforeExpired = await accountFor(customer.id);
  const expired = await customer.client.rpc('redeem_qr', { p_token: expiredQr.token });
  assert.ok(expired.error?.message.includes('expired'));
  assert.deepEqual(await accountFor(customer.id), beforeExpired);
  assert.equal((await transactionsFor(customer.id)).length, 1);
});

test('concurrent QR redemption credits exactly one customer', async () => {
  const staff = await createActor({ role: 'employee' });
  const first = await createActor();
  const second = await createActor();
  const qr = await createPurchaseQr(staff, 250);

  const results = await Promise.all([
    first.client.rpc('redeem_qr', { p_token: qr.token }),
    second.client.rpc('redeem_qr', { p_token: qr.token }),
  ]);

  assert.equal(results.filter((result) => !result.error).length, 1);
  assert.equal(results.filter((result) => result.error).length, 1);

  const accounts = await Promise.all([accountFor(first.id), accountFor(second.id)]);
  assert.deepEqual(
    accounts.map((account) => account.points_balance).sort((a, b) => a - b),
    [0, 50]
  );
  const allTransactions = [
    ...(await transactionsFor(first.id)),
    ...(await transactionsFor(second.id)),
  ];
  assert.equal(allTransactions.length, 1);
  assert.equal(allTransactions[0].points, 50);
});

test('reward redemption is atomic and concurrent calls cannot create a negative balance', async () => {
  const reward = await createReward({ points: 75 });
  const customer = await createActor({ points: 100 });

  const results = await Promise.all([
    customer.client.rpc('redeem_reward', { p_reward_id: reward }),
    customer.client.rpc('redeem_reward', { p_reward_id: reward }),
  ]);

  assert.equal(results.filter((result) => !result.error).length, 1);
  assert.equal(results.filter((result) => result.error).length, 1);
  assert.equal((await accountFor(customer.id)).points_balance, 25);

  const redemptions = assertSuccess(
    await service
      .from('reward_redemptions')
      .select('id, points_spent')
      .eq('user_id', customer.id),
    'read redemptions'
  );
  assert.equal(redemptions.length, 1);
  assert.equal(redemptions[0].points_spent, 75);

  const debits = await transactionsFor(customer.id);
  assert.deepEqual(debits, [{ points: -75, type: 'reward' }]);
});

test('insufficient points and inactive rewards leave no partial changes', async () => {
  const customer = await createActor({ points: 20 });
  const expensive = await createReward({ points: 100 });
  const inactive = await createReward({ active: false, points: 10 });

  const insufficient = await customer.client.rpc('redeem_reward', {
    p_reward_id: expensive,
  });
  assert.ok(insufficient.error?.message.includes('Not enough points'));

  const unavailable = await customer.client.rpc('redeem_reward', {
    p_reward_id: inactive,
  });
  assert.ok(unavailable.error?.message.includes('Reward not available'));

  assert.equal((await accountFor(customer.id)).points_balance, 20);
  assert.equal((await transactionsFor(customer.id)).length, 0);
  const redemptions = assertSuccess(
    await service
      .from('reward_redemptions')
      .select('id')
      .eq('user_id', customer.id),
    'read failed redemptions'
  );
  assert.equal(redemptions.length, 0);
});

test('staff RPC authorization accepts active employee/admin and rejects others', async () => {
  const employee = await createActor({ role: 'employee' });
  const admin = await createActor({ role: 'admin' });
  const inactive = await createActor({ role: 'inactive' });
  const customer = await createActor();

  await createPurchaseQr(employee, 100);
  await createPurchaseQr(admin, 100);

  for (const actor of [inactive, customer]) {
    const result = await actor.client.rpc('create_purchase_qr', {
      p_purchase_amount: 100,
    });
    assert.ok(result.error?.message.includes('Not authorized'));
  }

  const anonymousResult = await anonymous.rpc('create_purchase_qr', {
    p_purchase_amount: 100,
  });
  assert.ok(anonymousResult.error);
});

test('reward validation is single-use and records used_at without partial invalid updates', async () => {
  const customer = await createActor({ points: 200 });
  const reward = await createReward({ points: 50 });
  const firstStaff = await createActor({ role: 'employee' });
  const secondStaff = await createActor({ role: 'admin' });
  const redemptionId = assertSuccess(
    await customer.client.rpc('redeem_reward', { p_reward_id: reward }),
    'redeem reward'
  );

  const concurrent = await Promise.all([
    firstStaff.client.rpc('use_reward', { p_redemption_id: redemptionId }),
    secondStaff.client.rpc('use_reward', { p_redemption_id: redemptionId }),
  ]);
  assert.equal(concurrent.filter((result) => !result.error).length, 1);
  assert.equal(concurrent.filter((result) => result.error).length, 1);

  const used = assertSuccess(
    await service
      .from('reward_redemptions')
      .select('status, used_at')
      .eq('id', redemptionId)
      .single(),
    'read used redemption'
  );
  assert.equal(used.status, 'used');
  assert.ok(used.used_at);

  const cancelledId = randomUUID();
  assertSuccess(
    await service.from('reward_redemptions').insert({
      id: cancelledId,
      user_id: customer.id,
      reward_id: reward,
      points_spent: 50,
      status: 'cancelled',
    }),
    'create cancelled redemption'
  );
  const cancelled = await firstStaff.client.rpc('use_reward', {
    p_redemption_id: cancelledId,
  });
  assert.ok(cancelled.error?.message.includes('cancelled'));
  const unchanged = assertSuccess(
    await service
      .from('reward_redemptions')
      .select('status, used_at')
      .eq('id', cancelledId)
      .single(),
    'read cancelled redemption'
  );
  assert.deepEqual(unchanged, { status: 'cancelled', used_at: null });
});

test('RLS separates anon, customer, employee, and admin access', async () => {
  const customer = await createActor();
  const other = await createActor();
  const employee = await createActor({ role: 'employee' });
  const admin = await createActor({ role: 'admin' });
  const categoryId = randomUUID();
  createdCategoryIds.push(categoryId);
  assertSuccess(
    await service.from('categories').insert({ id: categoryId, name: 'Local test' }),
    'create category'
  );

  const anonCategories = assertSuccess(
    await anonymous.from('categories').select('id').eq('id', categoryId),
    'anon categories query'
  );
  assert.equal(anonCategories.length, 0);

  const customerCategories = assertSuccess(
    await customer.client.from('categories').select('id').eq('id', categoryId),
    'customer categories query'
  );
  assert.equal(customerCategories.length, 1);

  const ownProfile = assertSuccess(
    await customer.client.from('profiles').select('id').eq('id', customer.id),
    'own profile query'
  );
  const otherProfile = assertSuccess(
    await customer.client.from('profiles').select('id').eq('id', other.id),
    'other profile query'
  );
  assert.equal(ownProfile.length, 1);
  assert.equal(otherProfile.length, 0);

  for (const actor of [employee, admin]) {
    const ownStaff = assertSuccess(
      await actor.client.from('staff_members').select('user_id').eq('user_id', actor.id),
      'own staff role query'
    );
    assert.equal(ownStaff.length, 1);
  }

  const forbiddenInsert = await customer.client.from('point_transactions').insert({
    user_id: customer.id,
    type: 'purchase',
    points: 999,
  });
  assert.ok(forbiddenInsert.error);
});

test('RLS blocks IDOR reads and PostgREST filter tampering across customers', async () => {
  const customer = await createActor();
  const other = await createActor({ points: 40 });
  const reward = await createReward({ points: 10 });

  assertSuccess(
    await service.from('point_transactions').insert({
      user_id: other.id,
      type: 'promotion',
      points: 40,
      description: 'Fixture privado',
    }),
    'create private transaction fixture'
  );
  assertSuccess(
    await service.from('reward_redemptions').insert({
      user_id: other.id,
      reward_id: reward,
      points_spent: 10,
    }),
    'create private redemption fixture'
  );

  for (const [table, column] of [
    ['profiles', 'id'],
    ['loyalty_accounts', 'user_id'],
    ['point_transactions', 'user_id'],
    ['reward_redemptions', 'user_id'],
  ]) {
    const result = assertSuccess(
      await customer.client.from(table).select('*').eq(column, other.id),
      `query another customer's ${table}`
    );
    assert.deepEqual(result, [], `${table} leaked another customer's rows`);
  }

  const injectedOr = assertSuccess(
    await customer.client
      .from('profiles')
      .select('id')
      .or(`id.eq.${customer.id},id.eq.${other.id}`),
    'attempt PostgREST OR scope expansion'
  );
  assert.deepEqual(injectedOr, [{ id: customer.id }]);

  assertDenied(
    await customer.client
      .from('profiles')
      .update({ name: 'IDOR attempt' })
      .eq('id', other.id)
      .select('id'),
    'update another customer profile'
  );
});

test('customers cannot mass-assign balances, ledger, settings, QR, rewards, or staff roles', async () => {
  const customer = await createActor({ points: 25 });
  const other = await createActor();
  const reward = await createReward({ points: 10 });
  const redemptionId = randomUUID();
  const transactionId = randomUUID();

  assertSuccess(
    await service.from('reward_redemptions').insert({
      id: redemptionId,
      user_id: customer.id,
      reward_id: reward,
      points_spent: 10,
    }),
    'create protected redemption fixture'
  );
  assertSuccess(
    await service.from('point_transactions').insert({
      id: transactionId,
      user_id: customer.id,
      type: 'promotion',
      points: 1,
    }),
    'create protected transaction fixture'
  );

  assertDenied(
    await customer.client
      .from('loyalty_accounts')
      .update({
        user_id: other.id,
        points_balance: 999999,
        lifetime_points: 999999,
      })
      .eq('user_id', customer.id)
      .select('user_id'),
    'mass-assign loyalty balance'
  );
  assert.deepEqual(await accountFor(customer.id), {
    points_balance: 25,
    lifetime_points: 25,
  });

  assertRejected(
    await customer.client.from('point_transactions').insert({
      user_id: customer.id,
      type: 'purchase',
      points: 999999,
    }),
    'insert a forged ledger entry'
  );
  assertDenied(
    await customer.client
      .from('point_transactions')
      .update({ user_id: other.id, points: 999999 })
      .eq('id', transactionId)
      .select('id'),
    'reassign or modify own ledger entry'
  );
  assertDenied(
    await customer.client
      .from('point_transactions')
      .delete()
      .eq('user_id', customer.id)
      .select('id'),
    'delete own ledger entries'
  );

  const settings = assertSuccess(
    await customer.client.from('loyalty_settings').select('*'),
    'read protected loyalty settings'
  );
  assert.deepEqual(settings, []);
  assertDenied(
    await customer.client
      .from('loyalty_settings')
      .update({ points_percentage: 100 })
      .eq('id', 1)
      .select('id'),
    'modify loyalty settings'
  );

  assertRejected(
    await customer.client.from('qr_tokens').insert({
      points: 999999,
      purchase_amount: 1,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }),
    'insert a forged purchase QR'
  );
  assertRejected(
    await customer.client.from('reward_redemptions').insert({
      user_id: customer.id,
      reward_id: reward,
      points_spent: 1,
      status: 'used',
    }),
    'insert a forged reward redemption'
  );
  assertDenied(
    await customer.client
      .from('reward_redemptions')
      .update({
        user_id: other.id,
        status: 'used',
        points_spent: 1,
        used_at: new Date().toISOString(),
      })
      .eq('id', redemptionId)
      .select('id'),
    'mass-assign protected redemption fields'
  );
  assertDenied(
    await customer.client
      .from('reward_redemptions')
      .delete()
      .eq('id', redemptionId)
      .select('id'),
    'delete own reward redemption'
  );

  assertRejected(
    await customer.client.from('staff_members').insert({
      user_id: customer.id,
      role: 'admin',
      active: true,
    }),
    'promote customer to admin'
  );
});

test('staff members cannot change their own role or active state directly', async () => {
  const employee = await createActor({ role: 'employee' });
  const inactive = await createActor({ role: 'inactive' });

  assertDenied(
    await employee.client
      .from('staff_members')
      .update({ role: 'admin' })
      .eq('user_id', employee.id)
      .select('user_id'),
    'employee self-promotion'
  );
  assertDenied(
    await inactive.client
      .from('staff_members')
      .update({ active: true })
      .eq('user_id', inactive.id)
      .select('user_id'),
    'inactive employee self-reactivation'
  );

  for (const actor of [employee, inactive]) {
    const row = assertSuccess(
      await service
        .from('staff_members')
        .select('role, active')
        .eq('user_id', actor.id)
        .single(),
      'verify unchanged staff role'
    );
    assert.equal(row.role, 'employee');
    assert.equal(row.active, actor.role !== 'inactive');
  }
});

test('anonymous and customer callers cannot invoke privileged functions', async () => {
  const customer = await createActor();
  const calls = [
    anonymous.rpc('create_purchase_qr', { p_purchase_amount: 100 }),
    anonymous.rpc('redeem_qr', { p_token: randomUUID() }),
    anonymous.rpc('redeem_reward', { p_reward_id: randomUUID() }),
    anonymous.rpc('use_reward', { p_redemption_id: randomUUID() }),
    anonymous.rpc('handle_new_user', {}),
    anonymous.rpc('add_points', {
      p_user_id: customer.id,
      p_points: 100,
      p_description: 'forged',
    }),
    customer.client.rpc('add_points', {
      p_user_id: customer.id,
      p_points: 100,
      p_description: 'forged',
    }),
  ];

  const results = await Promise.all(calls);
  results.forEach((result, index) => assertRejected(result, `privileged RPC call ${index + 1}`));
  assert.deepEqual(await accountFor(customer.id), {
    points_balance: 0,
    lifetime_points: 0,
  });
});

test('RPC parameter tampering and injection payloads are rejected by signatures and types', async () => {
  const customer = await createActor();
  const staff = await createActor({ role: 'employee' });
  const maliciousIds = [
    "' OR true --",
    '"; DROP TABLE public.rewards; --',
    '00000000-0000-0000-0000-000000000000/**/UNION SELECT',
    '<script>alert(1)</script>',
    'javascript:alert(1)',
  ];

  for (const payload of maliciousIds) {
    for (const [client, fn, argument] of [
      [customer.client, 'redeem_qr', 'p_token'],
      [customer.client, 'redeem_reward', 'p_reward_id'],
      [staff.client, 'use_reward', 'p_redemption_id'],
    ]) {
      assertRejected(
        await client.rpc(fn, { [argument]: payload }),
        `${fn} malicious identifier`
      );
    }
  }

  for (const amount of [null, 0, -1, '1 OR 1=1', 1e100]) {
    assertRejected(
      await staff.client.rpc('create_purchase_qr', { p_purchase_amount: amount }),
      `invalid purchase amount ${String(amount)}`
    );
  }

  assertRejected(
    await customer.client.rpc('redeem_qr', {}),
    'missing RPC parameter'
  );
  assertRejected(
    await customer.client.rpc('redeem_qr', {
      p_token: randomUUID(),
      unexpected: 'tampered',
    }),
    'extra RPC parameter'
  );

  const storedPayload = '<script>alert(1)</script>\"; SELECT * FROM auth.users; --';
  assertSuccess(
    await customer.client
      .from('profiles')
      .update({ name: storedPayload, phone: "' OR '1'='1" })
      .eq('id', customer.id),
    'store hostile profile text as data'
  );
  const profile = assertSuccess(
    await customer.client
      .from('profiles')
      .select('name, phone')
      .eq('id', customer.id)
      .single(),
    'read hostile profile text'
  );
  assert.deepEqual(profile, { name: storedPayload, phone: "' OR '1'='1" });
});
