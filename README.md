# TrizenAI Photo Sharing & Client Proofing Platform

A full-stack, enterprise-grade Next.js 15 photo sharing and client proofing platform designed for photography studios and event teams. Enforces **strict multi-tenant workspace isolation**, server-side authorization guards, role-based access control (RBAC), and PIN-protected client proofing galleries.

---

## Architecture Overview

```text
                      Browser (Customer / Team / Admin)
                                      │
                                      ▼
                      Next.js 15 App Router (TypeScript / React)
                                      │
                                      ▼
                      Server Actions & Auth Guards
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      Workspace Isolation       Event & Gallery        Photo Processing
       & Identity Engine          RBAC Engine             & Curation
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                           ┌──────────┴──────────┐
                           ▼                     ▼
                  SQLite / Supabase PG   Supabase Storage
                  (Multi-Tenant Data,    (Private 'event-photos'
                   PIN hashes, RBAC)      bucket, Signed URLs)
```

---

## Architectural & Security Foundation

1. **Multi-Tenant Workspace Isolation Engine**:
   - Each photography studio operates inside a completely isolated `Workspace` entity.
   - Global identity uniqueness constraint: Email addresses and phone numbers belong to **exactly ONE workspace**.
   - Server-side authorization guards (`requireWorkspaceSession`, `assertWorkspaceAccess`, `requireWorkspaceRole`, `requireEventAccess`, `requireGalleryAccess`) derive workspace state exclusively from HTTP session JWT tokens, preventing IDOR or parameter tampering.

2. **Database Engine**:
   - Production / Local SQLite (via `better-sqlite3` WAL mode) & Supabase PostgreSQL support.
   - Foreign key integrity, indexed lookups, and transactional user/workspace provisioning.

3. **Private Cloud Storage & Signed URLs**:
   - Image files are uploaded directly to Supabase Storage (`trizenai-photo-sharing` / `event-photos`).
   - Photos are served via time-limited signed URLs generated on-demand.

4. **PIN-Protected Client Proofing**:
   - Galleries require a 4-6 digit security PIN.
   - PINs are hashed using cryptographic SHA-256 (`hashPin`). No plaintext PINs are ever stored.

---

## User Roles & Workspace Matrix

| Capability | Studio Admin | Co-Admin | Team Member | Client / Guest |
|---|:---:|:---:|:---:|:---:|
| Register New Workspace | ✅ | ❌ | ❌ | ❌ |
| Manage Workspace Settings & Logo | ✅ | ✅ | ❌ | ❌ |
| Invite & Manage Team Members | ✅ | ✅ | ❌ | ❌ |
| Create / Edit Photoshoot Events | ✅ | ✅ | ❌ | ❌ |
| View Assigned Photoshoot Events | ✅ | ✅ | ✅ (Assigned only) | ❌ |
| Upload Photos to Events | ✅ | ✅ | ✅ (Assigned only) | ❌ |
| Create & Publish PIN Galleries | ✅ | ✅ | ❌ | ❌ |
| Access Published Client Gallery | ✅ | ✅ | ✅ | ✅ (PIN required) |

---

## Demo Credentials (Same Workspace: `TrizenAI Studio`)

Both demo accounts belong to the **same default workspace** (`TrizenAI Studio`, Workspace ID: 1) for full multi-role testing.

### 🔑 Studio Admin (Admin Role)
- **Email / Identifier**: `admin@trizenai.studio`
- **Password**: `AdminPassword2026!`
- **Role**: `ADMIN`
- **Dashboard**: `/dashboard/admin`

### 📷 Team Member (Photographer Role)
- **Email / Identifier**: `team@trizenai.studio`
- **Password**: `TeamPassword2026!`
- **Role**: `TEAM_MEMBER`
- **Dashboard**: `/dashboard/team`

> *Tip: The `/login` page includes interactive **Quick Demo Credentials** buttons to pre-fill these credentials instantly.*

---

## Technical Stack

- **Framework**: Next.js 15 (App Router, Server Actions, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide Icons
- **Database**: SQLite (`better-sqlite3` with WAL mode) & Supabase PostgreSQL
- **Cloud Storage**: Supabase Storage
- **Authentication**: JWT Cookie Sessions (`jose`) & Bcrypt / PBKDF2 Password Hashing
- **Test Runner**: Custom automated test suite via `npx tsx`

---

## Local Development & Setup

### Prerequisites
- Node.js 18.x or 20.x or newer
- npm / npx

### 1. Clone & Install
```bash
git clone https://github.com/karthi11040/trizenai-photo-sharing.git
cd Photo_Sharing_Platform
npm install
```

### 2. Environment Setup
Verify `.env` configuration:
```ini
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_STORAGE_BUCKET=trizenai-photo-sharing
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Automated Test Execution

Run the complete **15-scenario multi-tenant workspace isolation test suite**:

```bash
npx tsx tests/workspace-isolation.test.ts
```

### Verified Test Coverage:
1. `Identity Normalization` (Email trim & lowercase, E.164 phone formatting)
2. `Workspace Creation` (Isolated Workspace IDs per Admin)
3. `Global Email Uniqueness` (Admin registration duplicate check)
4. `Same Workspace Duplicate Email` (Team invite duplicate check)
5. `Cross-Workspace Duplicate Email` (Block reusing email in another studio)
6. `Same Workspace Duplicate Phone` (Team invite phone check)
7. `Cross-Workspace Duplicate Phone` (Block reusing phone in another studio)
8. `Workspace Scoped User Listing` (Strict team isolation)
9. `Workspace Scoped Event Listing` (Strict event isolation)
10. `Cross-Workspace Event Member Assignment Block` (Prevent assigning team members of studio A to studio B)
11. `Cross-Workspace Event Access Guard` (IDOR protection)
12. `Cross-Workspace Gallery Access Guard` (IDOR protection)
13. `Workspace Scoped Photo Querying` (Private upload scoping)
14. `Workspace Isolation in Event Search` (Query isolation)
15. `Workspace Isolation in Team Member Updates` (Profile update protection)

---

## Source Code & Deployment Information

- **GitHub Source Code Repository**: [https://github.com/karthi11040/trizenai-photo-sharing](https://github.com/karthi11040/trizenai-photo-sharing)
- **Primary Branch**: `master` (and synchronized `main`)
- **Live Local Server**: `http://localhost:3000` (via `npm run dev`)
