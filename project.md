# Photo Sharing Platform — Project Outline

## 1. Title & Context
Full-Stack Internship Challenge (TrizenAI Technologies) — collaborative event photo upload, admin curation, and PIN-protected customer gallery.
Deadline: **Sept 20, 2026, 11:59 PM IST**.

## 2. Goals
- Admin/Lead can create events, add team members, review uploads, and publish a curated gallery.
- Team Members can upload photos only to events they're assigned to.
- Customers can view a published gallery via link + PIN, no account required.
- Meet every security/RBAC scenario, cloud-deploy it, and document it end to end.

## 3. Tech Stack & Rationale
| Layer | Choice | Why |
|---|---|---|
| Backend | Django + Django REST Framework | Batteries-included auth, ORM, admin panel — fastest path to a secure RBAC app solo |
| Database | Supabase Postgres | Managed Postgres, generous free tier, works natively with Django's `psycopg2` backend |
| File storage | Supabase Storage (S3-compatible) | Free object storage, satisfies "no images in DB" requirement without standing up AWS separately |
| Frontend | Django templates + Bootstrap (MVP) → optional React later | Templates ship fastest under deadline pressure; upgrade only if time allows |
| Auth | Django auth + custom `role` field | Avoids building RBAC from scratch |
| Deployment | Render (free web service) | Auto-deploy from GitHub, free HTTPS, no card required |
| CI | GitHub Actions | Free for public/private repos, runs tests on every push |

## 4. Architecture
```
Browser (Admin/Member/Customer)
        │
        ▼
Django app (Render) ── DRF API + server-rendered views
        │
        ├──> Supabase Postgres   (users, events, photo metadata, galleries)
        └──> Supabase Storage    (actual photo files)
```

