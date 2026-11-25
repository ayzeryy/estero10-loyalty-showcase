/**
 * In-browser demo backend used only when EXPO_PUBLIC_DEMO_MODE=1.
 *
 * It mirrors the subset of the Supabase client the screens use and the
 * business rules of the SQL RPCs (create_purchase_qr, redeem_qr,
 * redeem_reward, use_reward) so a hosted static build can be explored
 * without any database. All data is fictional and stays in this browser's
 * localStorage. It is not a security boundary: authorization lives in the
 * real database (see supabase/migrations).
 */

type Row = Record<string, any>;
type Tables = Record<string, Row[]>;
type DemoUser = { id: string; email: string; password: string };
type DemoDb = { version: number; users: DemoUser[]; tables: Tables };
type Result = { data: any; error: { message: string } | null };

const DB_KEY = 'estero10-demo-db';
const SESSION_KEY = 'estero10-demo-session';
const DB_VERSION = 1;
const POINTS_PERCENTAGE = 20;
const QR_EXPIRATION_MINUTES = 60;
export const DEMO_PASSWORD = 'Showcase-only-42!';

const CUSTOMER_ID = 'd1000000-0000-4000-8000-000000000001';
const STAFF_ID = 'd1000000-0000-4000-8000-000000000002';

const memoryStore: Record<string, string> = {};

function storageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // fall back to memory
  }
  return memoryStore[key] ?? null;
}

function storageSet(key: string, value: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fall back to memory
  }
  memoryStore[key] = value;
}

function storageRemove(key: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  delete memoryStore[key];
}

function uuid(): string {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function nowIso() {
  return new Date().toISOString();
}

function seed(): DemoDb {
  const initialAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return {
    version: DB_VERSION,
    users: [
      { id: CUSTOMER_ID, email: 'customer@example.test', password: DEMO_PASSWORD },
      { id: STAFF_ID, email: 'staff@example.test', password: DEMO_PASSWORD },
    ],
    tables: {
      profiles: [
        { id: CUSTOMER_ID, name: 'Marina Demo', phone: null },
        { id: STAFF_ID, name: 'Personal Demo', phone: null },
      ],
      staff_members: [{ user_id: STAFF_ID, role: 'employee', active: true }],
      loyalty_accounts: [
        { user_id: CUSTOMER_ID, points_balance: 150, lifetime_points: 150 },
        { user_id: STAFF_ID, points_balance: 0, lifetime_points: 0 },
      ],
      point_transactions: [
        {
          id: 'd5000000-0000-4000-8000-000000000001',
          user_id: CUSTOMER_ID,
          type: 'purchase',
          points: 150,
          description: 'Compra en restaurante',
          created_at: initialAt,
        },
      ],
      categories: [
        { id: 'd2000000-0000-4000-8000-000000000001', name: 'Frescos del mar', sort_order: 1, active: true },
        { id: 'd2000000-0000-4000-8000-000000000002', name: 'Para acompañar', sort_order: 2, active: true },
      ],
      products: [
        {
          id: 'd3000000-0000-4000-8000-000000000001',
          category_id: 'd2000000-0000-4000-8000-000000000001',
          name: 'Ceviche de la casa',
          description: 'Ejemplo de catálogo: pescado, cítricos y hierbas frescas.',
          price: 85,
          image_url: null,
          active: true,
        },
        {
          id: 'd3000000-0000-4000-8000-000000000002',
          category_id: 'd2000000-0000-4000-8000-000000000001',
          name: 'Pesca al grill',
          description: 'Ejemplo de catálogo: pescado a la plancha con guarnición.',
          price: 125,
          image_url: null,
          active: true,
        },
        {
          id: 'd3000000-0000-4000-8000-000000000003',
          category_id: 'd2000000-0000-4000-8000-000000000002',
          name: 'Limonada fresca',
          description: 'Ejemplo de catálogo: limón recién exprimido.',
          price: 25,
          image_url: null,
          active: true,
        },
      ],
      rewards: [
        { id: 'd4000000-0000-4000-8000-000000000001', name: 'Una limonada para ti', description: 'Premio ficticio para demostrar un canje.', points_required: 50, active: true },
        { id: 'd4000000-0000-4000-8000-000000000002', name: 'Un detalle dulce', description: 'Premio ficticio para acompañar tu próxima visita.', points_required: 100, active: true },
        { id: 'd4000000-0000-4000-8000-000000000003', name: 'Un sabor del mar', description: 'Premio ficticio para demostrar progreso de puntos.', points_required: 250, active: true },
      ],
      reward_redemptions: [],
      qr_tokens: [],
    },
  };
}

function loadDb(): DemoDb {
  const raw = storageGet(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoDb;
      if (parsed.version === DB_VERSION) return parsed;
    } catch {
      // reseed below
    }
  }
  const fresh = seed();
  saveDb(fresh);
  return fresh;
}

function saveDb(db: DemoDb) {
  storageSet(DB_KEY, JSON.stringify(db));
}

/** Restores the fictional seed data (used by the "reiniciar demo" link). */
export function resetDemoData() {
  saveDb(seed());
}

