# TrizenAI Photo Sharing Platform — Project Specifications & Architecture

## 1. Executive Summary & Context
Full-Stack Internship Challenge for TrizenAI Technologies: A high-performance, collaborative event photo sharing, curation, and delivery web application built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **SQLite / Supabase**.

The platform enables seamless end-to-end workflows:
1. **Admin / Studio Lead**: Creates photoshoot events, assigns team members, sets studio branding, curates/selects proofing photographs, generates client PIN access codes, and publishes customer galleries.
2. **Team Member / Photographer**: Views assigned events, uploads high-res photography or video assets, and monitors upload logs (restricted from editing gallery settings or publishing).
3. **Client / Customer**: Accesses private PIN-protected galleries (`/gallery/[slug]`) via a shareable link and PIN keypad—no registration or account creation required.

---

## 2. Technology Stack & Architecture

| Layer | Technology | Purpose & Rationale |
|---|---|---|
| **Framework** | **Next.js 16.3.4 (App Router)** + **React 19** | Server-Side Rendering (SSR), Server Actions, Turbopack, optimal image optimization, and fast navigation |
| **Language** | **TypeScript 5.x** | End-to-end type safety across database queries, server actions, and React components |
| **Styling & UI** | **Tailwind CSS** + **Lucide Icons** | Responsive UI, custom studio design system, glassmorphism, dynamic gallery layouts, and themes |
| **Database** | **SQLite (`better-sqlite3`)** / **Supabase Postgres** | Lightweight, zero-config local WAL database with automatic schema initialization and Supabase compatibility |
| **File Storage** | **Supabase Storage** + **Local Fallback** | Secure cloud object storage for high-res images with local fallback in `public/media` |
| **Auth & Security** | **HTTP-Only JWT Cookies** + **Server Actions** | Role-Based Access Control (RBAC), bcrypt password hashing, CSRF protection, and PIN verification |
| **State Management** | **React Server & Client Components** | `useMemo`, `useCallback`, dynamic layout state, and hydration warning suppression |

```
Client Browser (Admin / Team Member / Customer)
        │
        ▼
Next.js 16 App Router (Server Actions & Route Handlers)
        │
        ├──> SQLite Database (`db.sqlite3` / Supabase Postgres)
        └──> Supabase Storage Bucket (`event-photos`) / Local Asset Storage
```

---

## 3. Data Models & Schema

- **`auth_user`**: `id`, `username`, `email`, `password`, `first_name`, `last_name`, `is_staff`, `is_superuser`, `is_active`, `date_joined`
- **`accounts_profile`**: `id`, `user_id`, `role` (`ADMIN` | `CO_ADMIN` | `TEAM_MEMBER`), `status` (`ACTIVE` | `SUSPENDED`), `phone_number`, `studio_name`, `studio_logo`, `studio_tagline`, `studio_email`, `studio_website`, `studio_instagram`, `studio_address`, `watermark_text`, `watermark_enabled`, `default_pin_length`, `default_expiration_days`, `client_downloads_enabled`, `dashboard_token`, `is_email_verified`, `created_at`, `updated_at`
- **`events_event`**: `id`, `name`, `slug`, `category`, `client_name`, `client_email`, `client_phone`, `description`, `event_date`, `start_time`, `end_time`, `location`, `venue_address`, `cover_image`, `created_by_id`, `created_at`, `updated_at`
- **`events_eventmembership`**: `id`, `event_id`, `user_id`, `created_at` *(Unique: event_id + user_id)*
- **`photos_photo`**: `id`, `event_id`, `uploaded_by_id`, `filename`, `storage_path`, `file_size`, `mime_type`, `width`, `height`, `uploaded_at`, `created_at`
- **`galleries_gallery`**: `id`, `event_id`, `title`, `slug`, `pin_code`, `is_published`, `views_count`, `expires_at`, `created_at`, `updated_at`

---

## 4. Key Application Modules & Core Features

### A. Admin Dashboard (`/dashboard/admin/[token]`)
- **Metric Bar at a Glance**: Live counters for Total Photos, Client Selected Photos, Active Shoots, and Published Galleries with total client view counts.
- **Apple-Style Interactive Calendar**: Visual shoot schedule display with day highlights and event badges.
- **Limited Grid Widgets**:
  - **Recent Photos**: Displays 5 recent thumbnails + 1 interactive `+N Extra Photos` tile.
  - **Active Shoots**: Displays 2 featured shoot cards + 1 `+N Extra Active Shoots` tile.
