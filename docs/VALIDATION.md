# Local validation evidence

Checked on **2026-11-25**, America/Guatemala. These are local execution results, not GitHub Actions results or evidence of a hosted deployment.

## Environment

- Windows, Node.js `24.18.0`, npm `11.16.0`, Docker Engine `29.7.2`.
- `.nvmrc` and CI retain the source project's requested Node.js `24.19.0`. The local host is one patch behind; npm reported that engine mismatch during root installation. This run does not claim to validate Node `24.19.0` itself.
- Separate Supabase project `estero10-loyalty-showcase`, API `http://127.0.0.1:55321`.
- Supabase CLI `2.116.0` from the copied lockfile; no CLI or framework upgrade.
- Browser walkthrough used the local Expo server on port `8088` with fictional accounts.

## Automated checks

| Check | Observed result |
| --- | --- |
| `npm ci` and `npm --prefix apps/mobile ci` | Dependencies installed from copied lockfiles. Existing deprecation notices retained; no audit fix or major upgrade. |
| `npm test` | 2/2 local tooling isolation tests passed. |
| `npm run test:unit` | 6/6 input, error-message, and app endpoint tests passed. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed after restoring the required source CSS dependency. |
| `npm --prefix apps/mobile run export:web` | Passed; 17 static routes generated. |
| `npm run db:reset` | Applied all three unchanged migrations and fictional seed data to the showcase local database. |
| `npm run db:lint` | No schema errors found. |
| `npm run test:integration` | 12/12 passed against real local Auth, REST, and PostgreSQL. |
| `npm run demo:setup` | Created fixture accounts and initial purchase; rerunning setup also succeeded. |
| `npm run check:public` | No excluded public-candidate artifacts or matching credential patterns. This is not a complete secrets audit. |

Integration coverage includes concurrent QR claims, concurrent reward redemptions, single-use receipt validation, no partial changes on failed requests, staff authorization, customer isolation, protected field writes, role self-promotion, privileged RPC access, and malformed parameters.

## Browser walkthrough

Verified through the actual interface, without mocking Auth or database responses:

1. Customer login loaded Home with `150` points and the initial purchase in history.
2. Menu displayed fictional database products with branded image fallbacks and prices in quetzales.
3. Rewards displayed the balance and disabled an unaffordable reward.
4. A confirmed `50`-point reward reduced the balance to `100` and created a receipt in My rewards.
5. Staff login and pasted receipt validation succeeded. Repeating it displayed `Este premio ya fue utilizado.`
6. Staff generated a QR for a `Q100` purchase. Customer submitted that code and received `20` points.
7. Repeating the purchase claim displayed `Este QR ya fue utilizado.`
8. Home displayed the final `120` balance, `170` lifetime points, and the `+20`, `-50`, and `+150` movements.
9. The browser's captured error log was empty at the end of the walkthrough.

The local demo retains this fictional walkthrough activity. Run `npm run db:reset` and `npm run demo:setup` to return to the README's initial `150`-point state.

## Source and publication boundary

- Before/after SHA-256 comparison of 284 source-repository files found zero content changes and zero new nonignored files. Existing untracked source documents were preserved.
- All three copied SQL migration files match the source bytes.
- Only the public repository's existing initial history was cloned; the private repository history was not copied.
- Initial preparation ended without staging, committing, pushing, deploying, or operating on a remote database.
- The new GitHub Actions workflow was prepared locally; the results above are local checks, not hosted CI results.

## Final prepublication review

On 2026-11-25, the public candidate files were reviewed again before the separately authorized commit and push. Checks covered credential assignments, provider tokens, JWTs, private keys, connection strings, personal paths, email addresses, URLs, SQL fixtures, image metadata, ignored files, and the validation workflow.

- No real credentials, customer records, private environment addresses, or personal filesystem paths were identified in the publication candidates.
- Account passwords and customer/staff emails are explicitly fictional fixtures. The package lockfile also retains public upstream dependency metadata; it is not customer data.
- Removed EXIF and embedded text metadata from the showcase logo only. Image data, dimensions, palette, and transparency were byte-identical before and after this metadata removal.
- `.env`, dependencies, build outputs, and Supabase runtime state remain ignored and excluded from publication.
- The workflow contains validation jobs only, with no deployment job or remote database credentials.
- The staged whitespace check reports an inherited blank line at the end of the baseline migration. It is retained to preserve the baseline; the other staged files pass the whitespace check.

This targeted publication review does not claim that every possible secret pattern or covert data channel has been ruled out.

## Not verified

Physical iOS camera scanning, native builds, Android behavior, and a hosted deployment were not tested. Browser verification used the manual-code path. No restaurant photos, real accounts, customer data, or operational secrets were used.
