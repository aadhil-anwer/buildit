# Sensitive fields

Columns a client must never write, and why. Update this file in the same change that adds or alters a table.
`supabase/tests/database/01_schema_security.test.sql` checks the main ones; a new table starts with no client access at all.

| Table.column | Client can | Why it is protected | Changed by |
| --- | --- | --- | --- |
| `profiles.id`, `created_at` | read | identity and history | trigger on sign-up |
| `profiles.language`, `walkway_pref_cm` | read, update own | the user's own settings, validated by CHECK (en/ar, 75/90) | direct update |
| `rooms.id`, `owner_id` | read | ownership: changing it would hand a room to someone else | `create_room()` |
| `rooms.current_version_id` | read | must always point at a real version of this room | `save_version()`, `restore_version()`, `create_room()` |
| `rooms.created_at`, `updated_at` | read | history | default / trigger |
| `rooms.name` | read, update own | harmless label, length-checked | direct update |
| `room_versions.*` | read own | versions are immutable history; the scene is shape- and size-checked | `create_room()`, `save_version()`, `restore_version()` |
| `scans.*` | read own | rows point at private files; the path must start with the owner's id | a function (Phase 6) |
| `ai_usage_daily.*` | nothing | the daily cap is only trustworthy if clients cannot edit the count | `consume_ai_request()` |
| `app_settings.*` | nothing | holds the cap and reset time zone | SQL by the owner |
| `audit_log.*` | nothing | evidence; only functions append | `delete_account()` and future admin functions |
| `admins.*` | nothing | admin membership is not a client-writable role value | SQL by the owner |
| storage `scans/<user id>/…` | read, write, delete own folder | a home's layout is sensitive; the bucket is private | storage policies |

Prices, roles and statuses do not exist yet. When they arrive they follow the same rule: no client write grant, changed only by a function.
