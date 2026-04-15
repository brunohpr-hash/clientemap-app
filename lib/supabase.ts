import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? "clientemap-attachments";

// --- Supabase client (lazy, only when env vars are present) ---

let _client: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return null;

  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  return _client;
}

// --- Local disk storage fallback (dev without Supabase) ---

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureUploadDir(subPath: string): Promise<void> {
  const dir = path.join(LOCAL_UPLOAD_DIR, subPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function uploadLocal(
  particularidadeId: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const subPath = `particularidades/${particularidadeId}`;
  await ensureUploadDir(subPath);
  const filePath = path.join(LOCAL_UPLOAD_DIR, subPath, filename);
  await writeFile(filePath, buffer);
  // Return a public URL for local dev
  return `/uploads/particularidades/${particularidadeId}/${filename}`;
}

// --- Public API ---

export async function uploadAttachment(
  particularidadeId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const client = getSupabaseAdmin();

  if (client) {
    // Supabase Storage
    const storagePath = `particularidades/${particularidadeId}/${filename}`;
    const { error } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  // Local disk fallback
  return uploadLocal(particularidadeId, filename, buffer);
}

export async function deleteAttachment(fileUrl: string): Promise<void> {
  const client = getSupabaseAdmin();

  if (client) {
    const url = new URL(fileUrl);
    const parts = url.pathname.split(`/${STORAGE_BUCKET}/`);
    if (parts.length >= 2) {
      await client.storage.from(STORAGE_BUCKET).remove([parts[1]]);
    }
    return;
  }

  // Local disk: extract the path from /uploads/... URL
  if (fileUrl.startsWith("/uploads/")) {
    const { unlink } = await import("fs/promises");
    const filePath = path.join(process.cwd(), "public", fileUrl);
    try { await unlink(filePath); } catch { /* file might not exist */ }
  }
}
