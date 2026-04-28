import {
  normalizeSnapshot,
  readScopedSnapshot,
  writeScopedSnapshot,
} from "../lib/persistence";
import {
  migrateLocalSnapshotToSupabase,
  restoreSnapshotFromSupabase,
} from "./cloudMigration";
import type { QuantumXDataSnapshot } from "../types";

export interface QuantumXRepository {
  loadSnapshot(fallback: QuantumXDataSnapshot): Promise<QuantumXDataSnapshot>;
  saveSnapshot(snapshot: QuantumXDataSnapshot): Promise<void>;
}

export function createLocalQuantumXRepository(scope: string): QuantumXRepository {
  return {
    async loadSnapshot(fallback) {
      return readScopedSnapshot(scope, fallback);
    },

    async saveSnapshot(snapshot) {
      writeScopedSnapshot(scope, snapshot);
    },
  };
}

export function createSupabaseQuantumXRepository(): QuantumXRepository {
  return {
    async loadSnapshot(fallback) {
      try {
        const result = await restoreSnapshotFromSupabase();
        return normalizeSnapshot(result.snapshot);
      } catch {
        return fallback;
      }
    },

    async saveSnapshot(snapshot) {
      await migrateLocalSnapshotToSupabase(normalizeSnapshot(snapshot));
    },
  };
}

export const supabaseQuantumXRepository = createSupabaseQuantumXRepository();
