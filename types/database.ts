export type Role = "ADMIN" | "CO_ADMIN" | "TEAM_MEMBER";
export type MemberStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE";
export type EventStatus = "UPCOMING" | "STARTED" | "ONGOING" | "COMPLETED" | "QUIT";

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
  date_joined?: string;
  created_at?: string;
}

export interface Profile {
  id: number;
  user_id: number;
  role: Role;
  status: MemberStatus;
  phone_number?: string;
  studio_name?: string;
  studio_logo?: string;
  studio_tagline?: string;
  studio_email?: string;
  studio_website?: string;
  studio_instagram?: string;
  studio_address?: string;
  watermark_text?: string;
  watermark_enabled?: boolean;
  default_pin_length?: number;
  default_expiration_days?: number;
  client_downloads_enabled?: boolean;
  must_change_password?: boolean;
  invitation_token?: string;
  invitation_sent_at?: string;
  dashboard_token?: string;
  last_login_device?: string;
  is_email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: number;
  name: string;
  slug: string;
  category?: string; // Wedding, Corporate, Portrait, etc.
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  description?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  venue_address?: string;
  cover_image?: string;
  status?: EventStatus;
  is_cancelled?: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by_id?: number;
  actual_started_at?: string;
  actual_completed_at?: string;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  
  // Computed / Joined fields
  photos_count?: number;
  members_count?: number;
  gallery_status?: "PUBLISHED" | "DRAFT" | "NONE";
  gallery_id?: number;
  gallery_slug?: string;
  gallery_pin?: string;
}

export interface EventMembership {
  id: number;
  event_id: number;
  user_id: number;
  role?: string;
  created_at?: string;
  
  // Joined fields
  user?: User & { profile?: Profile };
}

export interface Photo {
  id: number;
  event_id: number;
  uploaded_by_id: number;
  filename: string;
  storage_path: string;
  thumbnail_path?: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  uploaded_at: string;
  created_at: string;

  // Joined / signed
  signed_url?: string;
  uploader?: User;
}

export interface Gallery {
  id: number;
  event_id: number;
  title: string;
  slug: string;
  pin_hash: string;
  pin_code?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  
  // Computed / Joined
  event?: Event;
  photos_count?: number;
  views_count?: number;
  cover_image_url?: string;
}

export interface GalleryPhoto {
  id: number;
  gallery_id: number;
  photo_id: number;
  is_favorite?: boolean;
  created_at: string;
}

export interface GalleryView {
  id: number;
  gallery_id: number;
  viewed_at: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
}
