import { query } from '../config/database';
import { logger } from '../utils/logger';
import { FileStorageService } from './file-storage.service';
import type { FileStorageProvider, StorageObjectMetadata } from './file-storage/types';

const DEFAULT_MIN_AGE_HOURS = 24;
const SAMPLE_LIMIT = 20;

export interface OrphanStorageCleanupOptions {
  execute?: boolean;
  minAgeHours?: number;
  prefix?: string;
  maxDelete?: number;
}

export interface OrphanStorageCleanupResult {
  execute: boolean;
  storageProvider: FileStorageProvider;
  prefix: string;
  minAgeHours: number;
  scanned: number;
  referenced: number;
  orphanCandidates: number;
  skippedYoung: number;
  deleted: number;
  failed: number;
  bytesEligible: number;
  bytesDeleted: number;
  sampleCandidates: string[];
  failures: Array<{ storageKey: string; message: string }>;
}

export class OrphanStorageCleanupService {
  static async run(options: OrphanStorageCleanupOptions = {}): Promise<OrphanStorageCleanupResult> {
    const execute = options.execute === true;
    const minAgeHours = options.minAgeHours ?? DEFAULT_MIN_AGE_HOURS;
    const prefix = options.prefix ?? FileStorageService.defaultStorageKeyPrefix();
    const storageProvider = FileStorageService.activeStorageProvider();
    const referencedKeys = await this.loadReferencedStorageKeys(storageProvider);
    const now = Date.now();
    const minimumAgeMs = minAgeHours * 60 * 60 * 1000;

    const result: OrphanStorageCleanupResult = {
      execute,
      storageProvider,
      prefix,
      minAgeHours,
      scanned: 0,
      referenced: referencedKeys.size,
      orphanCandidates: 0,
      skippedYoung: 0,
      deleted: 0,
      failed: 0,
      bytesEligible: 0,
      bytesDeleted: 0,
      sampleCandidates: [],
      failures: [],
    };

    for await (const object of FileStorageService.listObjects({ prefix })) {
      result.scanned += 1;

      if (referencedKeys.has(object.storageKey)) {
        continue;
      }

      if (!this.isOldEnough(object, now, minimumAgeMs)) {
        result.skippedYoung += 1;
        continue;
      }

      result.orphanCandidates += 1;
      result.bytesEligible += object.size ?? 0;
      if (result.sampleCandidates.length < SAMPLE_LIMIT) {
        result.sampleCandidates.push(object.storageKey);
      }

      if (!execute) {
        continue;
      }

      if (options.maxDelete !== undefined && result.deleted >= options.maxDelete) {
        continue;
      }

      try {
        await FileStorageService.delete(object);
        result.deleted += 1;
        result.bytesDeleted += object.size ?? 0;
      } catch (error) {
        result.failed += 1;
        result.failures.push({
          storageKey: object.storageKey,
          message: error instanceof Error ? error.message : String(error),
        });
        logger.error('Failed to delete orphan storage object', {
          error,
          storageProvider,
          storageBucket: object.storageBucket,
          storageKey: object.storageKey,
        });
      }
    }

    return result;
  }

  private static async loadReferencedStorageKeys(storageProvider: FileStorageProvider): Promise<Set<string>> {
    const rows = await query<{ storage_key: string }>(
      `
        SELECT storage_key
        FROM files
        WHERE storage_provider = $1
          AND storage_key IS NOT NULL
        UNION
        SELECT storage_key
        FROM ai_chat_attachments
        WHERE COALESCE(storage_provider, 'local') = $1
          AND storage_key IS NOT NULL
      `,
      [storageProvider]
    );

    return new Set(rows.map((row) => row.storage_key));
  }

  private static isOldEnough(
    object: StorageObjectMetadata,
    now: number,
    minimumAgeMs: number
  ): boolean {
    if (minimumAgeMs <= 0) {
      return true;
    }

    if (!object.updatedAt) {
      return false;
    }

    return now - object.updatedAt.getTime() >= minimumAgeMs;
  }
}
