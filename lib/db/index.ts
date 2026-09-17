import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Check if PostgreSQL or SQLite should be used
const databaseUrl = process.env.DATABASE_URL;
const isPostgres = Boolean(databaseUrl && (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://")));

let pgPool: any = null;
let sqliteDb: any = null;

function initSqlite() {
  if (sqliteDb) return sqliteDb;

  const Database = require("better-sqlite3");
  const dbPath = path.join(process.cwd(), "db.sqlite3");
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");

  // Create tables if they do not exist
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id INTEGER NOT NULL DEFAULT 1,
      email TEXT DEFAULT '',
      email_normalized TEXT UNIQUE DEFAULT '',
      phone TEXT DEFAULT '',
      phone_normalized TEXT DEFAULT '',
      logo TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      email_normalized TEXT NOT NULL,
      phone TEXT DEFAULT '',
      phone_normalized TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'TEAM_MEMBER',
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      invited_by_id INTEGER NOT NULL,
      accepted_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      email_normalized TEXT UNIQUE,
      password TEXT NOT NULL,
      first_name TEXT DEFAULT '',
      last_name TEXT DEFAULT '',
      is_staff INTEGER DEFAULT 0,
      is_superuser INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      date_joined TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      workspace_id INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL DEFAULT 'TEAM_MEMBER',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      phone_number TEXT DEFAULT '',
      phone_normalized TEXT,
      studio_name TEXT DEFAULT 'TrizenAI Studio',
      studio_logo TEXT DEFAULT '',
      studio_tagline TEXT DEFAULT 'Professional Photography & Client Proofing',
      studio_email TEXT DEFAULT '',
      studio_website TEXT DEFAULT '',
      studio_instagram TEXT DEFAULT '',
      studio_address TEXT DEFAULT '',
      watermark_text TEXT DEFAULT 'TrizenAI Photography',
      watermark_enabled INTEGER DEFAULT 1,
      default_pin_length INTEGER DEFAULT 4,
      default_expiration_days INTEGER DEFAULT 60,
      client_downloads_enabled INTEGER DEFAULT 1,
      must_change_password INTEGER DEFAULT 0,
      dashboard_token TEXT DEFAULT '',
      is_email_verified INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events_event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'Wedding',
      client_name TEXT DEFAULT '',
      client_email TEXT DEFAULT '',
      client_phone TEXT DEFAULT '',
      description TEXT DEFAULT '',
      event_date TEXT,
      start_time TEXT DEFAULT '',
      end_time TEXT DEFAULT '',
      location TEXT DEFAULT '',
      venue_address TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      created_by_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events_eventmembership (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS photos_photo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL DEFAULT 1,
      event_id INTEGER NOT NULL,
      uploaded_by_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      uploaded_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS galleries_gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL DEFAULT 1,
      event_id INTEGER UNIQUE NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS galleries_galleryphoto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gallery_id INTEGER NOT NULL,
      photo_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(gallery_id, photo_id)
    );

    CREATE TABLE IF NOT EXISTS galleries_galleryview (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL DEFAULT 1,
      gallery_id INTEGER NOT NULL,
      viewed_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      device_type TEXT
    );
  `);

  // Safe runtime column additions for existing SQLite database
  const safeAddColumn = (table: string, col: string, type: string) => {
    try {
      const cols = sqliteDb.prepare(`PRAGMA table_info(${table})`).all();
      const exists = cols.some((c: any) => c.name === col);
      if (!exists) {
        sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
      }
    } catch {}
  };

  safeAddColumn("auth_user", "email_normalized", "TEXT");
  safeAddColumn("accounts_profile", "workspace_id", "INTEGER DEFAULT 1");
  safeAddColumn("accounts_profile", "phone_normalized", "TEXT");
  safeAddColumn("events_event", "workspace_id", "INTEGER DEFAULT 1");
  safeAddColumn("photos_photo", "workspace_id", "INTEGER DEFAULT 1");
  safeAddColumn("galleries_gallery", "workspace_id", "INTEGER DEFAULT 1");
  safeAddColumn("galleries_galleryview", "workspace_id", "INTEGER DEFAULT 1");
  safeAddColumn("workspaces", "email_normalized", "TEXT");
  safeAddColumn("workspaces", "phone_normalized", "TEXT");

  // Create Default Workspace if not existing
  try {
    const now = new Date().toISOString();
    sqliteDb.exec(`
      INSERT OR IGNORE INTO workspaces (id, name, slug, owner_id, email, email_normalized, phone, phone_normalized, status, created_at, updated_at)
      VALUES (1, 'TrizenAI Photography Workspace', 'trizenai-photography-workspace', 1, 'admin@trizenai.studio', 'admin@trizenai.studio', '+919876543210', '+919876543210', 'ACTIVE', '${now}', '${now}')
    `);
  } catch {}

  safeAddColumn("events_event", "category", "TEXT DEFAULT 'Wedding'");
  safeAddColumn("events_event", "client_name", "TEXT DEFAULT ''");
  safeAddColumn("events_event", "client_email", "TEXT DEFAULT ''");
  safeAddColumn("events_event", "client_phone", "TEXT DEFAULT ''");
  safeAddColumn("events_event", "start_time", "TEXT DEFAULT ''");
  safeAddColumn("events_event", "end_time", "TEXT DEFAULT ''");
  safeAddColumn("events_event", "venue_address", "TEXT DEFAULT ''");

  safeAddColumn("accounts_profile", "phone_number", "TEXT DEFAULT ''");
  safeAddColumn("accounts_profile", "studio_tagline", "TEXT DEFAULT 'Professional Photography & Client Proofing'");
  safeAddColumn("accounts_profile", "studio_email", "TEXT DEFAULT ''");
  safeAddColumn("accounts_profile", "studio_website", "TEXT DEFAULT ''");
  safeAddColumn("accounts_profile", "studio_instagram", "TEXT DEFAULT ''");
  safeAddColumn("accounts_profile", "studio_address", "TEXT DEFAULT ''");
  safeAddColumn("accounts_profile", "watermark_text", "TEXT DEFAULT 'TrizenAI Photography'");
  safeAddColumn("accounts_profile", "watermark_enabled", "INTEGER DEFAULT 1");
  safeAddColumn("accounts_profile", "default_pin_length", "INTEGER DEFAULT 4");
  safeAddColumn("accounts_profile", "default_expiration_days", "INTEGER DEFAULT 60");
  safeAddColumn("accounts_profile", "client_downloads_enabled", "INTEGER DEFAULT 1");
  safeAddColumn("accounts_profile", "must_change_password", "INTEGER DEFAULT 0");

  safeAddColumn("galleries_gallery", "pin_code", "TEXT DEFAULT ''");
  try {
    sqliteDb.exec("UPDATE galleries_gallery SET pin_code = '4497' WHERE pin_code IS NULL OR pin_code = ''");
  } catch {}

  // Ensure default superuser exists
  const existingAdmin = sqliteDb.prepare("SELECT * FROM auth_user WHERE username = ? OR email = ?").get("admin", "admin@trizenai.studio");
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync("AdminPassword2026!", 10);
    const now = new Date().toISOString();
    const token = crypto.randomBytes(16).toString("base64url");

    const info = sqliteDb.prepare(`
      INSERT INTO auth_user (username, email, email_normalized, password, first_name, last_name, is_staff, is_superuser, is_active, date_joined)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, ?)
    `).run("admin", "admin@trizenai.studio", "admin@trizenai.studio", passwordHash, "Super", "Admin", now);

    sqliteDb.prepare(`
      INSERT INTO accounts_profile (user_id, workspace_id, role, status, phone_number, phone_normalized, studio_name, dashboard_token, is_email_verified, created_at, updated_at)
      VALUES (?, 1, 'ADMIN', 'ACTIVE', '+919876543210', '+919876543210', 'TrizenAI Studio', ?, 1, ?, ?)
    `).run(info.lastInsertRowid, token, now, now);
  }

  // Ensure sample team member exists in workspace 1
  const existingTeam = sqliteDb.prepare("SELECT * FROM auth_user WHERE username = ? OR email = ?").get("team_member", "team@trizenai.studio");
  if (!existingTeam) {
    const passwordHash = bcrypt.hashSync("TeamPassword2026!", 10);
    const now = new Date().toISOString();
    const token = crypto.randomBytes(16).toString("base64url");

    const info = sqliteDb.prepare(`
      INSERT INTO auth_user (username, email, email_normalized, password, first_name, last_name, is_staff, is_superuser, is_active, date_joined)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, ?)
    `).run("team_member", "team@trizenai.studio", "team@trizenai.studio", passwordHash, "Alex", "Photographer", now);

    sqliteDb.prepare(`
      INSERT INTO accounts_profile (user_id, workspace_id, role, status, phone_number, phone_normalized, studio_name, dashboard_token, must_change_password, is_email_verified, created_at, updated_at)
      VALUES (?, 1, 'TEAM_MEMBER', 'ACTIVE', '+919876543211', '+919876543211', 'TrizenAI Studio', ?, 0, 1, ?, ?)
    `).run(info.lastInsertRowid, token, now, now);
  }

  return sqliteDb;
}

export function getDbPool() {
  if (isPostgres) {
    if (!pgPool) {
      const { Pool } = require("pg");
      pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl!.includes("supabase.co") || databaseUrl!.includes("pooler.supabase.com")
          ? { rejectUnauthorized: false }
          : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
    return pgPool;
  }
  return initSqlite();
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  if (isPostgres) {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      const res = await client.query(text, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  // SQLite execution
  const db = initSqlite();

  // Normalize PostgreSQL queries & parameters to SQLite:
  // 1. Convert $1, $2, $1... to ?, ?, ? and map params positionally
  const sqliteParams: any[] = [];
  const paramMatches = Array.from(text.matchAll(/\$(\d+)\b/g));

  let sqliteQuery = text;
  if (paramMatches.length > 0) {
    for (const match of paramMatches) {
      const idx = parseInt(match[1], 10) - 1; // 1-indexed to 0-indexed
      let val = idx >= 0 && idx < params.length ? params[idx] : null;
      if (val === undefined) val = null;
      if (typeof val === "boolean") val = val ? 1 : 0;
      sqliteParams.push(val);
    }
    sqliteQuery = text.replace(/\$(\d+)\b/g, "?");
  } else {
    // If no $1 placeholders were in text, use passed params as is
    params.forEach((p) => {
      let val = p === undefined ? null : p;
      if (typeof val === "boolean") val = val ? 1 : 0;
      sqliteParams.push(val);
    });
  }
  
  // 2. Convert NOW() to datetime('now')
  sqliteQuery = sqliteQuery.replace(/\bNOW\(\)/gi, "datetime('now')");

  // 3. Convert ::int or ::text casts
  sqliteQuery = sqliteQuery.replace(/::int\b/gi, "").replace(/::text\b/gi, "");

  // 4. Convert TO_CHAR(event_date, 'YYYY-MM-DD') to strftime('%Y-%m-%d', event_date)
  sqliteQuery = sqliteQuery.replace(/TO_CHAR\(([^,]+),\s*'YYYY-MM-DD'\)/gi, "strftime('%Y-%m-%d', $1)");

  try {
    const trimmed = sqliteQuery.trim();
    const isInsert = trimmed.toUpperCase().startsWith("INSERT");
    const isUpdate = trimmed.toUpperCase().startsWith("UPDATE");
    const isDelete = trimmed.toUpperCase().startsWith("DELETE");

    // Handle RETURNING clause in SQLite
    const returningMatch = trimmed.match(/\s+RETURNING\s+(.+)$/i);
    let finalQuery = sqliteQuery;
    if (returningMatch) {
      finalQuery = sqliteQuery.slice(0, returningMatch.index);
    }

    if (isInsert) {
      const stmt = db.prepare(finalQuery);
      const info = stmt.run(...sqliteParams);
      if (returningMatch) {
        const tableMatch = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
        if (tableMatch) {
          const table = tableMatch[1];
          const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
          return row ? [row as T] : [];
        }
      }
      return [{ id: info.lastInsertRowid } as unknown as T];
    }

    if (isUpdate || isDelete) {
      const stmt = db.prepare(finalQuery);
      stmt.run(...sqliteParams);
      if (returningMatch && isUpdate) {
        const lastParam = sqliteParams[sqliteParams.length - 1];
        const tableMatch = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
        if (tableMatch && lastParam !== undefined) {
          const table = tableMatch[1];
          const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(lastParam);
          return row ? [row as T] : [];
        }
      }
      return [];
    }

    // SELECT query
    const stmt = db.prepare(sqliteQuery);
    const rows = stmt.all(...sqliteParams);
    return rows as T[];
  } catch (err: any) {
    console.error("DB Query Failed:", err.message);
    console.error("Original SQL:", text);
    console.error("SQLite SQL:", sqliteQuery);
    console.error("Params:", params);
    throw err;
  }
}

export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
