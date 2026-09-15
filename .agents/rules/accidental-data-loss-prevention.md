# Accidental Data Loss Prevention Rule (TIER 0 - MANDATORY)

> **CRITICAL MANDATE**: Before running any command, tool, or SQL query that results in irreversible data loss or bulk deletion, you MUST obtain explicit user consent.

---

## 1. High-Risk Operations Needing Confirmation
- **Database & SQL**: `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, or `DELETE FROM` without an explicit parameterized `WHERE` clause.
- **Storage & Cloud Assets**: Deleting production buckets (`gsutil rm -r`, Supabase bucket deletion) or mass wiping media objects.
- **Project Structure**: Mass file deletions or destructive git resets (`git reset --hard`).

---

## 2. Mandatory Application Safeguards
- All server actions performing deletion (`deleteEventAction`, `deletePhotoAction`, `deleteTeamMemberAction`) MUST enforce parameter validation and user permission checks.
- Superusers and Primary Studio Administrators are permanently protected from account deletion.
- All destructive database queries must use bound parameter queries (`WHERE id = $1`).