## 5. API Design (core endpoints)
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/login/` | Public |
| POST | `/api/events/` | Admin |
| POST | `/api/events/<id>/members/` | Admin |
| GET | `/api/events/<id>/photos/` | Admin, or Member scoped to own uploads |
| POST | `/api/events/<id>/photos/` (upload) | Member (assigned only) |
| PATCH | `/api/photos/<id>/select/` | Admin |
| POST | `/api/events/<id>/gallery/publish/` | Admin |
| GET | `/gallery/<slug>/` (PIN form) | Public |
| POST | `/gallery/<slug>/verify-pin/` | Public |

## 6. Data Models
- **User**(id, username, password, role: admin/member)
- **Event**(id, name, created_by, created_at)
- **EventMembership**(event, member, added_at) — unique(event, member)
- **Photo**(id, event, uploaded_by, filename, storage_path, file_size, is_selected, created_at)
- **Gallery**(id, event, slug, pin_hash, is_published, published_at)
- **GalleryPhoto**(gallery, photo)

## 7. Milestones (13-day window)
| Days | Deliverable |
|---|---|
| 1–2 | Models, migrations vs Supabase, auth + roles |
| 3–5 | Event CRUD, membership, photo upload to Supabase Storage |
| 6–8 | Photo review, selection, gallery publish + PIN generation/hashing |
| 9–10 | Public PIN-gated gallery view + all authorization edge cases |
| 11 | Test suite (auth, RBAC, PIN flow, cross-event access) |
| 12 | Deploy to Render, write README, seed demo data |
| 13 | Buffer / bugfix |

## 8. CI/CD
- **CI (GitHub Actions)**: on push/PR — install deps, run `python manage.py test`, lint (`flake8` or `ruff`).
- **CD**: Render auto-deploys `main` on push after CI passes (branch protection rule requiring the check).
- Secrets (`DATABASE_URL`, `SUPABASE_*`, `SECRET_KEY`) live in Render env vars and GitHub Actions secrets — never committed.

# TrizenAI Photo Sharing Platform

## 1. Project Overview

A full-stack photo-sharing platform for photography/event teams.

The platform allows:
- Admin/Lead to create events and manage team members
- Team Members to upload event photographs
- Admin/Lead to review and select photographs
- Admin/Lead to publish a customer-facing gallery
- Customers to access a published gallery using a shareable URL and PIN without creating an account

## 2. Goals

### Primary Goals
- Secure role-based authentication and authorization
- Collaborative event photo uploads
- Reliable photo metadata management
- Private object storage for original photos
- Admin-controlled photo selection
- PIN-protected customer galleries
- Responsive web interface
- Cloud deployment with a live URL
- Automated testing for critical workflows

### Success Criteria
- Complete Admin → Team Member → Gallery → Customer workflow works end-to-end
- Unauthorized users cannot access other events
- Team Members cannot publish galleries or manage other users' photos
- Incorrect gallery PINs are rejected
- Unpublished photos cannot be accessed
- Application is deployed and accessible online
- README, architecture, tests and demo credentials are included

## 3. Technology Stack

### Backend
- Python 3.x
- Django
- Django REST Framework

### Frontend
- Django Templates
- HTML5
- CSS3
- JavaScript
- Bootstrap or Tailwind CSS

### Database
- Supabase PostgreSQL

### Object Storage
- Supabase Storage
- Private photo bucket

### Authentication
- Django session authentication
- Django password hashing

### Testing
- Django Test Framework / pytest
- Playwright for critical end-to-end flows

### Deployment
- Render
- Gunicorn
- WhiteNoise

### Version Control / CI
- Git
- GitHub
- GitHub Actions

## 4. Architecture

Use a modular Django monolith.

Frontend:
Browser
  ↓
Django Templates / JavaScript

Backend:
Django
  ├── Authentication
  ├── Authorization
  ├── Event Management
  ├── Photo Management
  ├── Gallery Management
  └── REST API

Data:
Django
  ├── Supabase PostgreSQL
  └── Supabase Storage

Deployment:
GitHub
  ↓
Render
  ↓
Django application
  ↓
Supabase services

## 5. Application Modules

### accounts
- Registration
- Login
- Logout
- User profile
- Role management

### events
- Event CRUD
- Team-member assignment
- Event authorization

### photos
- Multiple photo upload
- Photo metadata
- Storage integration
- Photo access controls

### galleries
- Photo selection
- Gallery creation
- PIN configuration
- Gallery publication
- Customer gallery access

## 6. User Roles

### Admin / Lead
- Register/Login
- Create events
- Add team members
- View event photos
- Select photos
- Create/publish galleries
- Generate shareable link
- Set gallery PIN

### Team Member
- Login
- View assigned events
- Upload photos
- View own uploaded photos
- Cannot publish galleries
- Cannot manage other users' photos

### Customer
- No account required
- Open gallery link
- Enter PIN
- View published photos

## 7. API Design

Use REST APIs with Django REST Framework.

### Authentication
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/

### Events
GET    /api/events/
POST   /api/events/
GET    /api/events/{id}/
PATCH  /api/events/{id}/
DELETE /api/events/{id}/

### Event Members
GET    /api/events/{id}/members/
POST   /api/events/{id}/members/
DELETE /api/events/{id}/members/{user_id}/

### Photos
GET    /api/events/{id}/photos/
POST   /api/events/{id}/photos/upload/
GET    /api/photos/{id}/
DELETE /api/photos/{id}/

### Galleries
POST /api/events/{id}/gallery/
GET  /api/galleries/{id}/
POST /api/galleries/{id}/select/
POST /api/galleries/{id}/publish/
POST /api/galleries/{id}/verify-pin/

### Customer Gallery
GET  /gallery/{slug}/
POST /gallery/{slug}/verify/

## 8. Data Models

### User
Use Django's built-in User model.

### Profile
- id
- user
- role
- created_at

### Event
- id
- name
- description
- event_date
- location
- created_by
- created_at
- updated_at

### EventMembership
- id
- event
- user
- created_at
- unique(event, user)

### Photo
- id
- event
- uploaded_by
- filename
- storage_path
- file_size
- mime_type
- created_at

Optional:
- width
- height
- thumbnail_path

### Gallery
- id
- event
- slug
- pin_hash
- is_published
- published_at
- created_at
- expires_at

### GalleryPhoto
- id
- gallery
- photo
- created_at
- unique(gallery, photo)

## 9. Storage Design

Photos must not be stored directly in PostgreSQL.

Use a private Supabase Storage bucket:

event-photos/

Recommended object path:

events/{event_id}/{uuid}.jpg

PostgreSQL stores photo metadata and storage path.

## 10. Security

- Django authentication
- Role-based authorization
- Server-side permission checks
- CSRF protection
- Secure cookies
- Environment variables for secrets
- Password hashing
- Private object storage
- Signed URLs for protected photos
- File type validation
- File size validation
- Published-gallery checks
- PIN hashing
- No secrets committed to Git

## 11. Testing

### Unit Tests
- Authentication
- Role validation
- Event permissions
- Photo ownership
- Gallery PIN verification

### Integration Tests
- Event creation
- Team assignment
- Photo upload
- Photo selection
- Gallery publication

### Security Tests
- Team Member cannot publish
- User cannot access another event
- Team Member cannot manage another user's photos
- Incorrect PIN rejected
- Unpublished gallery inaccessible

### E2E Test
Admin
→ Create event
→ Add team member
→ Team uploads photos
→ Admin selects photos
→ Admin publishes gallery
→ Customer enters PIN
→ Customer views gallery

## 12. Milestones

### Phase 1
Project setup and database connection

### Phase 2
Authentication and RBAC

### Phase 3
Event CRUD and team management

### Phase 4
Supabase Storage and photo uploads

### Phase 5
Admin photo review and selection

### Phase 6
Gallery creation, PIN and publishing

### Phase 7
Customer gallery

### Phase 8
Testing, responsive UI and security hardening

### Phase 9
Deployment and documentation

## 13. CI/CD

GitHub repository
  ↓
GitHub Actions
  ↓
Install dependencies
  ↓
Run tests
  ↓
Build/validation
  ↓
Deploy to Render

## 14. Deployment

Host Django application on Render.

Services:
- Render Web Service
- Supabase PostgreSQL
- Supabase Storage

Production configuration:
- DEBUG=False
- SECRET_KEY from environment
- DATABASE_URL from environment
- Supabase credentials from environment
- ALLOWED_HOSTS configured
- CSRF_TRUSTED_ORIGINS configured
- HTTPS enabled

## 15. Documentation

README.md must contain:
- Project overview
- Technology stack
- Architecture
- Database design
- Storage architecture
- Local setup
- Environment variables
- Run commands
- Testing
- Deployment
- Known limitations
- Demo credentials
- Demo gallery credentials

## 16. Final Deliverables

- Source code repository
- Live application URL
- README.md
- Architecture explanation
- Database explanation
- Tests
- Deployment configuration
- Demo Admin credentials
- Demo Team Member credentials
- Demo Gallery URL
- Demo Gallery PIN