- **Dynamic Live Activity Log**: Real-time activity timeline constructed from actual photo uploads, gallery publication states, and shoot schedules.

### B. Global Navigation & Power Search (`/api/events/search`)
- **Keyboard Shortcut (`⌘K` / `Ctrl+K`)**: Instant focus for the global search bar.
- **Multi-Field Matching**: Searches event name, client name, client email, phone, location, category, description, and event slug.
- **Autocomplete Dropdown**: Instant dropdown results with match count badges and quick-create shoot CTA.

### C. Photoshoot Event Management (`/events`)
- **Event Directory**: Multi-status filtering (`ALL`, `UPCOMING`, `STARTED`, `ONGOING`, `COMPLETED`, `CANCELLED`), sorting, and search.
- **Team Roster Assignment**: Assign studio photographers to specific events with real-time membership management.
- **Live Event Status Engine**: Dynamic status state machine computing `LIVE`, `COMPLETED`, `UPCOMING`, or `CANCELLED` based on event dates and times.

### D. Client PIN Gallery Experience (`/gallery/[slug]`)
- **PIN Keypad Authentication**: 4-digit PIN unlock keypad verifying hashed PIN codes without requiring client accounts.
- **5 Dynamic Layout Modes**:
  1. **Dynamic Justified Rows** (natural photo aspect ratio preservation)
  2. **Staggered Masonry Flow**
  3. **Uniform Grid (3-4 Columns)**
  4. **Compact Dense View (6 Columns)**
  5. **Large Story Feed**
- **Full-Screen Lightbox**: High-res zoom, auto-playing slideshow mode, photo note creation, proofing favorites selection, and download tools.
- **Gallery Themes**: Obsidian Dark, Editorial Linen (Default), and Warm Amber styling.

---

## 5. Security & Permission Matrix (RBAC)

| Feature / Action | Studio Admin / Co-Admin | Team Member | Customer / Public |
|---|:---:|:---:|:---:|
| Create / Edit / Delete Events | ✅ | ❌ | ❌ |
| Assign Photographers to Events | ✅ | ❌ | ❌ |
| Upload Photos/Videos to Assigned Shoot | ✅ | ✅ | ❌ |
| Select / Curate Proofing Photos | ✅ | ❌ | ❌ |
| Set Gallery PIN & Publish Gallery | ✅ | ❌ | ❌ |
| Access Public PIN Gallery View | ✅ | ✅ | ✅ *(with PIN)* |
| Manage Studio Settings & Roster | ✅ | ❌ | ❌ |

---

## 6. How to Run Locally

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Run Next.js Development Server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Type Checking & Linting
```bash
npx tsc --noEmit
```

---

## 7. Project File Structure

```
Photo_Sharing_Platform/
├── app/
│   ├── (auth)/                # Login, Register, Password Reset pages
│   ├── actions/               # Next.js Server Actions (auth, events, galleries, photos, team)
│   ├── api/
│   │   ├── events/search/     # Autocomplete Search API endpoint
│   │   └── health/            # Health check endpoint
│   ├── dashboard/             # Admin Overview, Team Management, Studio Settings
│   ├── events/                # Event creation, shoot details, team assignment, photos
│   ├── gallery/               # Public PIN Keypad unlock & Client Gallery view
│   ├── globals.css            # Tailwind & CSS custom design tokens
│   └── layout.tsx             # Root layout with hydration fixes
├── components/                # Reusable UI components (Navbar, Sidebar, Calendar, Badges)
├── lib/
│   ├── auth/                  # JWT session cookies & password hashing
│   ├── db/                    # SQLite database engine (`lib/db/index.ts`) & queries
│   └── utils/                 # Status state machine & utility functions
├── public/                    # Logos, branding assets, and uploaded media fallbacks
├── types/                     # Database TypeScript declarations
├── next.config.mjs            # Next.js configuration
├── tailwind.config.ts         # Tailwind design tokens configuration
└── project.md                 # Project technical outline & architecture
```