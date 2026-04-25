import {
  CAPTURE_DRAFT_STORAGE_KEY,
  DISTILLS_STORAGE_KEY,
  normalizeDistills,
  normalizeThoughts,
  normalizeTopics,
  readStoredValue,
  THOUGHTS_STORAGE_KEY,
  TOPICS_STORAGE_KEY,
  writeStoredValue,
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

export function createLocalQuantumXRepository(): QuantumXRepository {
  return {
    async loadSnapshot(fallback) {
      return {
        thoughts: normalizeThoughts(
          readStoredValue(THOUGHTS_STORAGE_KEY, fallback.thoughts),
        ),
        topics: normalizeTopics(
          readStoredValue(TOPICS_STORAGE_KEY, fallback.topics),
        ),
        savedDistills: normalizeDistills(
          readStoredValue(DISTILLS_STORAGE_KEY, fallback.savedDistills),
        ),
        captureDraft: readStoredValue(
          CAPTURE_DRAFT_STORAGE_KEY,
          fallback.captureDraft,
        ),
      };
    },

    async saveSnapshot(snapshot) {
      writeStoredValue(THOUGHTS_STORAGE_KEY, snapshot.thoughts);
      writeStoredValue(TOPICS_STORAGE_KEY, snapshot.topics);
      writeStoredValue(DISTILLS_STORAGE_KEY, snapshot.savedDistills);
      writeStoredValue(CAPTURE_DRAFT_STORAGE_KEY, snapshot.captureDraft);
    },

    async saveThoughts(thoughts) {
      writeStoredValue(THOUGHTS_STORAGE_KEY, thoughts);
    },

    async saveTopics(topics) {
      writeStoredValue(TOPICS_STORAGE_KEY, topics);
    },

    async saveDistills(savedDistills) {
      writeStoredValue(DISTILLS_STORAGE_KEY, savedDistills);
    },

    async saveCaptureDraft(captureDraft) {
      writeStoredValue(CAPTURE_DRAFT_STORAGE_KEY, captureDraft);
    },
  };
}

export const localQuantumXRepository = createLocalQuantumXRepository();

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
