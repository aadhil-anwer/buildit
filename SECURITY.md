# Security

How BuildIt protects people's data. The rules live in `CLAUDE.md`; this file says how they are applied.

## Model

- **Three roles.** `anon` (signed out) can do nothing. `authenticated` (Apple, email or anonymous login) can read and rename its own rooms and read its own versions, and call the functions below. The service role exists only on the server and never ships in the app (`apps/mobile/src/lib/env.ts` throws if a secret is found in public env).
- **Deny by default.** New tables start with no client access, RLS enabled and forced. Grants are added per column, each with a reason in `SENSITIVE_FIELDS.md`.
- **State changes only through functions** (`create_room`, `save_version`, `restore_version`, `consume_ai_request`, `delete_account`). Each is `security definer`, pins `search_path = ''`, qualifies every name and type, re-checks ownership inside, is volatile, and answers "not found" rather than "forbidden".
- **Static tests** (`01_schema_security.test.sql`) fail the build if any public table lacks forced RLS, any definer function lacks a pinned search path or is not volatile, `anon` can execute a public function, or a sensitive column becomes client-writable.
- **Tenant isolation** is tested with two users (`02_tenant_isolation.test.sql`): reads, updates, deletes and every function call against someone else's data.
- **AI cost cap** is enforced atomically in the database (`consume_ai_request`), from a server-side setting.
- **Scans** are private (bucket and table), one folder per user; the app uses short-lived signed URLs.
- **Account deletion** removes the login and, by cascade, all of the user's rows; the audit entry holds only the user id.

## Stop and ask first

A new service-role call site, loosening any RLS policy, accepting a price, role, status or owner id from the client, a public storage bucket, or any endpoint that returns data across tenants.

## Known gaps

See `OPEN_ISSUES.md` (storage cleanup on account deletion, anonymous-account abuse, hosted project not yet created).
