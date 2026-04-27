import { Pool } from "pg";
import type { BlogRecord, BlogStatus, IndexStatus } from "./types.js";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function mapBlog(row: Record<string, unknown>): BlogRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    title: String(row.title),
    content_html: String(row.content_html),
    content_text: String(row.content_text),
    status: row.status as BlogStatus,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    index_status: row.index_status as IndexStatus,
    index_error: row.index_error ? String(row.index_error) : null,
    indexed_at: row.indexed_at ? new Date(String(row.indexed_at)).toISOString() : null,
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content_html TEXT NOT NULL DEFAULT '',
      content_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      tags TEXT[] NOT NULL DEFAULT '{}',
      index_status TEXT NOT NULL DEFAULT 'idle' CHECK (index_status IN ('idle', 'pending', 'processing', 'ready', 'failed')),
      index_error TEXT,
      indexed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS blogs_status_idx ON blogs (status);
  `);
}

export async function listBlogs(): Promise<BlogRecord[]> {
  const result = await pool.query("SELECT * FROM blogs ORDER BY updated_at DESC");
  return result.rows.map(mapBlog);
}

export async function getBlogById(id: string): Promise<BlogRecord | null> {
  const result = await pool.query("SELECT * FROM blogs WHERE id = $1", [id]);
  return result.rows[0] ? mapBlog(result.rows[0]) : null;
}

export async function getBlogByName(name: string): Promise<BlogRecord | null> {
  const result = await pool.query("SELECT * FROM blogs WHERE name = $1", [name]);
  return result.rows[0] ? mapBlog(result.rows[0]) : null;
}

export async function insertBlog(input: {
  id: string;
  name: string;
  title: string;
  contentHtml: string;
  contentText: string;
  status: BlogStatus;
  tags: string[];
  indexStatus: IndexStatus;
}) {
  const result = await pool.query(
    `
      INSERT INTO blogs (
        id, name, title, content_html, content_text, status, tags, index_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      input.id,
      input.name,
      input.title,
      input.contentHtml,
      input.contentText,
      input.status,
      input.tags,
      input.indexStatus,
    ],
  );

  return mapBlog(result.rows[0]);
}

export async function updateBlog(
  id: string,
  input: {
    name: string;
    title: string;
    contentHtml: string;
    contentText: string;
    status: BlogStatus;
    tags: string[];
    indexStatus: IndexStatus;
    indexError: string | null;
  },
) {
  const result = await pool.query(
    `
      UPDATE blogs
      SET
        name = $2,
        title = $3,
        content_html = $4,
        content_text = $5,
        status = $6,
        tags = $7,
        index_status = $8,
        index_error = $9,
        indexed_at = CASE WHEN $8 = 'ready' THEN NOW() ELSE indexed_at END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      input.name,
      input.title,
      input.contentHtml,
      input.contentText,
      input.status,
      input.tags,
      input.indexStatus,
      input.indexError,
    ],
  );

  return result.rows[0] ? mapBlog(result.rows[0]) : null;
}

export async function markIndexState(
  id: string,
  state: { status: IndexStatus; error?: string | null; indexed?: boolean },
) {
  const result = await pool.query(
    `
      UPDATE blogs
      SET
        index_status = $2,
        index_error = $3,
        indexed_at = CASE WHEN $4 THEN NOW() ELSE indexed_at END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, state.status, state.error ?? null, state.indexed ?? false],
  );

  return result.rows[0] ? mapBlog(result.rows[0]) : null;
}

export async function deleteBlog(id: string) {
  const result = await pool.query("DELETE FROM blogs WHERE id = $1 RETURNING *", [id]);
  return result.rows[0] ? mapBlog(result.rows[0]) : null;
}

export async function findPublishedBlogsNeedingIndex() {
  const result = await pool.query(
    `
      SELECT * FROM blogs
      WHERE status = 'published'
      AND index_status IN ('pending', 'processing')
      ORDER BY updated_at ASC
    `,
  );
  return result.rows.map(mapBlog);
}

