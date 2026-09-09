-- ==============================================================================
-- TrizenAI Photo Sharing Platform - Supabase PostgreSQL Schema & Security Script
-- Production-grade schema with Row Level Security (RLS) policies & indexing
-- Project Ref: hyzunkwoskjrxpvtnjnb
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (Extends Auth / Role Management)
CREATE TABLE IF NOT EXISTS public.accounts_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'TEAM_MEMBER', -- 'ADMIN' or 'TEAM_MEMBER'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_profile_role ON public.accounts_profile(role);
CREATE INDEX IF NOT EXISTS idx_accounts_profile_user ON public.accounts_profile(user_id);

-- 3. Events Table
CREATE TABLE IF NOT EXISTS public.events_event (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE,
    location VARCHAR(255),
    created_by_id INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events_event(created_by_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events_event(event_date);

-- 4. Event Memberships Table (Team Assignments)
CREATE TABLE IF NOT EXISTS public.events_eventmembership (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES public.events_event(id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_user UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_membership_event ON public.events_eventmembership(event_id);
CREATE INDEX IF NOT EXISTS idx_membership_user ON public.events_eventmembership(user_id);

-- 5. Photos Table (Private Storage Metadata)
CREATE TABLE IF NOT EXISTS public.photos_photo (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES public.events_event(id) ON DELETE CASCADE,
    uploaded_by_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL UNIQUE,
    file_size INT NOT NULL CHECK (file_size > 0),
    mime_type VARCHAR(100) NOT NULL,
    width INT,
    height INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_event_created ON public.photos_photo(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON public.photos_photo(uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_photos_storage_path ON public.photos_photo(storage_path);

-- 6. Galleries Table (PIN-Protected Client Galleries)
CREATE TABLE IF NOT EXISTS public.galleries_gallery (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL UNIQUE REFERENCES public.events_event(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT '',
    slug VARCHAR(255) NOT NULL UNIQUE,
    pin_hash VARCHAR(255) NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galleries_slug ON public.galleries_gallery(slug);
CREATE INDEX IF NOT EXISTS idx_galleries_published ON public.galleries_gallery(is_published);

-- 7. Gallery Photos Junction Table
CREATE TABLE IF NOT EXISTS public.galleries_galleryphoto (
    id BIGSERIAL PRIMARY KEY,
    gallery_id BIGINT NOT NULL REFERENCES public.galleries_gallery(id) ON DELETE CASCADE,
    photo_id BIGINT NOT NULL REFERENCES public.photos_photo(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_gallery_photo UNIQUE (gallery_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_galleryphoto_gallery ON public.galleries_galleryphoto(gallery_id);
CREATE INDEX IF NOT EXISTS idx_galleryphoto_photo ON public.galleries_galleryphoto(photo_id);

-- ==============================================================================
-- 8. Row Level Security (RLS) Configuration
-- ==============================================================================
ALTER TABLE public.accounts_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_eventmembership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos_photo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries_galleryphoto ENABLE ROW LEVEL SECURITY;

-- 9. Storage Bucket Initialization (Private photo storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trizenai-photo-sharing', 'trizenai-photo-sharing', false)
ON CONFLICT (id) DO UPDATE SET public = false;
