import { query, queryOne } from '../config/database';

/**
 * Ownership record for chat image attachments (#93). Lets the websocket
 * dispatch layer refuse a client that tries to use another user's
 * uploaded storageKey.
 */
export interface AIChatAttachmentRow {
  storage_key: string;
  user_id: string;
  mime_type: string;
  filename: string | null;
  size_bytes: number | null;
  created_at: Date;
}

export class AIChatAttachmentModel {
  /**
   * Record an upload right after FileStorageService.store succeeds. The
   * storageKey is the primary key; concurrent uploads of identical bytes
   * by the same user collapse onto the same content-addressed key and the
   * `ON CONFLICT DO NOTHING` keeps the call idempotent.
   */
  static async record(args: {
    storageKey: string;
    userId: string;
    mimeType: string;
    filename?: string;
    sizeBytes?: number;
  }): Promise<void> {
    await query(
      `
      INSERT INTO ai_chat_attachments (storage_key, user_id, mime_type, filename, size_bytes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (storage_key) DO NOTHING
      `,
      [
        args.storageKey,
        args.userId,
        args.mimeType,
        args.filename ?? null,
        args.sizeBytes ?? null,
      ],
    );
  }

  /**
   * Verify the given storageKey belongs to the requesting user. Returns
   * true when the row exists AND its user_id matches; false in every
   * other case (missing row, wrong owner). Callers should refuse the
   * dispatch when this returns false.
   */
  static async isOwnedBy(storageKey: string, userId: string): Promise<boolean> {
    const row = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM ai_chat_attachments WHERE storage_key = $1`,
      [storageKey],
    );
    return !!row && row.user_id === userId;
  }
}
