# Estero 10 · Loyalty Showcase

A focused portfolio extraction of a restaurant loyalty application built with **React Native, Expo SDK 54, TypeScript, and Supabase/PostgreSQL**.

Staff generates a purchase QR, a customer claims points and exchanges them for a reward, and staff validates the reward once. Behind the screens: concurrent requests, atomic balance updates, and authorization enforced in the database.

**Independent local demo with fictional accounts, menu items, prices, and rewards.** It does not connect to the restaurant's operational environments. The original private repository and its Git history are not included. Ordering, payments, and delivery are outside this showcase.

## What to review

| Area | Evidence in the code |
| --- | --- |
| Purchase QR | [Staff generation](apps/mobile/src/app/staff-purchase.tsx), [customer scanning](apps/mobile/src/app/(tabs)/scan.tsx), and `create_purchase_qr` / `redeem_qr` |
| Reward lifecycle | [Catalog and confirmation](apps/mobile/src/app/(tabs)/rewards.tsx), [customer receipts](apps/mobile/src/app/my-rewards.tsx), and [staff validation](apps/mobile/src/app/staff.tsx) |
| Concurrency and authorization | [12 integration tests](supabase/tests/loyalty.integration.test.mjs): competing claims, insufficient balance, customer isolation, and forbidden writes |
| Product UI | [Home](apps/mobile/src/app/(tabs)/index.tsx), [data-driven menu](apps/mobile/src/app/(tabs)/explore.tsx), [shared components](apps/mobile/src/components), and [theme](apps/mobile/src/constants/theme.ts) |
| Reproducibility | Lockfiles, fictional seed data, guarded local scripts, and [GitHub Actions](.github/workflows/ci.yml) |

Start with the [review guide](docs/REVIEW_GUIDE.md) and [architecture and tradeoffs](docs/ARCHITECTURE.md).

## Run locally

Requirements: Node.js **24.19.0** (`.nvmrc`), npm, and Docker Desktop with Linux containers running. Dependency versions remain on Expo SDK 54 / React 19 / React Native 0.81; lockfiles pin resolved versions.

From the repository root:

```sh
npm ci
npm --prefix apps/mobile ci
npm run supabase:start
npm run db:reset
npm run demo:setup
npm run web
```

Open the Expo URL printed in the terminal, normally `http://localhost:8081`.

`db:reset` recreates **only this local showcase database** and loads the fictional catalog. `demo:setup` creates two fictional Auth accounts, assigns the staff fixture its role, credits an initial purchase through the real RPC flow, and writes the local **public** key to ignored `apps/mobile/.env`. The privileged local key stays in the setup/test process and is never written into the app.

| Local account | Email | Demo-only password |
| --- | --- | --- |
| Customer | `customer@example.test` | `Showcase-only-42!` |
| Staff | `staff@example.test` | `Showcase-only-42!` |

Public fictional credentials for a disposable local stack; there is no hosted demo account. Rerunning setup preserves existing loyalty activity. Use `db:reset` followed by `demo:setup` for a fresh walkthrough.

### Complete flow without a camera

1. Sign in as staff in a private browser window. Choose **Generar QR de compra**, enter `100`, and generate the QR. Copy the UUID below it.
2. Sign in as the customer in a separate browser session. Open **QR**, paste the UUID, and choose **Validar código**. The purchase adds `20` points with the demo settings.
3. Choose **Escanear otro QR** and submit the same code again. The backend rejects the already claimed purchase.
4. Open **Premios**, confirm a reward, then open **Mis premios** and its QR. Copy the full receipt UUID.
5. Return to staff, paste the receipt UUID under **Validar premio**, and validate it. A repeated validation is rejected.
6. Reopen **Inicio**, **Historial**, and **Mis premios** to see the updated balance, movement, and receipt state.

Use separate sessions because authentication persists in browser storage. The customer starts with `150` points from a fictional initial purchase. Camera scanning remains available; pasted codes use the same RPCs and do not bypass authorization.

### iOS

Run `npm --prefix apps/mobile start` using a client compatible with Expo SDK 54. On a physical phone on the same private network, change **only this copy's ignored** `apps/mobile/.env` URL to `http://<computer-LAN-IP>:55321`, keep the generated local public key, and restart Expo. The app permits loopback/private LAN hosts on this dedicated port and refuses hosted database addresses. Native camera behavior must be checked on an actual compatible device; a web build does not verify it.

## Validate

```sh
npm run check:public
npm test
npm run test:unit
npm run typecheck
npm run lint
npm run db:lint
npm run test:integration
npm --prefix apps/mobile run export:web
```

Run `demo:setup` before exporting to supply the local app environment. Database tests need the local showcase stack; the runner obtains ephemeral keys directly from it. No GitHub secrets or remote project configuration are needed.

- `npm test`: local tooling isolation guards.
- `test:unit`: UUID/amount normalization, error messages, and the app endpoint boundary.
- `test:integration`: real Auth, REST, RLS, and PostgreSQL calls, including concurrent requests. These tests require port `55321` and reject both remote endpoints and the original local port `54321`.
- `check:public`: checks public candidate files for excluded artifacts and selected credential patterns. It supplements manual review; it is not a complete secrets audit.

Stop the demo with `npm run supabase:stop`. It explicitly targets `estero10-loyalty-showcase` and preserves its local data.

## Scope and status

The three SQL migrations are copied unchanged from the loyalty implementation, including the later revocation of client access to `add_points`. This repository demonstrates existing contracts; it is not a complete security audit or production deployment blueprint. Further privilege hardening and operational abuse limits are separate work.

No production configuration, customer export, internal security report, agent skills, or deployment linkage is included. See [validation evidence](docs/VALIDATION.md) for checks actually run and remaining limitations.