// ---------------------------------------------------------------- auth

type Session = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  expires_at: number;
  user: { id: string; email: string; aud: string; role: string; app_metadata: Row; user_metadata: Row; created_at: string };
};
type Listener = (event: string, session: Session | null) => void;

const listeners = new Set<Listener>();

function makeSession(user: DemoUser): Session {
  return {
    access_token: `demo-${user.id}`,
    refresh_token: `demo-${user.id}`,
    token_type: 'bearer',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    user: {
      id: user.id,
      email: user.email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: nowIso(),
    },
  };
}

function currentSession(): Session | null {
  const raw = storageGet(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function currentUserId(): string | null {
  return currentSession()?.user.id ?? null;
}

function emit(event: string, session: Session | null) {
  for (const listener of listeners) {
    setTimeout(() => listener(event, session), 0);
  }
}

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 150));

const auth = {
  async getSession() {
    return { data: { session: currentSession() }, error: null };
  },

  onAuthStateChange(listener: Listener) {
    listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const db = loadDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      return delay({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
    }
    const session = makeSession(user);
    storageSet(SESSION_KEY, JSON.stringify(session));
    emit('SIGNED_IN', session);
    return delay({ data: { user: session.user, session }, error: null });
  },

  async signUp({ email, password }: { email: string; password: string }) {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return delay({ data: { user: null, session: null }, error: { message: 'Unable to validate email address: invalid format' } });
    }
    if (password.length < 6) {
      return delay({ data: { user: null, session: null }, error: { message: 'Password should be at least 6 characters.' } });
    }
    const db = loadDb();
    if (db.users.some((u) => u.email === normalized)) {
      return delay({ data: { user: null, session: null }, error: { message: 'User already registered' } });
    }
    const user: DemoUser = { id: uuid(), email: normalized, password };
    db.users.push(user);
    // Mirrors the handle_new_user trigger: profile + empty loyalty account.
    db.tables.profiles.push({ id: user.id, name: null, phone: null });
    db.tables.loyalty_accounts.push({ user_id: user.id, points_balance: 0, lifetime_points: 0 });
    saveDb(db);
    const session = makeSession(user);
    storageSet(SESSION_KEY, JSON.stringify(session));
    emit('SIGNED_IN', session);
    return delay({ data: { user: session.user, session }, error: null });
  },

  async signOut() {
    storageRemove(SESSION_KEY);
    emit('SIGNED_OUT', null);
    return { error: null };
  },
};

// -------------------------------------------------------------- queries

type Filter = { column: string; value: unknown };
type Order = { column: string; ascending: boolean };

class QueryBuilder implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitCount: number | null = null;
  private rangeBounds: [number, number] | null = null;
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';
  private columns = '*';
  private updateValues: Row | null = null;

  constructor(private table: string) {}

  select(columns = '*') {
    this.columns = columns;
    return this;
  }

  update(values: Row) {
    this.updateValues = values;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeBounds = [from, to];
    return this;
  }

  single() {
    this.mode = 'single';
    return this;
  }

  maybeSingle() {
    this.mode = 'maybeSingle';
    return this;
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return delay(this.execute()).then(onfulfilled, onrejected);
  }

  private visibleRows(db: DemoDb): Row[] {
    const uid = currentUserId();
    const rows = db.tables[this.table] ?? [];
    // Rough stand-in for RLS: user-owned tables only expose the caller's rows.
    switch (this.table) {
      case 'profiles':
        return rows.filter((r) => r.id === uid);
      case 'loyalty_accounts':
      case 'point_transactions':
      case 'reward_redemptions':
      case 'staff_members':
        return rows.filter((r) => r.user_id === uid);
      case 'qr_tokens':
        return [];
      default:
        return rows;
    }
  }

  private execute(): Result {
    if (!currentUserId() && !['categories', 'products', 'rewards'].includes(this.table)) {
      return { data: this.mode === 'many' ? [] : null, error: this.mode === 'single' ? { message: 'JSON object requested, multiple (or no) rows returned' } : null };
    }

    const db = loadDb();
    let rows = this.visibleRows(db).filter((row) =>
      this.filters.every((f) => row[f.column] === f.value)
    );

    if (this.updateValues) {
      const allowed = this.table === 'profiles' ? ['name', 'phone'] : [];
      for (const row of rows) {
        for (const key of allowed) {
          if (key in this.updateValues) row[key] = this.updateValues[key];
        }
      }
      saveDb(db);
      return { data: null, error: null };
    }

    rows = [...rows];
    if (this.orders.length) {
      rows.sort((a, b) => {
        for (const o of this.orders) {
          const av = a[o.column];
          const bv = b[o.column];
          if (av === bv) continue;
          const cmp = av > bv ? 1 : -1;
          return o.ascending ? cmp : -cmp;
        }
        return 0;
      });
    }
    if (this.rangeBounds) rows = rows.slice(this.rangeBounds[0], this.rangeBounds[1] + 1);
    if (this.limitCount !== null) rows = rows.slice(0, this.limitCount);

    let data: Row[] = rows.map((r) => ({ ...r }));
    if (this.table === 'reward_redemptions' && this.columns.includes('reward:')) {
      data = data.map((r) => {
        const reward = db.tables.rewards.find((rw) => rw.id === r.reward_id);
        return { ...r, reward: reward ? { name: reward.name, description: reward.description } : null };
      });
    }

    if (this.mode === 'many') return { data, error: null };
    if (data.length > 1 || (this.mode === 'single' && data.length === 0)) {
      return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
    }
    return { data: data[0] ?? null, error: null };
  }
}

