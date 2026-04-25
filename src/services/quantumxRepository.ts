import {
  readScopedSnapshot,
  writeScopedSnapshot,
} from "../lib/persistence";
import {
  migrateLocalSnapshotToSupabase,
  restoreSnapshotFromSupabase,
} from "./cloudMigration";
import type { QuantumXDataSnapshot, SavedDistill, Thought, Topic } from "../types";

export interface QuantumXRepository {
  loadSnapshot(fallback: QuantumXDataSnapshot): Promise<QuantumXDataSnapshot>;
  saveSnapshot(snapshot: QuantumXDataSnapshot): Promise<void>;
  saveThoughts(thoughts: Thought[]): Promise<void>;
  saveTopics(topics: Topic[]): Promise<void>;
  saveDistills(savedDistills: SavedDistill[]): Promise<void>;
  saveCaptureDraft(captureDraft: string): Promise<void>;
}

export function createLocalQuantumXRepository(scope: string): QuantumXRepository {
  return {
    async loadSnapshot(fallback) {
      return readScopedSnapshot(scope, fallback);
    },

    async saveSnapshot(snapshot) {
      writeScopedSnapshot(scope, snapshot);
    },

    async saveThoughts(thoughts) {
      const current = readScopedSnapshot(scope, {
        thoughts: [],
        topics: [],
        savedDistills: [],
        captureDraft: "",
      });
      writeScopedSnapshot(scope, { ...current, thoughts });
    },

    async saveTopics(topics) {
      const current = readScopedSnapshot(scope, {
        thoughts: [],
        topics: [],
        savedDistills: [],
        captureDraft: "",
      });
      writeScopedSnapshot(scope, { ...current, topics });
    },

    async saveDistills(savedDistills) {
      const current = readScopedSnapshot(scope, {
        thoughts: [],
        topics: [],
        savedDistills: [],
        captureDraft: "",
      });
      writeScopedSnapshot(scope, { ...current, savedDistills });
    },

    async saveCaptureDraft(captureDraft) {
      const current = readScopedSnapshot(scope, {
        thoughts: [],
        topics: [],
        savedDistills: [],
        captureDraft: "",
      });
      writeScopedSnapshot(scope, { ...current, captureDraft });
    },
  };
}

export function createSupabaseQuantumXRepository(): QuantumXRepository {
  return {
    async loadSnapshot(fallback) {
      try {
        const result = await restoreSnapshotFromSupabase();
        return result.snapshot;
      } catch {
        return fallback;
      }
    },

    async saveSnapshot(snapshot) {
      await migrateLocalSnapshotToSupabase(snapshot);
    },

    async saveThoughts() {
      throw new Error("Supabase repository requires saveSnapshot().");
    },

    async saveTopics() {
      throw new Error("Supabase repository requires saveSnapshot().");
    },

    async saveDistills() {
      throw new Error("Supabase repository requires saveSnapshot().");
    },

    async saveCaptureDraft() {
      throw new Error("Supabase repository requires saveSnapshot().");
    },
  };
}

export const supabaseQuantumXRepository = createSupabaseQuantumXRepository();
