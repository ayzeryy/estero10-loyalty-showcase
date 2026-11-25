# Suggested code review path

## 1. Purchase: screen to database

Open [`staff-purchase.tsx`](../apps/mobile/src/app/staff-purchase.tsx), then [`scan.tsx`](../apps/mobile/src/app/(tabs)/scan.tsx). Staff submits an amount, not a client-calculated point value. The customer submits a UUID to `redeem_qr` after input validation.

Find `create_purchase_qr` and `redeem_qr` in the baseline SQL. Trace authorization, calculation, expiration, the token lock, and balance/history updates. Then read the integration tests for single-use QR tokens and concurrent QR redemption.

Discussion: why suppress duplicate camera callbacks if PostgreSQL already enforces single use? Which layer protects against two independent clients?

## 2. Reward lifecycle

Read [`rewards.tsx`](../apps/mobile/src/app/(tabs)/rewards.tsx), [`my-rewards.tsx`](../apps/mobile/src/app/my-rewards.tsx), and [`staff.tsx`](../apps/mobile/src/app/staff.tsx). Find `redeem_reward` and `use_reward` in SQL.

Tests cover competing redemptions, insufficient balances without partial updates, and receipts consumed once under concurrent staff validation.

Discussion: why does redemption lock the account while staff validation locks the receipt?

## 3. Authorization independently of the UI

Review RLS and the complete migration chain, including the later `add_points` revocation. Tests call the API directly to attempt cross-customer reads, forged ledger entries, role changes, and privileged function calls.

Discussion: how do table grants, row policies, and checks inside privileged functions differ?

## 4. Presentation and reproducibility

Compare [`theme.ts`](../apps/mobile/src/constants/theme.ts) with Home, Menu, and Rewards. Inspect shared cards, loading/error/empty states, reduced-motion handling, image fallbacks, and typed database contracts.

Finish with [`local.mjs`](../scripts/local.mjs), endpoint isolation tests, and GitHub Actions. Reviewers can run the selected functionality with fictional data and without restaurant credentials.