// ----------------------------------------------------------------- rpcs

class RpcError extends Error {}

function isStaff(db: DemoDb, uid: string) {
  return db.tables.staff_members.some(
    (s) => s.user_id === uid && s.active && ['employee', 'admin'].includes(s.role)
  );
}

const rpcs: Record<string, (db: DemoDb, uid: string, args: Row) => unknown> = {
  create_purchase_qr(db, uid, { p_purchase_amount }) {
    if (!isStaff(db, uid)) throw new RpcError('Not authorized');
    const amount = Number(p_purchase_amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new RpcError('Invalid purchase amount');
    const points = Math.floor(amount * (POINTS_PERCENTAGE / 100));
    if (points <= 0) throw new RpcError('Purchase does not generate points');
    const token = {
      id: uuid(),
      token: uuid(),
      points,
      purchase_amount: amount,
      description: 'Compra en restaurante',
      expires_at: new Date(Date.now() + QR_EXPIRATION_MINUTES * 60_000).toISOString(),
      redeemed_at: null,
      redeemed_by: null,
    };
    db.tables.qr_tokens.push(token);
    return [{ token: token.token, points, purchase_amount: amount, expires_at: token.expires_at }];
  },

  redeem_qr(db, uid, { p_token }) {
    const qr = db.tables.qr_tokens.find((q) => q.token === String(p_token).toLowerCase() || q.token === p_token);
    if (!qr) throw new RpcError('Invalid QR code');
    if (qr.redeemed_at) throw new RpcError('QR code already redeemed');
    if (new Date(qr.expires_at).getTime() < Date.now()) throw new RpcError('QR code expired');
    const account = db.tables.loyalty_accounts.find((a) => a.user_id === uid);
    if (!account) throw new RpcError('Loyalty account not found');
    account.points_balance += qr.points;
    account.lifetime_points += qr.points;
    db.tables.point_transactions.push({
      id: uuid(),
      user_id: uid,
      type: 'purchase',
      points: qr.points,
      description: qr.description ?? 'Compra en restaurante',
      created_at: nowIso(),
    });
    qr.redeemed_at = nowIso();
    qr.redeemed_by = uid;
    return qr.points;
  },

  redeem_reward(db, uid, { p_reward_id }) {
    const reward = db.tables.rewards.find((r) => r.id === p_reward_id && r.active);
    if (!reward) throw new RpcError('Reward not available');
    const account = db.tables.loyalty_accounts.find((a) => a.user_id === uid);
    if (!account) throw new RpcError('Loyalty account not found');
    if (account.points_balance < reward.points_required) throw new RpcError('Not enough points');
    account.points_balance -= reward.points_required;
    db.tables.point_transactions.push({
      id: uuid(),
      user_id: uid,
      type: 'reward',
      points: -reward.points_required,
      description: `Canje: ${reward.name}`,
      created_at: nowIso(),
    });
    const id = uuid();
    db.tables.reward_redemptions.push({
      id,
      user_id: uid,
      reward_id: reward.id,
      points_spent: reward.points_required,
      status: 'pending',
      created_at: nowIso(),
      used_at: null,
    });
    return id;
  },

  use_reward(db, uid, { p_redemption_id }) {
    if (!isStaff(db, uid)) throw new RpcError('Not authorized');
    const redemption = db.tables.reward_redemptions.find(
      (r) => r.id === String(p_redemption_id).toLowerCase() || r.id === p_redemption_id
    );
    if (!redemption) throw new RpcError('Redemption not found');
    if (redemption.status === 'used') throw new RpcError('Reward already used');
    if (redemption.status === 'cancelled') throw new RpcError('Reward cancelled');
    if (redemption.status !== 'pending') throw new RpcError('Reward is not available');
    redemption.status = 'used';
    redemption.used_at = nowIso();
    const reward = db.tables.rewards.find((r) => r.id === redemption.reward_id);
    return reward?.name ?? 'Reward';
  },
};

async function rpc(name: string, args: Row = {}): Promise<Result> {
  const uid = currentUserId();
  if (!uid) return delay({ data: null, error: { message: 'User not authenticated' } });
  const handler = rpcs[name];
  if (!handler) return delay({ data: null, error: { message: `Unknown function ${name}` } });
  const db = loadDb();
  try {
    const data = handler(db, uid, args);
    saveDb(db);
    return delay({ data, error: null });
  } catch (error) {
    return delay({ data: null, error: { message: error instanceof Error ? error.message : String(error) } });
  }
}

export const demoClient = {
  auth,
  from: (table: string) => new QueryBuilder(table),
  rpc,
};
